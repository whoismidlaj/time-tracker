import { useState, useEffect } from "react";
import { Badge } from "./ui/badge.jsx";
import { formatDuration, formatShortDuration, calcTotalBreakMs, calcSessionDurationMs } from "../lib/utils.js";
import { MessageSquare, Save, Loader2 } from "lucide-react";

export function StatusCard({ status, session, activeBreak, breaks = [], elapsed, onRefresh }) {
  const [notes, setNotes] = useState(session?.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(session?.notes || "");
  }, [session?.id, session?.notes]);

  const isWorking = status === "working";
  const isBreak = status === "break";
  const isOff = status === "off";

  const breakMs = isBreak && activeBreak
    ? Date.now() - new Date(activeBreak.break_start).getTime()
    : 0;

  async function handleSaveNotes() {
    if (!session || notes === (session.notes || "")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/session/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const statusConfig = {
    working: { label: "Working", variant: "working", dot: "bg-emerald-400", ring: "ring-emerald-400/30" },
    break: { label: "On Break", variant: "break", dot: "bg-amber-400", ring: "ring-amber-400/30" },
    off: { label: "Off", variant: "off", dot: "bg-slate-400", ring: "ring-slate-400/30" },
  };

  const config = statusConfig[status] || statusConfig.off;

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 shadow-sm ${
      isWorking ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/50" :
      isBreak ? "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/50" :
      "bg-card border-border/50 shadow-inner"
    }`}>
      {/* Ambient glow */}
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity duration-500 ${
        isWorking ? "bg-emerald-400" : isBreak ? "bg-amber-400" : "bg-slate-400/20"
      }`} />

      <div className="relative">
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
            <Badge variant={config.variant} className="text-[10px] font-bold tracking-wider uppercase">
              {config.label}
            </Badge>
          </div>
          {session && (
            <span className="text-[10px] text-muted-foreground/60 font-mono font-medium">
              ID: {String(session.id).padStart(4, "0")}
            </span>
          )}
        </div>

        <div className="mb-1">
          <div className={`font-mono text-5xl font-bold tracking-tight tabular-nums leading-none ${
            isOff ? "text-muted-foreground/30" : "text-foreground"
          }`}>
            {isOff ? (
              <span>--:--:--</span>
            ) : (
              formatDuration(elapsed)
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-3 uppercase tracking-[0.15em] leading-none">
            {isOff ? "Status: Inactive" : isBreak ? "Session Net Work Time" : "Active Session Time"}
          </p>
        </div>

        {/* Notes Input */}
        {!isOff && session && (
          <div className="mt-6 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Session Notes
              </label>
              {saving && <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />}
            </div>
            <textarea
              placeholder="What are you working on right now?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              className="w-full bg-background/50 border border-border/40 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none min-h-[60px]"
            />
          </div>
        )}

        {isBreak && (
          <div className="mt-5 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Current Break</span>
              <span className="font-mono text-lg font-bold text-amber-500 dark:text-amber-400">
                {formatDuration(breakMs)}
              </span>
            </div>
          </div>
        )}

        {!isOff && (
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/20">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Breaks logged
            </span>
            <span className="text-[10px] text-foreground/70 font-mono font-bold">
              {breaks.filter(b => b.break_end).length} pts · {formatShortDuration(calcTotalBreakMs(breaks.filter(b => b.break_end)))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
