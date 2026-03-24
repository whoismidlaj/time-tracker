import { punchIn, punchOut } from '../../../db/queries.js';

function parseCookie(req) {
  const header = req.headers.get('cookie') || '';
  const match = header.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(request) {
  try {
    const userId = parseCookie(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, sessionId } = await request.json();
    if (action === 'punch_in') {
      const session = punchIn(Number(userId));
      return Response.json({ success: true, session });
    }
    if (action === 'punch_out') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      const session = punchOut(Number(sessionId), Number(userId));
      return Response.json({ success: true, session });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
