"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import { formatTime, formatDate, formatShortDuration, calcSessionDurationMs, calcTotalBreakMs } from "../lib/utils.js";
import { Clock, Coffee } from "lucide-react";

function SessionRow({ session, isActive }) {
  const breaks = session.breaks || [];
  const finishedBreaks = breaks.filter(b => b.break_end);
  const breakMs = calcTotalBreakMs(finishedBreaks);
  const workedMs = session.punch_out_time ? calcSessionDurationMs(session, finishedBreaks) : null;

  return (
    <div className={`rounded-xl p-3.5 transition-colors ${
      isActive
        ? "bg-emerald-500/10 border border-emerald-500/20"
        : "bg-muted/40 border border-transparent hover:border-border/50"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-semibold font-display text-foreground">
              {formatDate(session.punch_in_time)}
            </span>
            {isActive && (
              <Badge variant="working" className="text-[10px] px-2 py-0.5">Active</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {formatTime(session.punch_in_time)}
            </span>
            {session.punch_out_time ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                {formatTime(session.punch_out_time)}
              </span>
            ) : (
              <span className="text-emerald-500 font-medium">ongoing</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          {workedMs !== null ? (
            <div className="font-mono text-sm font-bold text-foreground">
              {formatShortDuration(workedMs)}
            </div>
          ) : (
            <div className="font-mono text-sm font-bold text-emerald-400">—</div>
          )}
          {finishedBreaks.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1 justify-end">
              <Coffee className="h-2.5 w-2.5" />
              {finishedBreaks.length} · {formatShortDuration(breakMs)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SessionHistory({ sessions = [], activeSessionId }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      const key = formatDate(s.punch_in_time);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return Array.from(map.entries()).map(([date, daySessions]) => {
      const totalMs = daySessions.reduce((acc, session) => {
        const breaks = session.breaks || [];
        const finishedBreaks = breaks.filter(b => b.break_end);
        if (!session.punch_out_time) return acc;
        return acc + calcSessionDurationMs(session, finishedBreaks);
      }, 0);
      return { date, daySessions, totalMs };
    });
  }, [sessions]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display">Session History</CardTitle>
      </CardHeader>
      <CardContent>
        {grouped.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No sessions yet</p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ date, daySessions, totalMs }) => (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {date}
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    {formatShortDuration(totalMs)}
                  </p>
                </div>
                <div className="space-y-2">
                  {daySessions.map(s => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      isActive={s.id === activeSessionId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
