const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'mouse_diary.db');

let db = null;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database.');
      }
    });
  }
  return db;
}

function initializeDatabase() {
  const database = getDatabase();
  
  database.serialize(() => {
    // Create mice table
    database.run(`
      CREATE TABLE IF NOT EXISTS mice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mouse_code VARCHAR(20) UNIQUE NOT NULL,
        strain VARCHAR(50) NOT NULL,
        gender VARCHAR(10) NOT NULL,
        birth_date DATE NOT NULL,
        source VARCHAR(100),
        cage_number VARCHAR(20),
        status VARCHAR(20) DEFAULT '存活',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create experiments table
    database.run(`
      CREATE TABLE IF NOT EXISTS experiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mouse_id INTEGER NOT NULL,
        experiment_date DATE NOT NULL,
        experiment_type VARCHAR(50) NOT NULL,
        weight DECIMAL(5,2),
        temperature DECIMAL(4,1),
        behavior_notes TEXT,
        medication VARCHAR(200),
        dosage VARCHAR(50),
        route VARCHAR(20),
        results TEXT,
        abnormalities TEXT,
        operator VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mouse_id) REFERENCES mice(id) ON DELETE CASCADE
      )
    `);

    // Create index for better performance
    database.run(`CREATE INDEX IF NOT EXISTS idx_mice_status ON mice(status)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_experiments_mouse_id ON experiments(mouse_id)`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_experiments_date ON experiments(experiment_date)`);
    
    console.log('Database tables initialized successfully.');
  });

  return database;
}

module.exports = {
  getDatabase,
  initializeDatabase
};
