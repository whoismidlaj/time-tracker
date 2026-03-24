import { createUser, verifyUser, getUserById } from '../../../db/queries.js';

function parseCookie(req) {
  const header = req.headers.get('cookie') || '';
  const match = header.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push('Secure');
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  return parts.join('; ');
}

export async function GET(request) {
  try {
    const userId = parseCookie(request);
    if (!userId) return Response.json({ user: null });

    const user = getUserById(Number(userId));
    if (!user) return Response.json({ user: null });

    return Response.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, email, password } = await request.json();
    if (!action) return Response.json({ error: 'Action required' }, { status: 400 });

    if (action === 'register') {
      if (!email || !password) return Response.json({ error: 'Email and password are required' }, { status: 400 });
      const user = createUser(email, password);
      const cookie = buildCookie('token', String(user.id), {
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60,
      });
      return new Response(JSON.stringify({ user: { id: user.id, email: user.email } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
      });
    }

    if (action === 'login') {
      if (!email || !password) return Response.json({ error: 'Email and password are required' }, { status: 400 });
      const user = verifyUser(email, password);
      if (!user) return Response.json({ error: 'Invalid email or password' }, { status: 401 });
      const cookie = buildCookie('token', String(user.id), {
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60,
      });
      return new Response(JSON.stringify({ user: { id: user.id, email: user.email } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
      });
    }

    if (action === 'logout') {
      const cookie = buildCookie('token', '', {
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        maxAge: 0,
        expires: new Date(0),
      });
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
