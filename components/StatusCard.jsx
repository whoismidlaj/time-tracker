"use client";
import { Badge } from "./ui/badge.jsx";
import { formatDuration, formatShortDuration, calcTotalBreakMs, calcSessionDurationMs } from "../lib/utils.js";

export function StatusCard({ status, session, activeBreak, breaks = [], elapsed }) {
  const isWorking = status === "working";
  const isBreak = status === "break";
  const isOff = status === "off";

  const breakMs = isBreak && activeBreak
    ? Date.now() - new Date(activeBreak.break_start).getTime()
    : 0;

  const statusConfig = {
    working: { label: "Working", variant: "working", dot: "bg-emerald-400", ring: "ring-emerald-400/30" },
    break: { label: "On Break", variant: "break", dot: "bg-amber-400", ring: "ring-amber-400/30" },
    off: { label: "Off", variant: "off", dot: "bg-slate-400", ring: "ring-slate-400/30" },
  };

  const config = statusConfig[status] || statusConfig.off;

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${
      isWorking ? "bg-gradient-to-br from-emerald-950 to-emerald-900 border border-emerald-800/50" :
      isBreak ? "bg-gradient-to-br from-amber-950 to-amber-900 border border-amber-800/50" :
      "bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50"
    }`}>
      {/* Ambient glow */}
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 ${
        isWorking ? "bg-emerald-400" : isBreak ? "bg-amber-400" : "bg-slate-400"
      }`} />

      <div className="relative">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`relative flex h-3 w-3`}>
              {(isWorking || isBreak) && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isWorking ? "bg-emerald-400" : "bg-amber-400"
                }`} />
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${config.dot}`} />
            </div>
            <Badge variant={config.variant} className="text-xs font-bold tracking-wide uppercase">
              {config.label}
            </Badge>
          </div>
          {session && (
            <span className="text-xs text-white/40 font-mono">
              #{String(session.id).padStart(4, "0")}
            </span>
          )}
        </div>

        {/* Main timer */}
        <div className="mb-1">
          <div className="font-mono text-5xl font-bold text-white tracking-tight tabular-nums leading-none">
            {isOff ? (
              <span className="text-slate-500">--:--:--</span>
            ) : (
              formatDuration(elapsed)
            )}
          </div>
          <p className="text-xs text-white/40 mt-2 font-medium uppercase tracking-widest">
            {isOff ? "Not clocked in" : isBreak ? "Net work time" : "Session time"}
          </p>
        </div>

        {/* Break sub-timer */}
        {isBreak && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-300/60 uppercase tracking-widest font-medium">Break duration</span>
              <span className="font-mono text-lg font-bold text-amber-300">
                {formatDuration(breakMs)}
              </span>
            </div>
          </div>
        )}

        {/* Today's breaks summary */}
        {!isOff && breaks.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-white/30 uppercase tracking-widest font-medium">
              Breaks today
            </span>
            <span className="text-xs text-white/60 font-mono font-semibold">
              {breaks.filter(b => b.break_end).length} · {formatShortDuration(calcTotalBreakMs(breaks.filter(b => b.break_end)))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
