import { toggleUserStatus, getUserById, generateAndSetResetToken } from "@/db/queries";
import { NextResponse } from "next/server";
import { sendResetEmail } from "@/lib/mailer";

export async function PATCH(req, { params }) {
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
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) throw new Error('User not found');

    const token = await generateAndSetResetToken(user.email);
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
    
    await sendResetEmail(user.email, resetUrl);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
