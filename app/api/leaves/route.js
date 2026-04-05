import { toggleLeave } from '@/db/queries.js';
import { getUserIdFromRequest } from "@/lib/api-utils.js";

export async function POST(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { date, type, notes } = await request.json();
    if (!date) return Response.json({ error: 'Date is required' }, { status: 400 });

    const result = await toggleLeave(Number(userId), date, type, notes);
    return Response.json({ success: true, leave: result });

  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
