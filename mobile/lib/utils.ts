export function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function calcSessionDurationMs(session: any, breaks: any[] = []): number {
  if (!session) return 0;
  const start = new Date(session.punch_in_time).getTime();
  const end = session.punch_out_time ? new Date(session.punch_out_time).getTime() : Date.now();
  
  let duration = end - start;
  
  // Subtract break time
  breaks.forEach(b => {
    if (b.break_start) {
      const bStart = new Date(b.break_start).getTime();
      const bEnd = b.break_end ? new Date(b.break_end).getTime() : Date.now();
      duration -= (bEnd - bStart);
    }
  });
  
  return Math.max(0, duration);
}
