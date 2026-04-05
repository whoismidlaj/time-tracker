import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { Card, CardContent } from "./ui/card.jsx";
import { Clock, Target, ArrowRight, Coffee, LogIn, LogOut } from "lucide-react";
import { formatShortDuration } from "../lib/utils";
import { getWeeklyHolidays } from '../lib/config';

function parseTime(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
}

function formatMinutes(totalMinutes) {
    if (isNaN(totalMinutes)) return "--:--";
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

export function MonthlyReportCard({ monthDate, sessions, leaves = [] }) {
  const weeklyHolidays = useMemo(() => getWeeklyHolidays(), []);
  
  const stats = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    let totalNetMs = 0;
    let totalGrossMs = 0;
    let successDays = 0;
    let workingDays = 0;
    let punchInMinutes = [];
    let punchOutMinutes = [];
    let totalBreakMs = 0;
    let sessionsCount = 0;

    days.forEach(day => {
        const dayOfWeek = getDay(day).toString();
        const isHoliday = weeklyHolidays.includes(dayOfWeek);
        
        const dateStr = format(day, "yyyy-MM-dd");
        const isLeave = leaves.some(l => l.leave_date.startsWith(dateStr));
        
        const daySessions = sessions.filter(s => isSameDay(new Date(s.punch_in_time), day));
        
        // Only count as a working day if it's not a weekend AND not a leave day
        if (!isHoliday && !isLeave) workingDays++;
        
        if (daySessions.length > 0) {
            sessionsCount += daySessions.length;
            
            // Net work
            const dayNetMs = daySessions.reduce((acc, s) => {
                if (!s.punch_out_time) return acc;
                const brks = s.breaks || [];
                const bMs = brks.reduce((ba, b) => {
                    if (!b.break_start || !b.break_end) return ba;
                    return ba + (new Date(b.break_end) - new Date(b.break_start));
                }, 0);
                totalBreakMs += bMs;
                return acc + (new Date(s.punch_out_time) - new Date(s.punch_in_time) - bMs);
            }, 0);
            totalNetMs += dayNetMs;

            // Gross stay
            const mins = daySessions.map(s => new Date(s.punch_in_time).getTime());
            const maxs = daySessions.map(s => s.punch_out_time ? new Date(s.punch_out_time).getTime() : Date.now());
            const dayGrossMs = Math.max(...maxs) - Math.min(...mins);
            totalGrossMs += dayGrossMs;

            // Punch times for average
            const firstIn = new Date(Math.min(...mins));
            punchInMinutes.push(firstIn.getHours() * 60 + firstIn.getMinutes());
            
            const lastOutRaw = Math.max(...maxs);
            const lastOut = new Date(lastOutRaw);
            punchOutMinutes.push(lastOut.getHours() * 60 + lastOut.getMinutes());

            // Success check
            if (dayNetMs >= 8 * 3600000 && dayGrossMs >= 9 * 3600000) {
                successDays++;
            }
        }
    });

    const avgIn = punchInMinutes.length ? punchInMinutes.reduce((a, b) => a + b, 0) / punchInMinutes.length : NaN;
    const avgOut = punchOutMinutes.length ? punchOutMinutes.reduce((a, b) => a + b, 0) / punchOutMinutes.length : NaN;

    return {
        totalNetMs,
        totalGrossMs,
        successRate: workingDays > 0 ? (successDays / workingDays) * 100 : 0,
        avgIn,
        avgOut,
        totalBreakMs,
        avgNetMs: punchInMinutes.length ? totalNetMs / punchInMinutes.length : 0,
        sessionsCount
    };
  }, [monthDate, sessions, weeklyHolidays, leaves]);

  return (
    <Card className="border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden border-dashed">
      <CardContent className="p-4 space-y-4">
        {/* Top Header Stats */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-3 w-3 text-emerald-500" /> Success Rate
                </p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-display font-bold text-foreground">{Math.round(stats.successRate)}%</span>
                    <span className="text-[10px] text-muted-foreground font-medium">consistency</span>
                </div>
            </div>
            <div className="space-y-1 text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider justify-end flex items-center gap-1.5">
                    Total Effort <Clock className="h-3 w-3 text-primary" />
                </p>
                <div className="flex items-baseline justify-end gap-1">
                    <span className="text-lg font-mono font-bold text-foreground">{Math.round(stats.totalNetMs / 3600000)}h</span>
                    <span className="text-[10px] text-muted-foreground font-medium">worked</span>
                </div>
            </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

        {/* Detailed Metrics */}
        <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-muted/20 border border-border/20 flex flex-col items-center">
                <LogIn className="h-3 w-3 text-emerald-500/70 mb-1" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Avg In</span>
                <span className="text-[10px] font-mono font-bold">{formatMinutes(stats.avgIn)}</span>
            </div>
            <div className="p-2 rounded-xl bg-muted/20 border border-border/20 flex flex-col items-center">
                <LogOut className="h-3 w-3 text-amber-500/70 mb-1" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Avg Out</span>
                <span className="text-[10px] font-mono font-bold">{formatMinutes(stats.avgOut)}</span>
            </div>
            <div className="p-2 rounded-xl bg-muted/20 border border-border/20 flex flex-col items-center">
                <Coffee className="h-3 w-3 text-primary/70 mb-1" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Breaks</span>
                <span className="text-[10px] font-mono font-bold">{formatShortDuration(stats.totalBreakMs)}</span>
            </div>
        </div>

        <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-4">
                <div className="text-[9px] text-muted-foreground font-medium">
                    <span className="text-foreground font-bold">{stats.sessionsCount}</span> sessions
                </div>
                <div className="text-[9px] text-muted-foreground font-medium">
                    Avg <span className="text-foreground font-bold">{formatShortDuration(stats.avgNetMs)}</span>/day
                </div>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
        </div>
      </CardContent>
    </Card>
  );
}
