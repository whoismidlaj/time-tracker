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

export async function generateAndSetResetToken(email) {
  const token = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour
  const db = await getDb();
  await db.query(
    'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
    [token, expiry, email.toLowerCase()]
  );
  return token;
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

export function getUserSettings(user) {
  if (!user) return {};
  return typeof user.settings === 'string' ? JSON.parse(user.settings) : (user.settings || {});
}

export async function updateUserSettings(userId, settings) {
  const db = await getDb();
  // Fetch current settings to merge
  const user = await getUserById(userId);
  const currentSettings = getUserSettings(user);
  const newSettings = { ...currentSettings, ...settings };
  
  await db.query(
    'UPDATE users SET settings = $1 WHERE id = $2',
    [JSON.stringify(newSettings), userId]
  );
  return newSettings;
}

export async function toggleUserStatus(userId, isActive) {
  const db = await getDb();
  await db.query('UPDATE users SET is_active = $1 WHERE id = $2', [isActive, userId]);
  return true;
}

export async function updateUserLastActive(userId) {
  const db = await getDb();
  await db.query('UPDATE users SET last_active_time = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
  return true;
}

export async function getAppSettings() {
  const db = await getDb();
  const res = await db.query('SELECT * FROM app_settings');
  return res.rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function updateAppSetting(key, value) {
  const db = await getDb();
  await db.query(
    'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, value]
  );
  return true;
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

  const now = timestamp || new Date().toISOString();
  await ensureNoOverlap(userId, now, null);

  const db = await getDb();
  const res = await db.query(
    'INSERT INTO sessions (user_id, punch_in_time, notes) VALUES ($1, $2, $3) RETURNING id',
    [userId, now, notes]
  );
  return getSessionById(res.rows[0].id);
}

async function ensureNoOverlap(userId, punchInTime, punchOutTime, sessionId = null) {
  const db = await getDb();
  const now = new Date();
  const BUFFER_MS = 5 * 60 * 1000; // 5 minute buffer for clock drift
  
  // Future check
  if (new Date(punchInTime).getTime() > now.getTime() + BUFFER_MS) {
    throw new Error('Punch-in time cannot be in the future.');
  }
  if (punchOutTime && new Date(punchOutTime).getTime() > now.getTime() + BUFFER_MS) {
    throw new Error('Punch-out time cannot be in the future.');
  }

  const outTime = punchOutTime || '9999-12-31T23:59:59Z';
  
  const query = sessionId
    ? `SELECT id, punch_in_time, punch_out_time FROM sessions WHERE user_id = $1 AND id != $4 AND punch_in_time < $3 AND (punch_out_time IS NULL OR punch_out_time > $2) LIMIT 1`
    : `SELECT id, punch_in_time, punch_out_time FROM sessions WHERE user_id = $1 AND punch_in_time < $3 AND (punch_out_time IS NULL OR punch_out_time > $2) LIMIT 1`;
  
  const params = sessionId ? [userId, punchInTime, outTime, sessionId] : [userId, punchInTime, outTime];
  const res = await db.query(query, params);
  
  if (res.rows.length > 0) {
    const overlap = res.rows[0];
    const start = new Date(overlap.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = overlap.punch_out_time 
      ? new Date(overlap.punch_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Ongoing';
    throw new Error(`This session overlaps with an existing session from ${start} to ${end}.`);
  }
}

export async function createManualSession(userId, data) {
  if (!userId) throw new Error('Not authenticated');
  await ensureNoOverlap(userId, data.punch_in_time, data.punch_out_time);
  
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

  const finalInTime = data.punch_in_time || session.punch_in_time;
  const finalOutTime = data.punch_out_time !== undefined ? data.punch_out_time : session.punch_out_time;

  await ensureNoOverlap(userId, finalInTime, finalOutTime, sessionId);

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
        'INSERT INTO breaks (session_id, break_start, break_end, is_ignored) VALUES ($1, $2, $3, $4)',
        [sessionId, b.break_start, b.break_end, b.is_ignored || false]
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

export async function getUsersMetrics() {
  const db = await getDb();
  // We'll calculate:
  // - User info (id, email, name, role, avatar)
  // - count of sessions in last 30 days
  // - sum of duration in last 30 days (worked hours)
  // - last_active (max punch_in_time)
  
  const query = `
    SELECT 
      u.id, 
      u.email, 
      u.display_name, 
      u.avatar_url, 
      u.role,
      u.created_at,
      u.is_active,
      COUNT(s.id) FILTER (WHERE s.punch_in_time > NOW() - INTERVAL '30 days') as sessions_30d,
      GREATEST(u.last_active_time, MAX(s.punch_in_time)) as last_active
    FROM users u
    LEFT JOIN sessions s ON u.id = s.user_id
    GROUP BY u.id
    ORDER BY last_active DESC NULLS LAST
  `;
  
  const res = await db.query(query);
  return res.rows;
}

/** SUPPORT TICKETS */
export async function createSupportTicket(userId, subject, message) {
  const db = await getDb();
  await db.query(
    'INSERT INTO support_tickets (user_id, subject, message) VALUES ($1, $2, $3)',
    [userId, subject, message]
  );
}

export async function getSupportTickets() {
  const db = await getDb();
  const res = await db.query(`
    SELECT t.*, u.email, u.display_name 
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `);
  return res.rows;
}

export async function deleteSupportTicket(id) {
  const db = await getDb();
  await db.query('DELETE FROM support_tickets WHERE id = $1', [id]);
}

/** PASSWORD RESET */
export async function verifyResetToken(token, currentTime = null) {
  const now = currentTime || new Date().toISOString();
  const db = await getDb();
  const res = await db.query(
    'SELECT email FROM users WHERE reset_token = $1 AND reset_token_expiry > $2',
    [token, now]
  );
  return res.rows[0];
}

export async function updatePasswordWithToken(token, newHash) {
  const db = await getDb();
  await db.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = $2',
    [newHash, token]
  );
}

export async function getSessionsByDateRange(userId, startDate, endDate) {
  const db = await getDb();
  const res = await db.query(
    'SELECT * FROM sessions WHERE user_id = $1 AND punch_in_time >= $2 AND punch_in_time <= $3 ORDER BY punch_in_time ASC',
    [userId, startDate, endDate]
  );
  return res.rows;
}

export async function getLeavesByDateRange(userId, startDate, endDate) {
  const db = await getDb();
  const res = await db.query(
    'SELECT * FROM leaves WHERE user_id = $1 AND leave_date >= $2 AND leave_date <= $3 ORDER BY leave_date ASC',
    [userId, startDate, endDate]
  );
  return res.rows;
}

export async function toggleLeave(userId, date, type = null, notes = null) {
  const db = await getDb();
  if (type === null) {
    // Remove if exists
    await db.query('DELETE FROM leaves WHERE user_id = $1 AND leave_date = $2', [userId, date]);
    return null;
  } else {
    // Upsert
    const res = await db.query(
      'INSERT INTO leaves (user_id, leave_date, leave_type, notes) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, leave_date) DO UPDATE SET leave_type = EXCLUDED.leave_type, notes = EXCLUDED.notes RETURNING *',
      [userId, date, type, notes]
    );
    return res.rows[0];
  }
}

