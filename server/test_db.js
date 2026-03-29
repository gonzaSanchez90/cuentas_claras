import initSqlJs from 'sql.js';

async function test() {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
    db.run("INSERT INTO users (name) VALUES (?)", ["test"]);
    const result = db.exec("SELECT last_insert_rowid() as id");
    console.log("Result:", JSON.stringify(result));
    console.log("ID:", result[0]?.values[0]?.[0]);
}

test();
