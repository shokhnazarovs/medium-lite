const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./db/blog.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the blog database.');
});

db.run('CREATE TABLE User(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, password INTEGER NOT NULL)');
db.run('CREATE TABLE Post(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, author INTEGER NOT NULL, FOREIGN KEY(author) REFERENCES User(id))');


db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Close the database connection.');
});