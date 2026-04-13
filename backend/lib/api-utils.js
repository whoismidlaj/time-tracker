import jwt from "jsonwebtoken";
import { getActiveSession, getActiveBreak, getSessionBreaks, updateUserLastActive } from "../db/queries.js";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

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

export { updateUserLastActive };
