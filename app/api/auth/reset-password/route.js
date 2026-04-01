import { verifyResetToken, updatePasswordWithToken } from "@/db/queries";
import { NextResponse } from "next/server";
import { scryptSync, randomBytes } from "crypto";

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export async function POST(req) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    const user = await verifyResetToken(token);
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
    }

    const newHash = hashPassword(password);
    await updatePasswordWithToken(token, newHash);

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Reset API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
