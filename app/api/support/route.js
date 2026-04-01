import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAppSettings } from "@/db/queries";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";

// API for Support Tickets
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { subject, message } = await req.json();
    const settings = await getAppSettings();
    const supportEmail = settings.support_email || 'support@example.com';

    await sendEmail({
      to: supportEmail,
      subject: `[SUPPORT TICKET] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
          <h2 style="color: #111827; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">Support Ticket</h2>
          <p><strong>From:</strong> ${session.user.name} (${session.user.email})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #111827; margin-top: 15px;">
            <p style="white-space: pre-wrap; margin: 0; color: #374151;">${message}</p>
          </div>
        </div>
      `,
      text: `Support Ticket from ${session.user.email}\nSubject: ${subject}\n\n${message}`
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// API for App Info (GET)
export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ info: settings.app_info || 'Welcome to Time Tracker.' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
