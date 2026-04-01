import { startBreak, endBreak } from '@/db/queries.js';
import { getUserIdFromRequest, getUserStatus } from "@/lib/api-utils.js";

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, sessionId, breakId, timestamp } = body;

    if (action === 'start') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      await startBreak(Number(sessionId), Number(userId), timestamp);
      const statusData = await getUserStatus(Number(userId));
      return Response.json({ success: true, ...statusData });
    }
    if (action === 'end') {
      if (!breakId) return Response.json({ error: 'breakId required' }, { status: 400 });
      await endBreak(Number(breakId), Number(userId), timestamp);
      const statusData = await getUserStatus(Number(userId));
      return Response.json({ success: true, ...statusData });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
