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

export function getUserByEmail(email) {
  return getDb()
    .prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`)
    .get(email);
}

export function getUserById(userId) {
  return getDb()
    .prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`)
    .get(userId);
}

export function createUser(email, password) {
  const existing = getUserByEmail(email);
  if (existing) throw new Error('Email already registered');
  const passwordHash = hashPassword(password);
  const db = getDb();
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(email.toLowerCase(), passwordHash);
  return getUserById(lastInsertRowid);
}

export function verifyUser(email, password) {
  const user = getUserByEmail(email.toLowerCase());
  if (!user || !user.password_hash) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return user;
}

export function createOAuthUser(email, displayName, avatarUrl) {
  const existing = getUserByEmail(email);
  if (existing) {
    // Update existing user with OAuth info if needed
    updateUser(existing.id, { 
      display_name: existing.display_name || displayName, 
      avatar_url: existing.avatar_url || avatarUrl 
    });
    return getUserById(existing.id);
  }
  const db = getDb();
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (email, display_name, avatar_url) VALUES (?, ?, ?)')
    .run(email.toLowerCase(), displayName, avatarUrl);
  return getUserById(lastInsertRowid);
}

export function setResetToken(email, token, expiry) {
  const db = getDb();
  const res = db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?').run(token, expiry, email.toLowerCase());
  return res.changes > 0;
}

export function getUserByResetToken(token) {
  return getDb()
    .prepare('SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ? LIMIT 1')
    .get(token, new Date().toISOString());
}

export function updatePassword(userId, newPassword) {
  const passwordHash = hashPassword(newPassword);
  const db = getDb();
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?').run(passwordHash, userId);
  return true;
}

export function updateUser(userId, data) {
  const db = getDb();
  const fields = [];
  const params = [];
  
  if (data.display_name !== undefined) {
    fields.push('display_name = ?');
    params.push(data.display_name);
  }
  if (data.avatar_url !== undefined) {
    fields.push('avatar_url = ?');
    params.push(data.avatar_url);
  }
  
  if (fields.length === 0) return getUserById(userId);
  
  params.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getUserById(userId);
}

export function getActiveSession(userId) {
  return getDb()
    .prepare(`SELECT * FROM sessions WHERE user_id = ? AND punch_out_time IS NULL ORDER BY punch_in_time DESC LIMIT 1`)
    .get(userId);
}

export function getSessionById(sessionId) {
  return getDb().prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId);
}

export function getActiveBreak(sessionId) {
  return getDb()
    .prepare(`SELECT * FROM breaks WHERE session_id = ? AND break_end IS NULL ORDER BY break_start DESC LIMIT 1`)
    .get(sessionId);
}

export function punchIn(userId, notes = null) {
  if (!userId) throw new Error('Not authenticated');
  const db = getDb();
  if (getActiveSession(userId)) throw new Error('Already punched in');

  const now = new Date().toISOString();
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO sessions (user_id, punch_in_time, notes) VALUES (?, ?, ?)`)
    .run(userId, now, notes);
  return getSessionById(lastInsertRowid);
}

export function createManualSession(userId, data) {
  if (!userId) throw new Error('Not authenticated');
  const db = getDb();
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO sessions (user_id, punch_in_time, punch_out_time, notes) VALUES (?, ?, ?, ?)`)
    .run(userId, data.punch_in_time, data.punch_out_time, data.notes);
  return getSessionById(lastInsertRowid);
}

export function updateSession(sessionId, userId, data) {
  const db = getDb();
  const session = getSessionById(sessionId);
  if (!session || session.user_id !== userId) throw new Error('Session not found');

  const fields = [];
  const params = [];
  if (data.punch_in_time) { fields.push('punch_in_time = ?'); params.push(data.punch_in_time); }
  if (data.punch_out_time !== undefined) { fields.push('punch_out_time = ?'); params.push(data.punch_out_time); }
  if (data.notes !== undefined) { fields.push('notes = ?'); params.push(data.notes); }

  if (fields.length === 0) return session;
  params.push(sessionId);
  db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getSessionById(sessionId);
}

export function deleteSession(sessionId, userId) {
  const db = getDb();
  const session = getSessionById(sessionId);
  if (!session || session.user_id !== userId) throw new Error('Session not found');
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
  return true;
}

export function punchOut(sessionId, userId) {
  if (!userId) throw new Error('Not authenticated');
  const db = getDb();
  const session = getSessionById(sessionId);
  if (!session || session.user_id !== userId) throw new Error('Session not found');
  if (session.punch_out_time) throw new Error('Already punched out');

  const now = new Date().toISOString();
  const activeBreak = getActiveBreak(sessionId);
  if (activeBreak) {
    db.prepare(`UPDATE breaks SET break_end = ? WHERE id = ?`).run(now, activeBreak.id);
  }
  db.prepare(`UPDATE sessions SET punch_out_time = ? WHERE id = ?`).run(now, sessionId);
  return getSessionById(sessionId);
}

export function startBreak(sessionId, userId) {
  if (!userId) throw new Error('Not authenticated');
  const db = getDb();
  const session = getSessionById(sessionId);
  if (!session || session.user_id !== userId) throw new Error('Session not found');
  if (session.punch_out_time) throw new Error('Session already ended');
  if (getActiveBreak(sessionId)) throw new Error('Break already in progress');

  const now = new Date().toISOString();
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO breaks (session_id, break_start) VALUES (?, ?)`)
    .run(sessionId, now);
  return db.prepare(`SELECT * FROM breaks WHERE id = ?`).get(lastInsertRowid);
}

export function endBreak(breakId, userId) {
  if (!userId) throw new Error('Not authenticated');
  const db = getDb();
  const brk = db.prepare(`SELECT * FROM breaks WHERE id = ?`).get(breakId);
  if (!brk) throw new Error('Break not found');
  const session = getSessionById(brk.session_id);
  if (!session || session.user_id !== userId) throw new Error('Break not found');
  if (brk.break_end) throw new Error('Break already ended');

  const now = new Date().toISOString();
  db.prepare(`UPDATE breaks SET break_end = ? WHERE id = ?`).run(now, breakId);
  return db.prepare(`SELECT * FROM breaks WHERE id = ?`).get(breakId);
}

export function getSessionBreaks(sessionId) {
  return getDb()
    .prepare(`SELECT * FROM breaks WHERE session_id = ? ORDER BY break_start ASC`)
    .all(sessionId);
}

export function getRecentSessions(userId, limit = 30) {
  return getDb()
    .prepare(`SELECT * FROM sessions WHERE user_id = ? ORDER BY punch_in_time DESC LIMIT ?`)
    .all(userId, limit);
}

export function getTodaySessions(userId) {
  const today = new Date().toISOString().split('T')[0];
  return getDb()
    .prepare(`SELECT * FROM sessions WHERE user_id = ? AND DATE(punch_in_time) = DATE(?) ORDER BY punch_in_time ASC`)
    .all(userId, today);
}
