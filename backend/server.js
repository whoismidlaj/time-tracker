import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { EventEmitter } from 'events';
import { 
  verifyUser, getUserById, 
  punchIn, punchOut, 
  startBreak, endBreak, 
  getTodaySessions, getRecentSessions,
  toggleLeave, updateUserSettings, getUserSettings,
  getAppSettings, updateAppSetting, getUsersMetrics,
  updateUser, deleteSession, updateSession, createSupportTicket,
  getSessionsByDateRange, getLeavesByDateRange,
  createOAuthUser
} from './db/queries.js';
import { getUserStatus, updateUserLastActive } from './lib/api-utils.js';
import syncEvents from './lib/sync-events.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for mobile compatibility during dev
    credentials: true,
  }
});

syncEvents.setIO(io);

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: true, // Allow all origins for mobile dev
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// --- WebSocket Handling ---
io.use(async (socket, next) => {
  let token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
  
  if (!token && socket.handshake.headers.cookie) {
    const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
      const [name, ...rest] = cookie.split('=');
      acc[name.trim()] = decodeURIComponent(rest.join('='));
      return acc;
    }, {});
    token = cookies['auth_token'];
  }

  if (!token) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  // Force a room-based status update on initial connection to ensure sync
  getUserStatus(socket.userId).then(statusData => {
    socket.emit('status-update', statusData);
  }).catch(() => {});

  socket.on('disconnect', () => {
    // Cleanup handled by socket.io
  });
});

// --- Auth Middleware ---
const authenticate = async (req, res, next) => {
  let token = req.cookies.auth_token;

  // Support Bearer token for mobile
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

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

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/api/auth/google', async (req, res) => {
  const { idToken, accessToken, email, name, picture } = req.body;
  
  try {
    let userData;

    if (idToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      userData = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
    } else if (accessToken && email) {
      // For web implicit flow, we trust the verified email sent with the access token 
      // since the client already fetched it from google's userinfo endpoint.
      userData = { email, name, picture };
    } else {
      return res.status(400).json({ error: 'Missing token or user data' });
    }

    const user = await createOAuthUser(userData.email, userData.name, userData.picture);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        avatar_url: user.avatar_url,
      }
    });
  } catch (err) {
    console.error('Google verification error:', err);
    res.status(401).json({ error: 'Invalid Google session' });
  }
});

app.post('/api/mobile/auth/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    const user = await createOAuthUser(email, name, picture);

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
    console.error('Google verification error:', err);
    res.status(401).json({ error: 'Invalid Google token' });
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
    await punchIn(req.user.id, notes, timestamp);
    const statusData = await getUserStatus(req.user.id);
    syncEvents.broadcastStatus(req.user.id, statusData);
    res.json(statusData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/session/manual', authenticate, async (req, res) => {
  const { punch_in_time, punch_out_time, notes } = req.body;
  try {
    const session = await createManualSession(req.user.id, { 
      punch_in_time, 
      punch_out_time, 
      notes 
    });
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/session/:id', authenticate, async (req, res) => {
  const { timestamp, punch_in_time, punch_out_time, notes, breaks } = req.body;
  try {
    if (punch_in_time || punch_out_time || notes || breaks) {
      await updateSession(Number(req.params.id), req.user.id, {
        punch_in_time,
        punch_out_time,
        notes,
        breaks
      });
    } else {
      await punchOut(Number(req.params.id), req.user.id, timestamp);
    }
    
    const statusData = await getUserStatus(req.user.id);
    syncEvents.broadcastStatus(req.user.id, statusData);
    res.json(statusData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/session/:id', authenticate, async (req, res) => {
  try {
    await deleteSession(Number(req.params.id), req.user.id);
    const statusData = await getUserStatus(req.user.id);
    syncEvents.broadcastStatus(req.user.id, statusData);
    res.json({ success: true, ...statusData });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/break', authenticate, async (req, res) => {
  const { sessionId, timestamp } = req.body;
  try {
    await startBreak(Number(sessionId), req.user.id, timestamp);
    const statusData = await getUserStatus(req.user.id);
    syncEvents.broadcastStatus(req.user.id, statusData);
    res.json(statusData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/break/:id', authenticate, async (req, res) => {
  const { timestamp } = req.body;
  try {
    await endBreak(Number(req.params.id), req.user.id, timestamp);
    const statusData = await getUserStatus(req.user.id);
    syncEvents.broadcastStatus(req.user.id, statusData);
    res.json(statusData);
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

// SSE route removed in favor of WebSockets

server.listen(PORT, () => {
  console.log(`Backend API running at http://localhost:${PORT}`);
});
