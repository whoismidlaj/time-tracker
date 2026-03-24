import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.js";
import { getActiveSession, getActiveBreak, getSessionBreaks } from '@/db/queries.js';

export async function GET(request) {
  try {
    const sessionData = await getServerSession(authOptions);
    if (!sessionData?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = Number(sessionData.user.id);
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
