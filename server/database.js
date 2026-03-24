import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'cuentas_claras.db');

let db = null;

export async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  // Tabla de Usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de Meses (Grupos/Salas)
  db.run(`
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
     db.run("ALTER TABLE months ADD COLUMN emoji TEXT DEFAULT '📅'");
  } catch (e) {
     // Si ya existe saltará aquí
  }

  // Nueva tabla: Participantes del mes
  // Permite tener N participantes, con nombres libres y porcentajes libres.
  db.run(`
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

  // Tabla Gastos
  db.run(`
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
  console.log('\u2705 Base de datos Multijugador inicializada correctamente');
  return db;
}

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function getDb() {
  if (!db) throw new Error('La base de datos no est\xE1 inicializada');
  return db;
}

export function dbRun(sql, params = []) {
  const d = getDb();
  d.run(sql, params);
  saveDatabase();
  const result = d.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: result[0]?.values[0]?.[0] };
}

export function dbGet(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function dbAll(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}
