import { punchIn, punchOut, createManualSession } from '@/db/queries.js';
import { getUserIdFromRequest, getUserStatus } from "@/lib/api-utils.js";
import syncEvents from "@/lib/sync-events.js";

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, sessionId, timestamp, punch_in_time, punch_out_time, notes } = body;
    console.log(`[API/Session] Action: ${action}, User: ${userId}`, body);

    let res = null;
    if (action === 'punch_in') {
      await punchIn(Number(userId), null, timestamp);
      res = await getUserStatus(Number(userId));
    } else if (action === 'punch_out') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      await punchOut(Number(sessionId), Number(userId), timestamp);
      res = await getUserStatus(Number(userId));
    } else if (action === 'manual_entry') {
      await createManualSession(Number(userId), { punch_in_time, punch_out_time, notes });
      res = await getUserStatus(Number(userId));
    }

    if (res) {
      syncEvents.broadcastStatus(Number(userId), res);
      return Response.json({ success: true, ...res });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(`[API/Session ERROR] ${err.message}`, { stack: err.stack, userId });
    const message = err.message;
    let status = 500;
    
    // Map common validation errors to non-500 codes
    if (message.includes('Already punched in') || message.includes('overlaps')) {
      status = 409; // Conflict
    } else if (message.includes('future') || message.includes('required')) {
      status = 400; // Bad Request
    }
    
    return Response.json({ error: message }, { status });
  }
}
