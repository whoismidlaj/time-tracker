import { randomBytes } from "crypto";
import { getUserByEmail, setResetToken, getUserByResetToken, updatePassword } from "@/db/queries.js";

export async function POST(request) {
  try {
    const { action, email, token, newPassword } = await request.json();

    if (action === "request") {
      if (!email) return Response.json({ error: "Email is required" }, { status: 400 });
      const user = await getUserByEmail(email);
      if (!user) {
        // For security, don't reveal if user exists
        return Response.json({ message: "If an account exists, a reset link has been generated." });
      }

      const resetToken = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour
      await setResetToken(email, resetToken, expiry);

      // In a real app, send email here. For now, we'll log it for the user.
      console.log(`PASSWORD RESET TOKEN for ${email}: ${resetToken}`);
      return Response.json({ 
        message: "If an account exists, a reset link has been generated.",
        token: process.env.NODE_ENV === "development" ? resetToken : undefined // Only expose in dev for easy testing
      });
    }

    if (action === "reset") {
      if (!token || !newPassword) return Response.json({ error: "Token and password are required" }, { status: 400 });
      const user = await getUserByResetToken(token);
      if (!user) return Response.json({ error: "Invalid or expired token" }, { status: 400 });

      await updatePassword(user.id, newPassword);
      return Response.json({ message: "Password updated successfully" });
    }


    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
