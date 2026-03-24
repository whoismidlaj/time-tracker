import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.js";
import { getRecentSessions, getSessionBreaks, getTodaySessions } from '@/db/queries.js';

export async function GET(request) {
  try {
    const sessionData = await getServerSession(authOptions);
    if (!sessionData?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = Number(sessionData.user.id);

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
