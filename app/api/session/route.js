import { punchIn, punchOut, createManualSession } from '@/db/queries.js';
import { getUserIdFromRequest } from "@/lib/api-utils.js";

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, sessionId } = await request.json();
    if (action === 'punch_in') {
      const session = await punchIn(Number(userId));
      return Response.json({ success: true, session });
    }
    if (action === 'punch_out') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      const session = await punchOut(Number(sessionId), Number(userId));
      return Response.json({ success: true, session });
    }
    if (action === 'manual_entry') {
      const { punch_in_time, punch_out_time, notes } = await request.json();
      const session = await createManualSession(Number(userId), { punch_in_time, punch_out_time, notes });
      return Response.json({ success: true, session });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
