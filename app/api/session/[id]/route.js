import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.js";
import { updateSession, deleteSession, getSessionById, getSessionBreaks } from "@/db/queries.js";

export async function GET(request, { params }) {
  try {
    const sessionData = await getServerSession(authOptions);
    if (!sessionData?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const session = await getSessionById(Number(id));
    if (!session || session.user_id !== Number(sessionData.user.id)) {
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
    const sessionData = await getServerSession(authOptions);
    if (!sessionData?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await request.json();
    const session = await updateSession(Number(id), Number(sessionData.user.id), data);
    return Response.json({ success: true, session });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const sessionData = await getServerSession(authOptions);
    if (!sessionData?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await deleteSession(Number(id), Number(sessionData.user.id));
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

