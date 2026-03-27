import { getActiveSession, getActiveBreak, getSessionBreaks } from '@/db/queries.js';
import { getUserIdFromRequest } from "@/lib/api-utils.js";

export async function GET(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await getActiveSession(userId);
    if (!session) {
      return Response.json({ status: 'off', session: null, activeBreak: null, breaks: [] });
    }
    const activeBreak = await getActiveBreak(session.id);
    const breaks = await getSessionBreaks(session.id);
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
