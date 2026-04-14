import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { calcSessionDurationMs } from '../lib/utils';
import { getWeeklyHolidays } from '../lib/config';

const SUCCESS_COLOR = 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)] text-emerald-50';
const FAILED_COLOR = 'bg-amber-500 hover:bg-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.2)] text-amber-50';
const HOLIDAY_COLOR = 'bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/50 text-sky-500/50 font-bold';

// Specific Leave Colors
const SICK_LEAVE_COLOR = 'bg-rose-500 hover:bg-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.3)] text-rose-50 font-bold border border-rose-400/50';
const CASUAL_LEAVE_COLOR = 'bg-sky-500 hover:bg-sky-600 shadow-[0_0_8px_rgba(14,165,233,0.3)] text-sky-50 font-bold border border-sky-400/50';
const OTHER_LEAVE_COLOR = 'bg-violet-500 hover:bg-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.3)] text-violet-50 font-bold border border-violet-400/50';
const WFH_LEAVE_COLOR = 'bg-indigo-500 hover:bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.3)] text-indigo-50 font-bold border border-indigo-400/50';

const EMPTY_COLOR = 'bg-muted/10 hover:bg-muted/20 text-muted-foreground/30';

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Calculates if a day met the 8h work and 9h stay criteria.
 */
function processDayData(day, sessions, weeklyHolidays, leaves) {
  const dayOfWeek = getDay(day).toString();
  const isWeeklyHoliday = weeklyHolidays.includes(dayOfWeek);
  
  const dateStr = format(day, "yyyy-MM-dd");
  const leave = leaves.find(l => isSameDay(new Date(l.leave_date), day));

  const daySessions = sessions.filter(s => {
    const punchIn = new Date(s.punch_in_time);
    return isSameDay(punchIn, day);
  });

  if (daySessions.length === 0) {
    if (leave) return { status: 'leave', leaveType: leave.leave_type, isWeeklyHoliday };
    return { 
      status: isWeeklyHoliday ? 'holiday' : 'empty', 
      netHours: 0, 
      grossHours: 0,
      isWeeklyHoliday
    };
  }

  // Total Net Multi-session calculation
  const totalNetMs = daySessions.reduce((acc, s) => {
    if (!s.punch_out_time) return acc;
    const breaks = s.breaks || [];
    const bMs = breaks.reduce((ba, b) => b.break_start && b.break_end ? ba + (new Date(b.break_end) - new Date(b.break_start)) : ba, 0);
    return acc + (new Date(s.punch_out_time) - new Date(s.punch_in_time) - bMs);
  }, 0);

  // Gross time: from first punch-in to last punch-out of the day
  const punchIns = daySessions.map(s => new Date(s.punch_in_time).getTime());
  const punchOuts = daySessions
    .map(s => s.punch_out_time ? new Date(s.punch_out_time).getTime() : Date.now());
  
  const minIn = Math.min(...punchIns);
  const maxOut = Math.max(...punchOuts);
  const totalGrossMs = maxOut - minIn;

  const netHours = totalNetMs / 3600000;
  const grossHours = totalGrossMs / 3600000;

  // success condition: 8h net AND 9h gross
  const success = netHours >= 8 && grossHours >= 9;

  return {
    status: leave ? 'leave' : (success ? 'success' : 'failed'),
    leaveType: leave?.leave_type,
    netHours,
    grossHours,
    sessionCount: daySessions.length,
    isWeeklyHoliday
  };
}

export function MonthlyHeatmap({ monthDate, sessions, leaves = [], onClickDay }) {
  const weeklyHolidays = useMemo(() => getWeeklyHolidays(), []);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  
  // Padding days at the start (Sunday start)
  const startDayPadding = getDay(monthStart);
  const paddingArray = Array(startDayPadding).fill(null);
  
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const stats = useMemo(() => {
    return daysInMonth.map(day => ({
      day,
      ...processDayData(day, sessions, weeklyHolidays, leaves)
    }));
  }, [daysInMonth, sessions, weeklyHolidays, leaves]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-3xl bg-card/40 border border-border/40 shadow-sm backdrop-blur-sm">
        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2.5">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-[10px] font-bold text-muted-foreground/40 text-center uppercase tracking-tighter">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {paddingArray.map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square bg-transparent" />
          ))}
          
          {stats.map(({ day, status, netHours, grossHours, sessionCount, leaveType }, idx) => {
            const isToday = isSameDay(day, new Date());
            let colorClass = EMPTY_COLOR;
            if (status === 'success') colorClass = SUCCESS_COLOR;
            else if (status === 'failed') colorClass = FAILED_COLOR;
            else if (status === 'holiday') colorClass = HOLIDAY_COLOR;
            else if (status === 'leave') {
                if (leaveType === 'sick') colorClass = SICK_LEAVE_COLOR;
                else if (leaveType === 'casual') colorClass = CASUAL_LEAVE_COLOR;
                else if (leaveType === 'wfh') colorClass = WFH_LEAVE_COLOR;
                else colorClass = OTHER_LEAVE_COLOR;
            }

            const leaveObj = leaves.find(l => isSameDay(new Date(l.leave_date), day));
            const leaveDisplayName = leaveObj?.notes || (status === 'leave' ? `${leaveType.charAt(0).toUpperCase() + leaveType.slice(1)} Leave` : '');

            const title = status === 'holiday' 
                ? `${format(day, 'MMM d')}: Weekly Holiday`
                : status === 'leave'
                ? `${format(day, 'MMM d')}: ${leaveDisplayName}`
                : `${format(day, 'MMM d')}: ${netHours?.toFixed(1) || 0}h work, ${grossHours?.toFixed(1) || 0}h stay (${sessionCount || 0} sessions)`;

            return (
              <div
                key={idx}
                onClick={() => onClickDay && onClickDay(day)}
                title={title}
                className={`
                  aspect-square rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-center text-[10px] sm:text-sm font-bold font-mono
                  ${colorClass}
                  ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background z-10' : ''}
                  relative group hover:scale-[1.05] active:scale-95 active:duration-75
                `}
              >
                 {format(day, 'd')}
                 {status === 'holiday' && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-sky-400 opacity-60" title="Holiday" />
                 )}
                 {(sessionCount > 0 && status !== 'leave') && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {Array(Math.min(3, sessionCount)).fill(0).map((_, i) => (
                            <div key={i} className="w-0.5 h-0.5 rounded-full bg-current opacity-40 shadow-[0_0_2px_rgba(255,255,255,0.4)]" />
                        ))}
                    </div>
                 )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
