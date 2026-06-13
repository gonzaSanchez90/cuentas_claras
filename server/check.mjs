import { initDatabase, dbAll } from './database.js';
await initDatabase();
console.log('Months:', await dbAll('SELECT * FROM months'));
console.log('Participants:', await dbAll('SELECT * FROM participants'));
