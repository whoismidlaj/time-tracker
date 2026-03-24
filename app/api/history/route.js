import { getRecentSessions, getSessionBreaks, getTodaySessions } from '../../../db/queries.js';

function parseCookie(req) {
  const header = req.headers.get('cookie') || '';
  const match = header.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(request) {
  try {
    const userId = parseCookie(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'recent';
    const limit = Number(searchParams.get('limit')) || (type === 'today' ? 30 : 30);

    const sessions = type === 'today'
      ? getTodaySessions(Number(userId))
      : getRecentSessions(Number(userId), limit);

    const sessionsWithBreaks = sessions.map(session => ({
      ...session,
      breaks: getSessionBreaks(session.id),
    }));
    return Response.json({ sessions: sessionsWithBreaks });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
