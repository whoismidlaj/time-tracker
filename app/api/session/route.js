import { punchIn, punchOut, createManualSession } from '@/db/queries.js';
import { getUserIdFromRequest, getUserStatus } from "@/lib/api-utils.js";

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, sessionId, timestamp, punch_in_time, punch_out_time, notes } = body;

    if (action === 'punch_in') {
      await punchIn(Number(userId), null, timestamp);
      const statusData = await getUserStatus(Number(userId));
      return Response.json({ success: true, ...statusData });
    }
    if (action === 'punch_out') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      await punchOut(Number(sessionId), Number(userId), timestamp);
      const statusData = await getUserStatus(Number(userId));
      return Response.json({ success: true, ...statusData });
    }
    if (action === 'manual_entry') {
      await createManualSession(Number(userId), { punch_in_time, punch_out_time, notes });
      const statusData = await getUserStatus(Number(userId));
      return Response.json({ success: true, ...statusData });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
