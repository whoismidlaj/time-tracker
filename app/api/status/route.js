import { getUserIdFromRequest, getUserStatus } from "@/lib/api-utils.js";

export async function GET(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const statusData = await getUserStatus(userId);
    return Response.json(statusData);

  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
