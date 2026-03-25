import { startBreak, endBreak } from '@/db/queries.js';
import { getUserIdFromRequest } from "@/lib/api-utils.js";

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, sessionId, breakId } = await request.json();
    if (action === 'start') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      const brk = await startBreak(Number(sessionId), Number(userId));
      return Response.json({ success: true, break: brk });
    }
    if (action === 'end') {
      if (!breakId) return Response.json({ error: 'breakId required' }, { status: 400 });
      const brk = await endBreak(Number(breakId), Number(userId));
      return Response.json({ success: true, break: brk });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
