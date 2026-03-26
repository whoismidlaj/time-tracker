"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Clock, Coffee, Pencil, Calendar, ArrowRight } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { formatTime, formatDate, formatShortDuration, calcSessionDurationMs, calcTotalBreakMs } from "../lib/utils.js";

export function SessionDetailModal({ session, open, onOpenChange, onEdit }) {
  if (!session) return null;

  const breaks = session.breaks || [];
  const totalBreakMs = calcTotalBreakMs(breaks);
  const workedMs = session.punch_out_time ? calcSessionDurationMs(session, breaks) : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[70] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold font-display flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Session Details
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1.5 hover:bg-accent text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3 text-emerald-500" /> Punch In
                </p>
                <p className="text-sm font-bold font-mono">{formatTime(session.punch_in_time)}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(session.punch_in_time)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3 text-red-500" /> Punch Out
                </p>
                <p className="text-sm font-bold font-mono">
                  {session.punch_out_time ? formatTime(session.punch_out_time) : "Ongoing"}
                </p>
                {session.punch_out_time && (
                  <p className="text-[10px] text-muted-foreground">{formatDate(session.punch_out_time)}</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Worked</p>
                <p className="text-xl font-bold font-mono text-emerald-500">
                  {workedMs !== null ? formatShortDuration(workedMs) : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Break Time</p>
                <p className="text-xl font-bold font-mono text-amber-500">
                  {formatShortDuration(totalBreakMs)}
                </p>
              </div>
            </div>

            {session.notes && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notes</p>
                <p className="text-xs text-foreground/80 leading-relaxed italic border-l-2 border-primary/20 pl-3">
                  "{session.notes}"
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Coffee className="h-3 w-3" /> Break Sessions ({breaks.length})
              </p>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {breaks.map((brk, idx) => {
                  const start = new Date(brk.break_start);
                  const end = brk.break_end ? new Date(brk.break_end) : null;
                  const duration = end ? end.getTime() - start.getTime() : null;

                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background shadow-sm">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-mono text-foreground/70">{formatTime(brk.break_start)}</span>
                         <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                         <span className="text-[10px] font-mono text-foreground/70">
                          {brk.break_end ? formatTime(brk.break_end) : "Active"}
                         </span>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        {duration !== null ? formatShortDuration(duration) : "..."}
                      </span>
                    </div>
                  );
                })}
                {breaks.length === 0 && (
                  <p className="text-[10px] text-center text-muted-foreground py-3 italic border border-dashed border-border/40 rounded-lg bg-muted/5">
                    No breaks recorded in this session
                  </p>
                )}
              </div>
            </div>

            <Button 
              onClick={() => { onOpenChange(false); onEdit(session); }}
              className="w-full mt-2 rounded-xl h-11 font-bold text-xs gap-2 shadow-lg shadow-primary/20"
            >
              <Pencil className="h-4 w-4" /> Edit Session
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
