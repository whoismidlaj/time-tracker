import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';
import { 
  verifyUser, getUserById, 
  punchIn, punchOut, 
  startBreak, endBreak, 
  getTodaySessions, getRecentSessions,
  toggleLeave, updateUserSettings, getUserSettings,
  getAppSettings, updateAppSetting, getUsersMetrics,
  updateUser, createSupportTicket,
  getSessionsByDateRange, getLeavesByDateRange
} from './db/queries.js';
import { getUserStatus, updateUserLastActive } from './lib/api-utils.js';
import syncEvents from './lib/sync-events.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

// Real-time events hub
const syncEmitter = new EventEmitter();

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// --- Auth Middleware ---
const authenticate = async (req, res, next) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(decoded.id);
    if (!user || user.is_active === false) {
      return res.status(401).json({ error: 'Unauthorized or deactivated' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await verifyUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        avatar_url: user.avatar_url,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mobile/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await verifyUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '365d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      display_name: req.user.display_name,
      role: req.user.role,
      avatar_url: req.user.avatar_url,
    }
  });
});

// --- App Routes ---
app.get('/api/status', authenticate, async (req, res) => {
  try {
    const statusData = await getUserStatus(req.user.id);
    updateUserLastActive(req.user.id).catch(() => {});
    res.json(statusData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/session', authenticate, async (req, res) => {
  const { notes, timestamp } = req.body;
  try {
    const session = await punchIn(req.user.id, notes, timestamp);
    const statusData = await getUserStatus(req.user.id);
    syncEvents.broadcastStatus(req.user.id, statusData);
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/session/:id', authenticate, async (req, res) => {
  const { timestamp } = req.body;
  try {
    const session = await punchOut(Number(req.params.id), req.user.id, timestamp);
    const statusData = await getUserStatus(req.user.id);
    syncEvents.broadcastStatus(req.user.id, statusData);
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/break', authenticate, async (req, res) => {
  const { sessionId, timestamp } = req.body;
  try {
    const brk = await startBreak(Number(sessionId), req.user.id, timestamp);
    const statusData = await getUserStatus(req.user.id);
    syncEvents.broadcastStatus(req.user.id, statusData);
    res.json(brk);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/break/:id', authenticate, async (req, res) => {
  const { timestamp } = req.body;
  try {
    const brk = await endBreak(Number(req.params.id), req.user.id, timestamp);
    const statusData = await getUserStatus(req.user.id);
    syncEvents.broadcastStatus(req.user.id, statusData);
    res.json(brk);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/history', authenticate, async (req, res) => {
  const { type, limit, date, month, year } = req.query;
  try {
    let sessions = [];
    let leaves = [];

    if (month && year) {
      // Monthly history logic
      const mon = parseInt(month);
      const yr = parseInt(year);
      const startDate = new Date(yr, mon - 1, 1).toISOString();
      const endDate = new Date(yr, mon, 0, 23, 59, 59, 999).toISOString();
      
      sessions = await getSessionsByDateRange(req.user.id, startDate, endDate);
      leaves = await getLeavesByDateRange(req.user.id, startDate, endDate);
    } else if (type === 'today') {
      sessions = await getTodaySessions(req.user.id, date);
    } else {
      sessions = await getRecentSessions(req.user.id, Number(limit) || 30);
    }
    res.json({ sessions, leaves });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leaves', authenticate, async (req, res) => {
  const { date, type, notes } = req.body;
  try {
    const result = await toggleLeave(req.user.id, date, type, notes);
    res.json({ success: true, leave: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- User Profile/Settings ---
app.get('/api/user/settings', authenticate, async (req, res) => {
  res.json({ settings: getUserSettings(req.user) });
});

app.post('/api/user/settings', authenticate, async (req, res) => {
  try {
    const settings = await updateUserSettings(req.user.id, req.body.settings);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile', authenticate, async (req, res) => {
  try {
    const { display_name, avatar_url } = req.body;
    const updatedUser = await updateUser(req.user.id, { display_name, avatar_url });
    res.json({ 
      user: { 
        id: updatedUser.id, 
        email: updatedUser.email,
        display_name: updatedUser.display_name,
        avatar_url: updatedUser.avatar_url
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/support', authenticate, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await createSupportTicket(req.user.id, subject, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/app-info', async (req, res) => {
  try {
    const settings = await getAppSettings();
    res.json({ info: settings.app_info || 'Welcome to TimeTrack.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Routes ---
app.get('/api/admin/settings', authenticate, adminOnly, async (req, res) => {
  try {
    const settings = await getAppSettings();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings', authenticate, adminOnly, async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await updateAppSetting(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', authenticate, adminOnly, async (req, res) => {
  try {
    const users = await getUsersMetrics();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sync/events', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const userId = req.user.id;
  const onStatusUpdate = (data) => {
    res.write(`event: status-update\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onSettingsUpdate = (data) => {
    res.write(`event: settings-update\ndata: ${JSON.stringify(data)}\n\n`);
  };

  syncEvents.on(`status-update:${userId}`, onStatusUpdate);
  syncEvents.on(`settings-update:${userId}`, onSettingsUpdate);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    syncEvents.off(`status-update:${userId}`, onStatusUpdate);
    syncEvents.off(`settings-update:${userId}`, onSettingsUpdate);
  });
});

app.listen(PORT, () => {
  console.log(`Backend API running at http://localhost:${PORT}`);
});
