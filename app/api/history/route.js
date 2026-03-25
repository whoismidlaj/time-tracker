import { getRecentSessions, getSessionBreaks, getTodaySessions } from '@/db/queries.js';
import { getUserIdFromRequest } from "@/lib/api-utils.js";

export async function GET(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'recent';
    const limit = Number(searchParams.get('limit')) || (type === 'today' ? 30 : 30);

    const sessions = type === 'today'
      ? await getTodaySessions(Number(userId))
      : await getRecentSessions(Number(userId), limit);

    const sessionsWithBreaks = await Promise.all(sessions.map(async (session) => ({
      ...session,
      breaks: await getSessionBreaks(session.id),
    })));
    return Response.json({ sessions: sessionsWithBreaks });

  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
