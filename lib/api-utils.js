import { verify } from "jsonwebtoken";

export async function getUserIdFromRequest(request) {
  // Check for NextAuth session first (web)
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/lib/auth.js");
  const sessionData = await getServerSession(authOptions);
  
  if (sessionData?.user?.id) {
    return Number(sessionData.user.id);
  }

  // Check for Bearer token (mobile)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const secret = process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev";
    try {
      const decoded = verify(token, secret);
      return Number(decoded.id);
    } catch (err) {
      console.error("JWT verification failed:", err);
      return null;
    }
  }

  return null;
}
