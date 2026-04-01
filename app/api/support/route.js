import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createSupportTicket } from "@/db/queries";
import { NextResponse } from "next/server";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { subject, message } = await req.json();
    if (!subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await createSupportTicket(session.user.id, subject, message);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Support API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET remains the same for app-info but I'll separate them later if needed
export async function GET() {
  const { getAppSettings } = require("@/db/queries");
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ info: settings.app_info || 'Welcome to Time Tracker.' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
