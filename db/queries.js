import getDb from './database.js';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':');
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  return timingSafeEqual(keyBuffer, derived);
}

export async function getUserByEmail(email) {
  const db = await getDb();
  const res = await db.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
  return res.rows[0];
}

export async function getUserById(userId) {
  const db = await getDb();
  const res = await db.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
  return res.rows[0];
}

export async function createUser(email, password) {
  const existing = await getUserByEmail(email);
  if (existing) throw new Error('Email already registered');
  const passwordHash = hashPassword(password);
  const db = await getDb();
  const res = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    [email.toLowerCase(), passwordHash]
  );
  return getUserById(res.rows[0].id);
}

export async function verifyUser(email, password) {
  const user = await getUserByEmail(email.toLowerCase());
  if (!user || !user.password_hash) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return user;
}

export async function createOAuthUser(email, displayName, avatarUrl) {
  const existing = await getUserByEmail(email);
  if (existing) {
    await updateUser(existing.id, { 
      display_name: existing.display_name || displayName, 
      avatar_url: existing.avatar_url || avatarUrl 
    });
    return getUserById(existing.id);
  }
  const db = await getDb();
  const res = await db.query(
    'INSERT INTO users (email, display_name, avatar_url) VALUES ($1, $2, $3) RETURNING id',
    [email.toLowerCase(), displayName, avatarUrl]
  );
  return getUserById(res.rows[0].id);
}

export async function setResetToken(email, token, expiry) {
  const db = await getDb();
  const res = await db.query(
    'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
    [token, expiry, email.toLowerCase()]
  );
  return res.rowCount > 0;
}

export async function getUserByResetToken(token) {
  const db = await getDb();
  const res = await db.query(
    'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > $2 LIMIT 1',
    [token, new Date().toISOString()]
  );
  return res.rows[0];
}

export async function updatePassword(userId, newPassword) {
  const passwordHash = hashPassword(newPassword);
  const db = await getDb();
  await db.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
    [passwordHash, userId]
  );
  return true;
}

export async function updateUser(userId, data) {
  const db = await getDb();
  const fields = [];
  const params = [];
  let paramIdx = 1;
  
  if (data.display_name !== undefined) {
    fields.push(`display_name = $${paramIdx++}`);
    params.push(data.display_name);
  }
  if (data.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIdx++}`);
    params.push(data.avatar_url);
  }
  
  if (fields.length === 0) return getUserById(userId);
  
  params.push(userId);
  await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIdx}`, params);
  return getUserById(userId);
}

export async function getActiveSession(userId) {
  const db = await getDb();
  const res = await db.query(
    'SELECT * FROM sessions WHERE user_id = $1 AND punch_out_time IS NULL ORDER BY punch_in_time DESC LIMIT 1',
    [userId]
  );
  return res.rows[0];
}

export async function getSessionById(sessionId) {
  const db = await getDb();
  const res = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  return res.rows[0];
}

export async function getActiveBreak(sessionId) {
  const db = await getDb();
  const res = await db.query(
    'SELECT * FROM breaks WHERE session_id = $1 AND break_end IS NULL ORDER BY break_start DESC LIMIT 1',
    [sessionId]
  );
  return res.rows[0];
}

export async function punchIn(userId, notes = null, timestamp = null) {
  if (!userId) throw new Error('Not authenticated');
  if (await getActiveSession(userId)) throw new Error('Already punched in');

  const db = await getDb();
  const now = timestamp || new Date().toISOString();
  const res = await db.query(
    'INSERT INTO sessions (user_id, punch_in_time, notes) VALUES ($1, $2, $3) RETURNING id',
    [userId, now, notes]
  );
  return getSessionById(res.rows[0].id);
}

export async function createManualSession(userId, data) {
  if (!userId) throw new Error('Not authenticated');
  const db = await getDb();
  const res = await db.query(
    'INSERT INTO sessions (user_id, punch_in_time, punch_out_time, notes) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, data.punch_in_time, data.punch_out_time, data.notes]
  );
  return getSessionById(res.rows[0].id);
}

