import { updateSession, deleteSession, getSessionById, getSessionBreaks } from "@/db/queries.js";
import { getUserIdFromRequest, getUserStatus } from "@/lib/api-utils.js";

export async function GET(request, { params }) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const session = await getSessionById(Number(id));
    if (!session || session.user_id !== Number(userId)) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const breaks = await getSessionBreaks(session.id);
    return Response.json({ session: { ...session, breaks } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await request.json();
    await updateSession(Number(id), Number(userId), data);
    const statusData = await getUserStatus(Number(userId));
    return Response.json({ success: true, ...statusData });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await deleteSession(Number(id), Number(userId));
    const statusData = await getUserStatus(Number(userId));
    return Response.json({ success: true, ...statusData });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

