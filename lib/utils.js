import { getTimezone, DEFAULT_TIMEZONE, getOfficeStartTime, getOfficeEndTime, getBreakHours } from "./config.js";

export function formatDuration(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
}

export function formatShortDuration(ms) {
  if (!ms || ms < 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTime(isoString) {
  if (!isoString) return '--:--';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: getTimezone()
  });
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const tz = getTimezone();

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: tz });
  const dStr = d.toLocaleDateString('en-CA', { timeZone: tz });

  if (dStr === todayStr) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: tz });

  if (dStr === yesterdayStr) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: tz
  });
}

export function calcTotalBreakMs(breaks) {
  return breaks.reduce((acc, b) => {
    if (!b.break_start || b.is_ignored) return acc;
    const start = new Date(b.break_start).getTime();
    const end = b.break_end ? new Date(b.break_end).getTime() : Date.now();
    return acc + (end - start);
  }, 0);
}

export function calcGrossSessionDurationMs(session) {
  if (!session?.punch_in_time) return 0;
  const start = new Date(session.punch_in_time).getTime();
  const end = session.punch_out_time ? new Date(session.punch_out_time).getTime() : Date.now();
  return Math.max(0, end - start);
}

export function calcSessionDurationMs(session, breaks = []) {
  if (!session?.punch_in_time) return 0;
  const start = new Date(session.punch_in_time).getTime();
  const end = session.punch_out_time ? new Date(session.punch_out_time).getTime() : Date.now();
  const totalBreak = calcTotalBreakMs(breaks);
  return Math.max(0, end - start - totalBreak);
}

export function getTZOffset(timeZone = getTimezone()) {
  const now = new Date();
  const options = { timeZone, timeZoneName: 'shortOffset' };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value;
  // offsetPart is "GMT+5:30" or "GMT-04:00" or "GMT"
  if (!offsetPart || offsetPart === 'GMT') return '+00:00';
  const res = offsetPart.replace('GMT', '');
  const sign = res.startsWith('-') ? '-' : '+';
  const timeOnly = res.replace(/[+-]/, '');
  if (timeOnly.includes(':')) {
    const [h, m] = timeOnly.split(':');
    return `${sign}${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  } else {
    return `${sign}${timeOnly.padStart(2, '0')}:00`;
  }
}

export function parseLocalToUTC(dateStr, timeStr, timeZone = getTimezone()) {
  // dateStr is "YYYY-MM-DD", timeStr is "HH:MM" or "HH:MM:SS"
  if (!dateStr || !timeStr) return null;
  const offset = getTZOffset(timeZone);
  // Ensure timeStr has seconds for a consistent ISO-like format during parsing
  const fullTime = timeStr.includes(':') && timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr;
  const iso = `${dateStr}T${fullTime}${offset}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function calcNetWork(sessions) {
  return sessions.reduce((acc, s) => {
    if (!s.punch_out_time) return acc;
    const breaks = s.breaks || [];
    return acc + calcSessionDurationMs(s, breaks);
  }, 0);
}

export function calcExitTime(punchIn, totalBreakMs) {
  if (!punchIn) return null;
  const start = new Date(punchIn).getTime();
  
  const startTimeStr = getOfficeStartTime();
  const endTimeStr = getOfficeEndTime();
  const allowedBreakHours = getBreakHours();

  // Calculate standard stay duration from office hours
  const [sH, sM] = startTimeStr.split(":").map(Number);
  const [eH, eM] = endTimeStr.split(":").map(Number);
  
  let shiftDurationMs = (eH * 3600000 + eM * 60000) - (sH * 3600000 + sM * 60000);
  if (shiftDurationMs < 0) shiftDurationMs += 24 * 3600000; // Handle overnight shifts
  
  const allowedBreakMs = allowedBreakHours * 3600000;
  
  // Rule: Must be in office for the shift duration.
  // If actual breaks exceed allowed, total stay is extended.
  const excessBreakMs = Math.max(0, totalBreakMs - allowedBreakMs);
  const totalStayMs = shiftDurationMs + excessBreakMs;
  
  return new Date(start + totalStayMs).toISOString();
}