export async function updateSession(sessionId, userId, data) {
  const session = await getSessionById(sessionId);
  if (!session || session.user_id !== userId) throw new Error('Session not found');

  const db = await getDb();
  const fields = [];
  const params = [];
  let paramIdx = 1;

  if (data.punch_in_time) { fields.push(`punch_in_time = $${paramIdx++}`); params.push(data.punch_in_time); }
  if (data.punch_out_time !== undefined) { fields.push(`punch_out_time = $${paramIdx++}`); params.push(data.punch_out_time); }
  if (data.notes !== undefined) { fields.push(`notes = $${paramIdx++}`); params.push(data.notes); }

  if (fields.length > 0) {
    params.push(sessionId);
    await db.query(`UPDATE sessions SET ${fields.join(', ')} WHERE id = $${paramIdx}`, params);
  }

  if (data.breaks) {
    await syncSessionBreaks(sessionId, userId, data.breaks);
  }

  return getSessionById(sessionId);
}

export async function syncSessionBreaks(sessionId, userId, breaks) {
  const session = await getSessionById(sessionId);
  if (!session || session.user_id !== userId) throw new Error('Session not found');

  const pool = await getDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM breaks WHERE session_id = $1', [sessionId]);
    for (const b of breaks) {
      if (!b.break_start) continue;
      await client.query(
        'INSERT INTO breaks (session_id, break_start, break_end) VALUES ($1, $2, $3)',
        [sessionId, b.break_start, b.break_end]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteSession(sessionId, userId) {
  const session = await getSessionById(sessionId);
  if (!session || session.user_id !== userId) throw new Error('Session not found');
  const db = await getDb();
  await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  return true;
}

export async function punchOut(sessionId, userId, timestamp = null) {
  if (!userId) throw new Error('Not authenticated');
  const session = await getSessionById(sessionId);
  if (!session || session.user_id !== userId) throw new Error('Session not found');
  if (session.punch_out_time) throw new Error('Already punched out');

  const db = await getDb();
  const now = timestamp || new Date().toISOString();
  const activeBreak = await getActiveBreak(sessionId);
  if (activeBreak) {
    await db.query('UPDATE breaks SET break_end = $1 WHERE id = $2', [now, activeBreak.id]);
  }
  await db.query('UPDATE sessions SET punch_out_time = $1 WHERE id = $2', [now, sessionId]);
  return getSessionById(sessionId);
}

export async function startBreak(sessionId, userId, timestamp = null) {
  if (!userId) throw new Error('Not authenticated');
  const session = await getSessionById(sessionId);
  if (!session || session.user_id !== userId) throw new Error('Session not found');
  if (session.punch_out_time) throw new Error('Session already ended');
  if (await getActiveBreak(sessionId)) throw new Error('Break already in progress');

  const db = await getDb();
  const now = timestamp || new Date().toISOString();
  const res = await db.query(
    'INSERT INTO breaks (session_id, break_start) VALUES ($1, $2) RETURNING id',
    [sessionId, now]
  );
  const breakRes = await db.query('SELECT * FROM breaks WHERE id = $1', [res.rows[0].id]);
  return breakRes.rows[0];
}

export async function endBreak(breakId, userId, timestamp = null) {
  if (!userId) throw new Error('Not authenticated');
  const db = await getDb();
  const breakRes = await db.query('SELECT * FROM breaks WHERE id = $1', [breakId]);
  const brk = breakRes.rows[0];
  if (!brk) throw new Error('Break not found');
  const session = await getSessionById(brk.session_id);
  if (!session || session.user_id !== userId) throw new Error('Break not found');
  if (brk.break_end) throw new Error('Break already ended');

  const now = timestamp || new Date().toISOString();
  await db.query('UPDATE breaks SET break_end = $1 WHERE id = $2', [now, breakId]);
  const updatedBreakRes = await db.query('SELECT * FROM breaks WHERE id = $1', [breakId]);
  return updatedBreakRes.rows[0];
}

export async function getSessionBreaks(sessionId) {
  const db = await getDb();
  const res = await db.query(
    'SELECT * FROM breaks WHERE session_id = $1 ORDER BY break_start ASC',
    [sessionId]
  );
  return res.rows;
}

export async function getRecentSessions(userId, limit = 30) {
  const db = await getDb();
  const res = await db.query(
    'SELECT * FROM sessions WHERE user_id = $1 ORDER BY punch_in_time DESC LIMIT $2',
    [userId, limit]
  );
  return res.rows;
}

export async function getTodaySessions(userId, dateStr) {
  const db = await getDb();
  const date = dateStr || new Date().toISOString().split('T')[0];
  const res = await db.query(
    'SELECT * FROM sessions WHERE user_id = $1 AND CAST(punch_in_time AS DATE) = $2 ORDER BY punch_in_time ASC',
    [userId, date]
  );
  return res.rows;
}

