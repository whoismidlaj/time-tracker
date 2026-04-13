import { startBreak, endBreak } from '@/db/queries.js';
import { getUserIdFromRequest, getUserStatus } from "@/lib/api-utils.js";
import syncEvents from "@/lib/sync-events.js";

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, sessionId, breakId, timestamp } = body;
    console.log(`[API/Break] Action: ${action}, User: ${userId}`, body);

    let res = null;
    if (action === 'start') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      await startBreak(Number(sessionId), Number(userId), timestamp);
      res = await getUserStatus(Number(userId));
    } else if (action === 'end') {
      if (!breakId) return Response.json({ error: 'breakId required' }, { status: 400 });
      await endBreak(Number(breakId), Number(userId), timestamp);
      res = await getUserStatus(Number(userId));
    }

    if (res) {
      syncEvents.broadcastStatus(Number(userId), res);
      return Response.json({ success: true, ...res });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(`[API/Break ERROR] ${err.message}`, { stack: err.stack, userId });
    const message = err.message;
    let status = 500;
    
    if (message.includes('already in progress') || message.includes('already ended')) {
      status = 409;
    } else if (message.includes('not found') || message.includes('required')) {
      status = 400;
    }
    
    return Response.json({ error: message }, { status });
  }
}
