import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.js";
import { punchIn, punchOut } from '@/db/queries.js';

export async function POST(request) {
  try {
    const sessionData = await getServerSession(authOptions);
    if (!sessionData?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = Number(sessionData.user.id);

    const { action, sessionId } = await request.json();
    if (action === 'punch_in') {
      const session = punchIn(Number(userId));
      return Response.json({ success: true, session });
    }
    if (action === 'punch_out') {
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
      const session = punchOut(Number(sessionId), Number(userId));
      return Response.json({ success: true, session });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
