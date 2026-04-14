import { useState, useEffect } from "react";
import { Badge } from "./ui/badge.jsx";
import * as Dialog from "@radix-ui/react-dialog";
import { formatDuration, formatShortDuration, formatTime, formatTimeString, calcTotalBreakMs, calcSessionDurationMs, parseLocalToUTC, calcExitTime } from "../lib/utils.js";
import { getTimezone, getOfficeStartTime, getOfficeEndTime, getBreakHours } from "../lib/config.js";
import { MessageSquare, Save, Loader2, Pencil, Check, X, LogOut, Clock as ClockIcon } from "lucide-react";
import { apiClient } from "../lib/api-client.js";

export function StatusCard({ status, session, activeBreak, breaks = [], elapsed, onRefresh }) {
  const [notes, setNotes] = useState(session?.notes || "");
  const [saving, setSaving] = useState(false);
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [tempStartTime, setTempStartTime] = useState("");

  useEffect(() => {
    setNotes(session?.notes || "");
  }, [session?.id, session?.notes]);

  useEffect(() => {
    if (session?.punch_in_time) {
      const tz = getTimezone();
      const options = { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false, 
        timeZone: tz 
      };
      const timeStr = new Date(session.punch_in_time).toLocaleTimeString('en-US', options);
      setTempStartTime(timeStr);
    }
  }, [session?.punch_in_time, isEditingStart]);

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
      const res = await apiClient(`/session/${session.id}`, {
        method: "PATCH",
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

  async function handleSaveStartTime() {
    if (!session || !tempStartTime) return;
    setSaving(true);
    try {
      const tz = getTimezone();
      const dateStr = new Date(session.punch_in_time).toLocaleDateString('en-CA', { timeZone: tz });
      const newUTC = parseLocalToUTC(dateStr, tempStartTime, tz);
      
      const res = await apiClient(`/session/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ punch_in_time: newUTC }),
      });
      if (!res.ok) throw new Error("Failed to update start time");
      setIsEditingStart(false);
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

  const totalBreakMs = calcTotalBreakMs(breaks);
  const exitTime = session ? calcExitTime(session.punch_in_time, totalBreakMs) : null;

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
          {session && !isOff && (
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-medium">
                <span className="font-mono">In: {formatTime(session.punch_in_time)}</span>
                
                <Dialog.Root open={isEditingStart} onOpenChange={setIsEditingStart}>
                  <Dialog.Trigger asChild>
                    <button 
                      className="p-1 hover:text-primary transition-colors hover:bg-primary/5 rounded-md"
                      title="Edit start time"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] animate-in fade-in" />
                    <Dialog.Content className="fixed left-[50%] top-[40%] z-[70] w-full max-w-[240px] translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-background p-5 shadow-2xl animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <Dialog.Title className="text-[11px] font-bold font-display uppercase tracking-wider flex items-center gap-2">
                          <ClockIcon className="h-3.5 w-3.5 text-primary" /> Edit Start Time
                        </Dialog.Title>
                        <Dialog.Close asChild>
                          <button className="rounded-full p-1 hover:bg-accent text-muted-foreground transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </Dialog.Close>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Time</label>
                            <span className="text-[9px] font-bold text-primary/60">{formatTimeString(tempStartTime)}</span>
                          </div>
                          <input
                            type="time"
                            value={tempStartTime}
                            onChange={(e) => setTempStartTime(e.target.value)}
                            className="w-full h-10 rounded-xl border border-border/60 bg-muted/20 px-3 text-sm font-bold font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Dialog.Close asChild>
                            <button className="flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-border hover:bg-muted transition-colors">
                              Cancel
                            </button>
                          </Dialog.Close>
                          <button 
                            onClick={handleSaveStartTime}
                            disabled={saving}
                            className="flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Save
                          </button>
                        </div>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            </div>
          )}
        </div>

        <div className="mb-1">
          <div className={`font-mono text-5xl font-bold tracking-tight tabular-nums leading-none ${
            isOff ? "text-muted-foreground/30" : "text-foreground"
          }`}>
            {isOff ? (
              <span>--:--:--</span>
            ) : isBreak ? (
              <span className="text-amber-500/80">{formatDuration(elapsed)}</span>
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
          <div className="mt-4 flex flex-col gap-3 pt-3 border-t border-border/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Breaks logged
              </span>
              <span className="text-[10px] text-foreground/70 font-mono font-bold">
                {breaks.filter(b => b.break_end).length} · {formatShortDuration(calcTotalBreakMs(breaks.filter(b => b.break_end)))}
              </span>
            </div>

            {exitTime && (
              <div className="flex items-center justify-between bg-primary/5 rounded-xl p-2.5 border border-primary/10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LogOut className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold leading-none mb-0.5">Estimated Exit</p>
                    <p className="text-xs font-bold text-foreground font-mono">{formatTime(exitTime)}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[8px] text-muted-foreground font-medium mb-0.5">Total Stay</p>
                   <p className="text-[10px] font-bold text-primary/80 font-mono">
                    {formatTimeString(getOfficeStartTime())} - {formatTimeString(getOfficeEndTime())} Rule
                   </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
