import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        display_name TEXT,
        avatar_url TEXT,
        reset_token TEXT,
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        punch_in_time TIMESTAMP NOT NULL,
        punch_out_time TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS breaks (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        break_start TIMESTAMP NOT NULL,
        break_end TIMESTAMP,
        CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);

    // Check for existing columns and add if missing (Migration logic)
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'reset_token'
    `);
    
    if (res.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
      await client.query(`ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP`);
    }

    const sessionRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'notes'
    `);
    
    if (sessionRes.rowCount === 0) {
      await client.query(`ALTER TABLE sessions ADD COLUMN notes TEXT`);
    }

    // Ensure legacy user exists for dev transition if needed
    await client.query(`
      INSERT INTO users (id, email, password_hash) 
      VALUES (1, 'legacy@example.com', '') 
      ON CONFLICT (id) DO NOTHING
    `);

  } catch (err) {
    console.error('Error ensuring schema:', err);
  } finally {
    client.release();
  }
}

let schemaEnsured = false;

export default async function getDb() {
  if (!schemaEnsured) {
    await ensureSchema();
    schemaEnsured = true;
  }
  return pool;
}

