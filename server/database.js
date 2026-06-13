import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'cuentas_claras.db');
const legacyDbPath = path.join(__dirname, 'cuentas_claras.db');

let sqlJsDb = null;
let tursoClient = null;

// Usamos Turso si está configurada la URL en las variables de entorno
const useTurso = !!process.env.TURSO_DATABASE_URL;

export async function initDatabase() {
  if (useTurso) {
    console.log('🔌 Conectando a la base de datos remota de Turso (libSQL)...');
    const { createClient } = await import('@libsql/client');
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    });

    // Crear tablas en la nube si no existen
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS months (
        id TEXT PRIMARY KEY,
        creator_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT DEFAULT '📅',
        is_closed INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    try {
      await tursoClient.execute("ALTER TABLE months ADD COLUMN emoji TEXT DEFAULT '📅'");
    } catch (e) {
      // Ignorar si la columna ya existe
    }

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        month_id TEXT NOT NULL,
        user_id INTEGER, 
        name TEXT NOT NULL,
        split_percentage REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        month_id TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        payer_participant_id TEXT NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (payer_participant_id) REFERENCES participants(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Base de datos remota de Turso inicializada correctamente');
    return tursoClient;
  } else {
    console.log('💾 Utilizando base de datos local SQLite (sql.js)...');
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // MIGRATION: If old DB exists and new one doesn't, MOVE it.
    if (fs.existsSync(legacyDbPath) && !fs.existsSync(dbPath)) {
      console.log('📦 Migrando base de datos antigua detectada...');
      try {
        fs.copyFileSync(legacyDbPath, dbPath);
        console.log('✅ Migración completada con éxito.');
      } catch (err) {
        console.error('❌ Error migrando base de datos:', err);
      }
    }

    const wasmPath = _require.resolve('sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({
      locateFile: (file) => {
        if (file === 'sql-wasm.wasm') return wasmPath;
        return file;
      }
    });

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      sqlJsDb = new SQL.Database(buffer);
    } else {
      sqlJsDb = new SQL.Database();
    }

    sqlJsDb.run('PRAGMA foreign_keys = ON');

    // Tabla de Usuarios
    sqlJsDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de Meses (Grupos/Salas)
    sqlJsDb.run(`
      CREATE TABLE IF NOT EXISTS months (
        id TEXT PRIMARY KEY,
        creator_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT DEFAULT '📅',
        is_closed INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Migración manual: Añadir columna emoji si no existe
    try {
      sqlJsDb.run("ALTER TABLE months ADD COLUMN emoji TEXT DEFAULT '📅'");
    } catch (e) {
      // Si ya existe saltará aquí
    }

    sqlJsDb.run(`
      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        month_id TEXT NOT NULL,
        user_id INTEGER, 
        name TEXT NOT NULL,
        split_percentage REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    sqlJsDb.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        month_id TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        payer_participant_id TEXT NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (month_id) REFERENCES months(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (payer_participant_id) REFERENCES participants(id) ON DELETE CASCADE
      )
    `);

    saveDatabase();
    console.log('✅ Base de datos local SQLite (sql.js) inicializada correctamente');
    return sqlJsDb;
  }
}

export function saveDatabase() {
  if (useTurso) return; // Turso se guarda automáticamente en la nube
  if (!sqlJsDb) return;
  const data = sqlJsDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export async function dbRun(sql, params = []) {
  if (useTurso) {
    const res = await tursoClient.execute({ sql, args: params });
    const lastInsertRowid = res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined;
    console.log(`[DB Turso] Executed: ${sql.substring(0, 50)}... | Result ID: ${lastInsertRowid}`);
    return { lastInsertRowid };
  } else {
    if (!sqlJsDb) throw new Error('La base de datos no está inicializada');
    sqlJsDb.run(sql, params);
    const result = sqlJsDb.exec('SELECT last_insert_rowid() as id');
    const lastInsertRowid = result[0]?.values[0]?.[0];
    saveDatabase();
    console.log(`[DB local] Executed: ${sql.substring(0, 50)}... | Result ID: ${lastInsertRowid}`);
    return { lastInsertRowid };
  }
}

export async function dbGet(sql, params = []) {
  if (useTurso) {
    const res = await tursoClient.execute({ sql, args: params });
    if (res.rows.length > 0) {
      return { ...res.rows[0] };
    }
    return null;
  } else {
    if (!sqlJsDb) throw new Error('La base de datos no está inicializada');
    const stmt = sqlJsDb.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }
}

export async function dbAll(sql, params = []) {
  if (useTurso) {
    const res = await tursoClient.execute({ sql, args: params });
    return res.rows.map(row => ({ ...row }));
  } else {
    if (!sqlJsDb) throw new Error('La base de datos no está inicializada');
    const stmt = sqlJsDb.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }
}
