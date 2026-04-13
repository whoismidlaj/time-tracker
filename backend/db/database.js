import { Pool } from 'pg';
import { scryptSync, randomBytes } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

async function ensureSuperAdmin(client) {
  const email = process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  
  if (!email || !password) return;

  const res = await client.query('SELECT id, role FROM users WHERE email = $1', [email.toLowerCase()]);
  
  if (res.rowCount === 0) {
    console.log('--- Automated Seeding: Creating Superadmin ---');
    const passwordHash = hashPassword(password);
    await client.query(
      'INSERT INTO users (email, password_hash, role, display_name) VALUES ($1, $2, $3, $4)',
      [email.toLowerCase(), passwordHash, 'admin', 'Super Admin']
    );
  } else {
    console.log('--- Automated Seeding: Synchronizing Superadmin from .env ---');
    const passwordHash = hashPassword(password);
    await client.query(
      'UPDATE users SET role = $1, password_hash = $2, display_name = COALESCE(display_name, $3), is_active = TRUE WHERE email = $4', 
      ['admin', passwordHash, 'Super Admin', email.toLowerCase()]
    );
  }
}

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
        reset_token_expiry TIMESTAMPTZ,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        role TEXT DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        settings JSONB DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        punch_in_time TIMESTAMPTZ NOT NULL,
        punch_out_time TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS breaks (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        break_start TIMESTAMPTZ NOT NULL,
        break_end TIMESTAMPTZ,
        is_ignored BOOLEAN DEFAULT FALSE,
        CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_support FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS leaves (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        leave_date DATE NOT NULL,
        leave_type TEXT NOT NULL, -- 'sick', 'casual', 'other'
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_leaves FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, leave_date)
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
      await client.query(`ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMPTZ`);
    } else {
      // Migration to switch existing column to TIMESTAMPTZ
      await client.query(`ALTER TABLE users ALTER COLUMN reset_token_expiry TYPE TIMESTAMPTZ USING reset_token_expiry AT TIME ZONE 'UTC'`);
    }

    const breakCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'breaks' AND column_name = 'is_ignored'
    `);
    if (breakCols.rowCount === 0) {
      await client.query(`ALTER TABLE breaks ADD COLUMN is_ignored BOOLEAN DEFAULT FALSE`);
    }

    const roleRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    if (roleRes.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
    }

    const activeRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_active'
    `);
    
    if (activeRes.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE`);
    }

    const lastActiveTimeRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_active_time'
    `);
    if (lastActiveTimeRes.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN last_active_time TIMESTAMPTZ`);
    }

    const settingsRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'settings'
    `);
    
    if (settingsRes.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN settings JSONB DEFAULT '{}'`);
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

    await ensureSuperAdmin(client);
    await seedAppSettings(client);

  } catch (err) {
    console.error('Error ensuring schema:', err);
  } finally {
    client.release();
  }
}

async function seedAppSettings(client) {
  const defaultSettings = [
    { key: 'app_info', value: 'Welcome to TimeTrack. High performance time tracking for modern teams.' },
    { key: 'support_email', value: 'support@example.com' },
    { key: 'smtp_config', value: JSON.stringify({
      host: '',
      port: 587,
      user: '',
      pass: '',
      from: 'noreply@example.com'
    })}
  ];

  for (const s of defaultSettings) {
    await client.query(
      'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [s.key, s.value]
    );
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

