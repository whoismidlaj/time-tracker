import { getActiveSession, getActiveBreak, getSessionBreaks } from '../../../db/queries.js';

function parseCookie(req) {
  const header = req.headers.get('cookie') || '';
  const match = header.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(request) {
  try {
    const userId = parseCookie(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const session = getActiveSession(Number(userId));
    if (!session) {
      return Response.json({ status: 'off', session: null, activeBreak: null, breaks: [] });
    }
    const activeBreak = getActiveBreak(session.id);
    const breaks = getSessionBreaks(session.id);
    return Response.json({
      status: activeBreak ? 'break' : 'working',
      session,
      activeBreak: activeBreak || null,
      breaks,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
