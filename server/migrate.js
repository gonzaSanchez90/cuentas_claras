import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);
const dbPath = path.join(__dirname, 'data', 'cuentas_claras.db');

const TURSO_URL = "libsql://cuentas-claras-gonzasanchez90.aws-eu-west-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MTI5MTI3MzQsImlhdCI6MTc4MTM3NjczNCwiaWQiOiIwMTllYzI1MC0yYzAxLTc0ZjUtODNkNS02MWRmZDRiYmNlMzIiLCJyaWQiOiJlOGFmZWE5YS05OWZkLTQ0NjEtYWExYy1jMWY1ZGNjNjVkYmQifQ.1_XiAbmL86DLQeA6sJEdNyJqsiBqAa1ww7JjYHhf6n0sPWra9gjbrlPP_1UkeiEeRYo5yAjulV10RG_fE7bdBQ";

async function runMigration() {
  console.log('🚀 Iniciando migración de datos locales a Turso...');

  // 1. Conectar a Turso
  const turso = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });

  // 2. Cargar base de datos local
  const wasmPath = _require.resolve('sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlJs({
    locateFile: (file) => file === 'sql-wasm.wasm' ? wasmPath : file
  });

  if (!fs.existsSync(dbPath)) {
    console.error('❌ No se encontró el archivo local en:', dbPath);
    return;
  }

  const buffer = fs.readFileSync(dbPath);
  const localDb = new SQL.Database(buffer);

  // Helper para leer de la base de datos local
  function localQuery(sql, params = []) {
    const stmt = localDb.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  // Desactivar foreign keys temporalmente durante la migración
  await turso.execute('PRAGMA foreign_keys = OFF');

  // 3. Migrar Usuarios
  const users = localQuery('SELECT * FROM users');
  console.log(`👤 Migrando ${users.length} usuarios...`);
  for (const u of users) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO users (id, email, password, name, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [u.id, u.email, u.password, u.name, u.created_at]
    });
  }

  // 4. Migrar Meses
  const months = localQuery('SELECT * FROM months');
  console.log(`📅 Migrando ${months.length} meses/grupos...`);
  for (const m of months) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO months (id, creator_id, name, emoji, is_closed, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [m.id, m.creator_id, m.name, m.emoji, m.is_closed, m.created_at]
    });
  }

  // 5. Migrar Participantes
  const participants = localQuery('SELECT * FROM participants');
  console.log(`👥 Migrando ${participants.length} participantes...`);
  for (const p of participants) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO participants (id, month_id, user_id, name, split_percentage, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [p.id, p.month_id, p.user_id, p.name, p.split_percentage, p.created_at]
    });
  }

  // 6. Migrar Gastos
  const expenses = localQuery('SELECT * FROM expenses');
  console.log(`💵 Migrando ${expenses.length} gastos...`);
  for (const e of expenses) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO expenses (id, month_id, created_by, payer_participant_id, title, amount, date, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [e.id, e.month_id, e.created_by, e.payer_participant_id, e.title, e.amount, e.date, e.category, e.note, e.created_at]
    });
  }

  console.log('✅ Migración de datos completada con éxito!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('❌ Error durante la migración:', err);
  process.exit(1);
});
