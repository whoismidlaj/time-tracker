"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.jsx";
import { formatShortDuration, calcTotalBreakMs, calcSessionDurationMs } from "../lib/utils.js";
import { Clock, Coffee, TrendingUp } from "lucide-react";

export function DailySummary({ todaySessions = [] }) {
  const stats = useMemo(() => {
    let totalWorked = 0;
    let totalBreak = 0;

    for (const s of todaySessions) {
      const breaks = s.breaks || [];
      totalBreak += calcTotalBreakMs(breaks.filter(b => b.break_end));
      if (s.punch_out_time) {
        totalWorked += calcSessionDurationMs(s, breaks);
      }
    }

    return { totalWorked, totalBreak, net: totalWorked };
  }, [todaySessions]);

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
