import { initDatabase, dbGet, dbAll } from './server/database.js';
await initDatabase();
const users = dbAll('SELECT * FROM users');
console.log('Users:', users);
