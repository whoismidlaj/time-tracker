import { getAppSettings } from "@/db/queries";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ info: settings.app_info || 'Welcome to Time Tracker.' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
