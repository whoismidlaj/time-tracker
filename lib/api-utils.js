import { verify } from "jsonwebtoken";
import { getActiveSession, getActiveBreak, getSessionBreaks } from "@/db/queries.js";

export async function getUserIdFromRequest(request) {
  // Check for NextAuth session first (web)
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/lib/auth.js");
  const sessionData = await getServerSession(authOptions);
  
  let userId = null;

  if (sessionData?.user?.id) {
    userId = Number(sessionData.user.id);
  } else {
    // Check for Bearer token (mobile)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const secret = process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev";
      try {
        const decoded = verify(token, secret);
        userId = Number(decoded.id);
      } catch (err) {
        console.error("JWT verification failed:", err);
      }
    }
  }

  if (userId) {
    try {
      const { updateUserLastActive } = await import("@/db/queries.js");
      updateUserLastActive(userId).catch(() => {}); // Fire and forget update
    } catch (e) {}
  }

  return userId;
}

export async function getUserStatus(userId) {
  const session = await getActiveSession(userId);
  if (!session) {
    return { status: 'off', session: null, activeBreak: null, breaks: [] };
  }
  const activeBreak = await getActiveBreak(session.id);
  const breaks = await getSessionBreaks(session.id);
  
  return {
    status: activeBreak ? 'break' : 'working',
    session,
    activeBreak: activeBreak || null,
    breaks,
    server_time: new Date().toISOString()
  };
}
