import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// dotenv solo en local, en CI las vars vienen de los secrets
try {
  const { config } = await import('dotenv');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  config({ path: path.join(__dirname, '..', '.env') });
} catch { /* dotenv no disponible en CI, ignorar */ }

const TURSO_URL = process.env.TURSO_DATABASE_URL?.replace('libsql://', 'https://');
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN');
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql } },
        { type: 'close' },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const result = data.results[0].response.result;
  const cols = result.cols.map(c => c.name);
  return result.rows.map(row =>
    Object.fromEntries(cols.map((col, i) => [col, row[i]?.value ?? null]))
  );
}

const backup = {};
for (const table of ['users', 'months', 'participants', 'expenses']) {
  backup[table] = await query(`SELECT * FROM ${table}`);
  console.log(`  ${table}: ${backup[table].length} registros`);
}

const date = new Date().toISOString().split('T')[0];
fs.mkdirSync('backups', { recursive: true });
fs.writeFileSync(`backups/${date}.json`, JSON.stringify(backup, null, 2));
console.log(`✅ Backup guardado: backups/${date}.json`);
