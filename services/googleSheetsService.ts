import { Expense, User, Category } from '../types';

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

// Configuración de la hoja
const getSpreadsheetConfig = () => {
    return {
        id: localStorage.getItem('google_spreadsheet_id') || '1S2tToFBxGP88oTBIkEk0EzpuBNj-06sjJAD3SGMhkbg',
        gid: parseInt(localStorage.getItem('google_sheet_gid') || '486879466')
    };
};

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
    const { id: spreadsheetId } = getSpreadsheetConfig();
    try {
        const response = await window.gapi.client.sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
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

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const CATEGORY_TO_COL = {
    [Category.Rent]: 'B',
    [Category.Electricity]: 'C',
    [Category.Water]: 'D',
    [Category.Internet]: 'E',
    [Category.Phone]: 'E',
    [Category.Transport]: 'F',
    [Category.SocialSecurity]: 'G',
    [Category.Supermarket]: 'H',
    [Category.HouseExpenses]: 'I',
    [Category.Outings]: 'J',
    [Category.Pharmacy]: 'K',
    [Category.Misc]: 'L',
    [Category.Subscriptions]: 'M'
};

export const syncExpensesToSheet = async (expenses: Expense[], monthName: string): Promise<string> => {
    if (!gapiInited) await initGoogleClient();

    try {
        await getToken();

        const { id: spreadsheetId, gid: sheetGid } = getSpreadsheetConfig();
        const sheetName = await getSheetNameByGid(sheetGid);

        // 1. Identificar el mes y calcular fila base
        const monthClean = monthName.toLowerCase().split(' ')[0];
        const monthIdx = MONTHS_ES.indexOf(monthClean);
        if (monthIdx === -1) throw new Error("No se pudo identificar el mes para el resumen.");

        const startRow = 19 + (monthIdx * 2); // Row 19 is Enero Gonzalo

        // 2. Agrupar totales por Payer y Categoría
        const totals: Record<string, Record<string, number>> = {
            [User.Me]: {},
            [User.Partner]: {}
        };

        // Inicializar todas las categorías en 0 para limpiar si es necesario
        Object.values(Category).forEach(cat => {
            totals[User.Me][cat] = 0;
            totals[User.Partner][cat] = 0;
        });

        expenses.forEach(e => {
            if (totals[e.payer] && totals[e.payer][e.category] !== undefined) {
                totals[e.payer][e.category] += e.amount;
            }
        });

        // 3. Preparar Batch Update para ambas filas (Me y Partner)
        const updateRow = async (user: User, rowNum: number) => {
            // Construimos un array con los valores ordenados de la B a la M
            // B=Alquiler, C=Luz, D=Agua, E=Internet, F=Transp, G=ObraSoc, H=Super, I=Casa, J=Salidas, K=Farma, L=Varios, M=Suscrip
            const rowValues = [
                totals[user][Category.Rent],
                totals[user][Category.Electricity],
                totals[user][Category.Water],
                totals[user][Category.Internet] + totals[user][Category.Phone],
                totals[user][Category.Transport],
                totals[user][Category.SocialSecurity],
                totals[user][Category.Supermarket],
                totals[user][Category.HouseExpenses],
                totals[user][Category.Outings],
                totals[user][Category.Pharmacy],
                totals[user][Category.Misc],
                totals[user][Category.Subscriptions]
            ];

            const range = `'${sheetName}'!B${rowNum}:M${rowNum}`;
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [rowValues] },
            });
        };

        await updateRow(User.Me, startRow);
        await updateRow(User.Partner, startRow + 1);

        return `¡Sincronización Exitosa! Se actualizaron los totales de ${monthName} en tu tabla de resumen.`;

    } catch (error: any) {
        console.error('Error syncing to Sheets:', error);
        // ... mismo manejo de errores ...
        if (error.message && error.message.includes("Falta el Client ID")) throw error;
        if (error.result?.error?.message) {
            const gMsg = error.result.error.message;
            if (gMsg.includes("origin_mismatch")) return "Error: La URL de la app no está autorizada en Google Cloud console.";
            if (gMsg.includes("popup_closed_by_user")) return "Cancelaste el inicio de sesión.";
            throw new Error(`Google Error: ${gMsg}`);
        }
        throw new Error(error.message || 'Error de conexión desconocido.');
    }
};