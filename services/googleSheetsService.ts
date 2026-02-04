import { Expense, User, Category } from '../types';

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

// Configuración de la hoja
const LOG_SHEET_NAME = "Registro_Gastos";

const getSpreadsheetConfig = () => {
    return {
        id: localStorage.getItem('google_spreadsheet_id') || '1S2tToFBxGP88oTBIkEk0EzpuBNj-06sjJAD3SGMhkbg',
        gid: parseInt(localStorage.getItem('google_sheet_gid') || '486879466')
    };
};

const ensureLogSheetExists = async (spreadsheetId: string) => {
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
    });

    const logSheet = spreadsheet.result.sheets.find((s: any) => s.properties.title === LOG_SHEET_NAME);

    if (!logSheet) {
        await window.gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: {
                requests: [{
                    addSheet: {
                        properties: { title: LOG_SHEET_NAME }
                    }
                }]
            }
        });

        // Add headers
        await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `${LOG_SHEET_NAME}!A1:G1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [['ID', 'Fecha', 'Título', 'Categoría', 'Pagador', 'Monto', 'Mes']]
            }
        });
    }
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

        // 4. Guardar copia de seguridad en el LOG
        await ensureLogSheetExists(spreadsheetId);

        // Primero borramos lo que haya de este mes para no duplicar
        // Para simplificar, vamos a añadir los gastos nuevos al final del log
        // En una app pro usaríamos IDs únicos para borrar y re-escribir, pero para este caso
        // vamos a guardar todo el estado actual como un "snapshot" para simplificar la recuperación.
        const logValues = expenses.map(e => [
            e.id, e.date, e.title, e.category, e.payer, e.amount, monthName
        ]);

        if (logValues.length > 0) {
            await window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: spreadsheetId,
                range: `${LOG_SHEET_NAME}!A:G`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: logValues }
            });
        }

        return `¡Sincronización Exitosa! Se actualizaron los totales de ${monthName} y se guardó una copia de respaldo en "${LOG_SHEET_NAME}".`;

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

export const fetchExpensesFromLog = async (): Promise<Expense[]> => {
    if (!gapiInited) await initGoogleClient();
    try {
        await getToken();
        const { id: spreadsheetId } = getSpreadsheetConfig();
        await ensureLogSheetExists(spreadsheetId);

        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${LOG_SHEET_NAME}!A2:G`,
        });

        const rows = response.result.values;
        if (!rows) return [];

        // Mapear filas a objetos Expense (evitando duplicados por ID si el log creció mucho)
        const expenseMap = new Map<string, Expense>();
        rows.forEach((row: any) => {
            const [id, date, title, category, payer, amount, monthName] = row;
            expenseMap.set(id, {
                id, date, title,
                category: category as Category,
                payer: payer as User,
                amount: parseFloat(amount),
                monthId: "" // El monthId local se regenerará o asociará por nombre
            });
        });

        return Array.from(expenseMap.values());
    } catch (error) {
        console.error("Error fetching from log:", error);
        return [];
    }
};

export const importFromSummary = async (monthName: string): Promise<Expense[]> => {
    if (!gapiInited) await initGoogleClient();
    try {
        await getToken();
        const { id: spreadsheetId, gid: sheetGid } = getSpreadsheetConfig();
        const sheetName = await getSheetNameByGid(sheetGid);

        const monthClean = monthName.toLowerCase().split(' ')[0];
        const monthIdx = MONTHS_ES.indexOf(monthClean);
        if (monthIdx === -1) return [];

        const startRow = 19 + (monthIdx * 2);
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `'${sheetName}'!B${startRow}:M${startRow + 1}`,
        });

        const rows = response.result.values;
        if (!rows || rows.length < 2) return [];

        const categories = [
            Category.Rent, Category.Electricity, Category.Water, Category.Internet,
            Category.Transport, Category.SocialSecurity, Category.Supermarket,
            Category.HouseExpenses, Category.Outings, Category.Pharmacy,
            Category.Misc, Category.Subscriptions
        ];

        const importedExpenses: Expense[] = [];

        const processRow = (row: any[], user: User) => {
            row.forEach((val, idx) => {
                const amount = parseFloat(val.toString().replace('€', '').replace(',', '.').trim());
                if (!isNaN(amount) && amount > 0) {
                    importedExpenses.push({
                        id: `import-${user}-${monthClean}-${idx}`,
                        title: `Importado: ${categories[idx]}`,
                        amount: amount,
                        payer: user,
                        date: new Date().toISOString().split('T')[0],
                        category: categories[idx],
                        monthId: "" // Se asignará en el componente
                    });
                }
            });
        };

        processRow(rows[0], User.Me);
        processRow(rows[1], User.Partner);

        return importedExpenses;
    } catch (error) {
        console.error("Error importing from summary:", error);
        return [];
    }
};