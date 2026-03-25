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
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function calcTotalBreakMs(breaks) {
  return breaks.reduce((acc, b) => {
    if (!b.break_start) return acc;
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
  const totalBreak = calcTotalBreakMs(breaks.filter(b => b.break_end));
  return Math.max(0, end - start - totalBreak);
}

export function calcNetWork(sessions) {
  return sessions.reduce((acc, s) => {
    if (!s.punch_out_time) return acc;
    const breaks = s.breaks || [];
    return acc + calcSessionDurationMs(s, breaks);
  }, 0);
}
