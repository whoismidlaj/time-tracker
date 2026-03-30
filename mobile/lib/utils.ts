// Constants to match web app (should ideally be imported from a config, but for now matching web's lib/config.js)
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const DEFAULT_START_TIME = "09:30";
const DEFAULT_END_TIME = "18:30";
const DEFAULT_BREAK_HOURS = 1;

export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
}

export function formatShortDuration(ms: number): string {
  if (!ms || ms < 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTime(isoString: string): string {
  if (!isoString) return '--:--';
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  
  const dStr = d.toLocaleDateString('en-CA');
  const todayStr = now.toLocaleDateString('en-CA');
  
  if (dStr === todayStr) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  if (dStr === yesterdayStr) return 'Yesterday';

  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function calcTotalBreakMs(breaks: any[]): number {
  return breaks.reduce((acc, b) => {
    if (!b.break_start) return acc;
    const start = new Date(b.break_start).getTime();
    const end = b.break_end ? new Date(b.break_end).getTime() : Date.now();
    return acc + (end - start);
  }, 0);
}

export function calcGrossSessionDurationMs(session: any): number {
  if (!session?.punch_in_time) return 0;
  const start = new Date(session.punch_in_time).getTime();
  const end = session.punch_out_time ? new Date(session.punch_out_time).getTime() : Date.now();
  return Math.max(0, end - start);
}

export function calcSessionDurationMs(session: any, breaks: any[] = []): number {
  if (!session?.punch_in_time) return 0;
  const start = new Date(session.punch_in_time).getTime();
  const end = session.punch_out_time ? new Date(session.punch_out_time).getTime() : Date.now();
  const totalBreak = calcTotalBreakMs(breaks);
  return Math.max(0, end - start - totalBreak);
}

export function calcExitTime(punchIn: string, totalBreakMs: number, settings?: { startTime: string, endTime: string, breakHours: string }): string {
  if (!punchIn) return '';
  const start = new Date(punchIn).getTime();
  
  const startTimeStr = settings?.startTime || DEFAULT_START_TIME;
  const endTimeStr = settings?.endTime || DEFAULT_END_TIME;
  const allowedBreakHours = parseFloat(settings?.breakHours || DEFAULT_BREAK_HOURS.toString());

  const [sH, sM] = startTimeStr.split(":").map(Number);
  const [eH, eM] = endTimeStr.split(":").map(Number);
  
  let shiftDurationMs = (eH * 3600000 + eM * 60000) - (sH * 3600000 + sM * 60000);
  if (shiftDurationMs < 0) shiftDurationMs += 24 * 3600000;
  
  const allowedBreakMs = allowedBreakHours * 3600000;
  const excessBreakMs = Math.max(0, totalBreakMs - allowedBreakMs);
  const totalStayMs = shiftDurationMs + excessBreakMs;
  
  return new Date(start + totalStayMs).toISOString();
}

export function parseLocalToUTC(dateStr: string, timeStr: string, tz: string = DEFAULT_TIMEZONE): string | null {
  if (!dateStr || !timeStr) return null;
  const iso = `${dateStr}T${timeStr}:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** 
 * Returns { date: 'YYYY-MM-DD', time: 'HH:MM' } in local time
 */
export function formatInputDateTime(isoString: string): { date: string, time: string } {
  if (!isoString) return { date: '', time: '' };
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  
  return { date, time };
}
