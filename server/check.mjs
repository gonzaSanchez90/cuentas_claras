import { initDatabase, dbAll } from './database.js';
await initDatabase();
console.log('Months:', dbAll('SELECT * FROM months'));
console.log('Participants:', dbAll('SELECT * FROM participants'));
