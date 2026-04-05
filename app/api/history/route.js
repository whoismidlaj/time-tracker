import { getRecentSessions, getSessionBreaks, getTodaySessions, getSessionsByDateRange, getLeavesByDateRange } from '@/db/queries.js';
import { getUserIdFromRequest } from "@/lib/api-utils.js";
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export async function GET(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'recent';
    const limit = Number(searchParams.get('limit')) || (type === 'today' ? 30 : 30);
    const date = searchParams.get('date');
    const month = searchParams.get('month'); // 1-12
    const year = searchParams.get('year');

    let sessions = [];
    let leaves = [];

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999).toISOString();
      sessions = await getSessionsByDateRange(Number(userId), startDate, endDate);
      leaves = await getLeavesByDateRange(Number(userId), startDate, endDate);
    } else if (type === 'today') {
      sessions = await getTodaySessions(Number(userId), date);
    } else {
      sessions = await getRecentSessions(Number(userId), limit);
    }

    const sessionsWithBreaks = await Promise.all(sessions.map(async (session) => ({
      ...session,
      breaks: await getSessionBreaks(session.id),
    })));
    
    return Response.json({ 
      sessions: sessionsWithBreaks,
      leaves: leaves
    });

  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
