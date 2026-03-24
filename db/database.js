import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'time_tracker.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db;

function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      display_name TEXT,
      avatar_url TEXT,
      reset_token TEXT,
      reset_token_expiry DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      punch_in_time DATETIME NOT NULL,
      punch_out_time DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS breaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      break_start DATETIME NOT NULL,
      break_end DATETIME,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  const userInfo = db.prepare(`PRAGMA table_info(users)`).all();
  const hasResetToken = userInfo.some(col => col.name === 'reset_token');
  if (!hasResetToken) {
    db.exec(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
    db.exec(`ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME`);
  }

  const isPasswordNullable = userInfo.find(col => col.name === 'password_hash')?.notnull === 0;
  if (!isPasswordNullable && userInfo.length > 0) {
    // SQLite doesn't support ALTER TABLE DROP NOT NULL
    // We recreate the table if we need to fix the constraint
    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        display_name TEXT,
        avatar_url TEXT,
        reset_token TEXT,
        reset_token_expiry DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO users_new (id, email, password_hash, display_name, avatar_url, reset_token, reset_token_expiry, created_at)
      SELECT id, email, password_hash, display_name, avatar_url, reset_token, reset_token_expiry, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);
  }

  const sessionInfo = db.prepare(`PRAGMA table_info(sessions)`).all();
  const hasNotes = sessionInfo.some(col => col.name === 'notes');
  if (!hasNotes) {
    db.exec(`ALTER TABLE sessions ADD COLUMN notes TEXT`);
  }
  const hasUserId = sessionInfo.some(col => col.name === 'user_id');

  if (!hasUserId) {
    // old table schema is missing user_id from earlier version
    // create a fallback user for existing sessions (local dev transition)
    db.prepare(`INSERT OR IGNORE INTO users (id, email, password_hash) VALUES (1, 'legacy@example.com', '')`).run();
    db.exec(`ALTER TABLE sessions ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`);
  }

  // Ensure user_id is non-null for old rows (if any)
  db.exec(`UPDATE sessions SET user_id = 1 WHERE user_id IS NULL`);

  // Enforce foreign key may require safe fallback
  db.exec(`PRAGMA foreign_keys = ON`);
}

export default function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    ensureSchema();
  }
  return db;
}
