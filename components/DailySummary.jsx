"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.jsx";
import { formatShortDuration, calcTotalBreakMs, calcSessionDurationMs, calcGrossSessionDurationMs } from "../lib/utils.js";
import { getTimezone } from "../lib/config.js";
import { Clock, Coffee, TrendingUp } from "lucide-react";

export function DailySummary({ todaySessions = [], activeSession = null, activeSessionBreaks = [], activeBreak = null, activeElapsed = 0 }) {
  const stats = useMemo(() => {
    let totalWorked = 0;
    let totalBreak = 0;
    let totalGross = 0;

    // Filter out active session from historical list to avoid double counting
    const historicalSessions = todaySessions.filter(s => s.id !== activeSession?.id);

    for (const s of historicalSessions) {
      const breaks = s.breaks || [];
      totalBreak += calcTotalBreakMs(breaks.filter(b => b.break_end));
      if (s.punch_out_time) {
        totalWorked += calcSessionDurationMs(s, breaks);
        totalGross += calcGrossSessionDurationMs(s);
      }
    }

    // Add active session if it exists and started today
    const tz = getTimezone();
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const startedTodayStr = activeSession?.punch_in_time 
      ? new Date(activeSession.punch_in_time).toLocaleDateString('en-CA', { timeZone: tz })
      : null;

    if (activeSession && startedTodayStr === todayStr) {
      totalWorked += activeElapsed;
      totalBreak += calcTotalBreakMs(activeSessionBreaks);
      totalGross += calcGrossSessionDurationMs(activeSession);
    }

    return { totalWorked, totalBreak, net: totalGross };
  }, [todaySessions, activeSession, activeBreak, activeElapsed]);

  const items = [
    {
      label: "Worked",
      value: formatShortDuration(stats.totalWorked),
      icon: Clock,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Breaks",
      value: formatShortDuration(stats.totalBreak),
      icon: Coffee,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Net",
      value: formatShortDuration(stats.net),
      icon: TrendingUp,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display">Today&apos;s Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {items.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl p-3 ${bg} flex flex-col gap-2`}>
              <div className={`${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className={`font-mono text-lg font-bold ${color} leading-none`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">{label}</div>
              </div>
            </div>
          ))}
        </div>
        {todaySessions.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">No sessions today</p>
        )}
      </CardContent>
    </Card>
  );
}
