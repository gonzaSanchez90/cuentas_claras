import { Expense, User } from '../types';

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

// Tu hoja específica (CONSTANTE)
const SPREADSHEET_ID = '1S2tToFBxGP88oTBIkEk0EzpuBNj-06sjJAD3SGMhkbg';
const SHEET_GID = 486879466;

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Obtener Client ID almacenado
const getClientId = () => {
    return localStorage.getItem('google_client_id');
};

// Inicializar GAPI
export const initGoogleClient = async (): Promise<void> => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.gapi) return;

        window.gapi.load('client', async () => {
            await window.gapi.client.init({
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            });
            gapiInited = true;
            resolve();
        });
    });
};

// Inicializar GIS
export const initGis = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.google) return;

        const currentClientId = getClientId();
        if (!currentClientId) {
            resolve();
            return;
        }

        try {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: currentClientId,
                scope: SCOPES,
                callback: (resp: any) => { },
            });
            gisInited = true;
            resolve();
        } catch (e) {
            console.error("Error init GIS", e);
            resolve();
        }
    });
};

// Autenticar
const getToken = async (): Promise<void> => {
    // Asegurarnos que tenemos cliente
    if (!tokenClient && getClientId()) {
        await initGis();
    }

    if (!tokenClient) {
        throw new Error("Falta el Client ID. Ve a Ajustes (arriba derecha) -> Google Config.");
    }

    return new Promise((resolve, reject) => {
        tokenClient.callback = async (resp: any) => {
            if (resp.error !== undefined) {
                reject(resp);
            }
            resolve();
        };

        if (window.gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
};

const getSheetNameByGid = async (gid: number): Promise<string> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });
        const sheet = response.result.sheets?.find((s: any) => s.properties.sheetId === gid);
        if (!sheet) throw new Error(`Pestaña GID ${gid} no encontrada`);
        return sheet.properties.title;
    } catch (e: any) {
        console.error("Error getting sheet name", e);
        if (e.status === 403) throw new Error("Acceso denegado a la hoja. Verifica que tu usuario tenga permisos de edición.");
        if (e.status === 404) throw new Error("Hoja no encontrada. Verifica el ID.");
        throw e;
    }
};

export const syncExpensesToSheet = async (expenses: Expense[], monthName: string): Promise<string> => {
    if (!gapiInited) await initGoogleClient();

    try {
        await getToken();

        const sheetName = await getSheetNameByGid(SHEET_GID);
        const range = `'${sheetName}'!A:F`;

        // Formato [Fecha, Concepto, Categoría, Pagador, Monto, Mes]
        const values = expenses.map(e => [
            e.date,
            e.title,
            e.category,
            e.payer === User.Me ? 'Yo' : 'Pareja',
            e.amount,
            monthName
        ]);

        if (values.length === 0) return "No hay gastos para sincronizar.";

        const response = await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: values },
        });

        return `¡Hecho! Se guardaron ${response.result.updates?.updatedRows} gastos en Excel.`;

    } catch (error: any) {
        console.error('Error syncing to Sheets:', error);

        if (error.message && error.message.includes("Falta el Client ID")) {
            throw error;
        }

        // Errores comunes de Google
        if (error.result?.error?.message) {
            const gMsg = error.result.error.message;
            if (gMsg.includes("origin_mismatch")) return "Error: La URL de la app no está autorizada en Google Cloud console.";
            if (gMsg.includes("popup_closed_by_user")) return "Cancelaste el inicio de sesión.";
            throw new Error(`Google Error: ${gMsg}`);
        }

        throw new Error(error.message || 'Error de conexión desconocido.');
    }
};