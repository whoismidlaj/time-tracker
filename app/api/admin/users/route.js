import { getUsersMetrics } from "@/db/queries.js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.js";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await getUsersMetrics();
    return Response.json({ users });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
