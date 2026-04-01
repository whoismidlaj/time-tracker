import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { toggleUserStatus, getUserById, setResetToken } from "@/db/queries";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";
import crypto from 'crypto';

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { is_active } = await req.json();
    await toggleUserStatus(id, is_active);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) throw new Error('User not found');

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    await setResetToken(user.email, token, expiry);

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 8px;">
          <h2 style="color: #111827;">Password Reset</h2>
          <p style="color: #4b5563; line-height: 1.5;">An administrator has initiated a password reset for your account. Click the button below to set a new password.</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Reset Password</a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">If you did not request this, please ignore this email. The link will expire in 1 hour.</p>
        </div>
      `,
      text: `Password Reset Request: ${resetUrl}`
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
