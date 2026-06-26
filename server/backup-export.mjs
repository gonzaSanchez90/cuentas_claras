import { createClient } from '@libsql/client';
import fs from 'fs';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const backup = {};
for (const table of ['users', 'months', 'participants', 'expenses']) {
  const res = await client.execute(`SELECT * FROM ${table}`);
  backup[table] = res.rows.map(r => ({ ...r }));
  console.log(`  ${table}: ${backup[table].length} registros`);
}

const date = new Date().toISOString().split('T')[0];
fs.mkdirSync('backups', { recursive: true });
fs.writeFileSync(`backups/${date}.json`, JSON.stringify(backup, null, 2));
console.log(`✅ Backup guardado: backups/${date}.json`);
process.exit(0);
