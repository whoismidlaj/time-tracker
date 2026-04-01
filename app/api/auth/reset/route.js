import { getUserByEmail, generateAndSetResetToken } from "@/db/queries.js";
import { sendResetEmail } from "@/lib/mailer.js";

export async function POST(request) {
  try {
    const { action, email } = await request.json();

    if (action === "request") {
      if (!email) return Response.json({ error: "Email is required" }, { status: 400 });
      const user = await getUserByEmail(email);
      
      // For security, always show success message
      if (!user) {
        return Response.json({ message: "If an account exists, a reset link has been emailed." });
      }

      const resetToken = await generateAndSetResetToken(email);
      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
      
      await sendResetEmail(email, resetUrl);

      return Response.json({ 
        message: "If an account exists, a reset link has been emailed."
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error('Reset Request Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
