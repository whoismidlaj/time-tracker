import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Calendar, Clock, Coffee, Plus, Trash2, Heart, User, Sparkles, AlertCircle, Home } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { formatShortDuration, formatTime } from "../lib/utils.js";

import { apiClient } from "../lib/api-client.js";

export function DayDetailsModal({ isOpen, onClose, day, sessions, leave, onLeaveToggle }) {
  const daySessions = sessions.filter(s => isSameDay(new Date(s.punch_in_time), day));
  const [loading, setLoading] = useState(false);
  const [customNotes, setCustomNotes] = useState(leave?.notes || "");

  useEffect(() => {
    if (isOpen) {
        setCustomNotes(leave?.notes || "");
    }
  }, [isOpen, leave]);

  const handleLeaveSelect = async (type) => {
    if (loading) return;
    setLoading(true);
    try {
      const dateStr = format(day, "yyyy-MM-dd");
      const isRemoving = type === leave?.leave_type;
      
      const res = await apiClient("/leaves", {
        method: "POST",
        body: JSON.stringify({ 
            date: dateStr, 
            type: isRemoving ? null : type,
            notes: (type === 'other' && !isRemoving) ? customNotes : (isRemoving ? null : null)
        })
      });
      if (res.ok) {
        onLeaveToggle();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomNotes = async () => {
    if (!leave || leave.leave_type !== 'other' || customNotes === leave.notes) return;
    setLoading(true);
    try {
      const dateStr = format(day, "yyyy-MM-dd");
      const res = await apiClient("/leaves", {
        method: "POST",
        body: JSON.stringify({ 
          date: dateStr, 
          type: 'other', 
          notes: customNotes 
        })
      });
      if (res.ok) {
        onLeaveToggle();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const leaveTypes = [
    { id: "sick", label: "Sick Leave", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
    { id: "casual", label: "Casual Leave", icon: User, color: "text-sky-500", bg: "bg-sky-500/10" },
    { id: "wfh", label: "Work From Home", icon: Home, color: "text-teal-500", bg: "bg-teal-500/10" },
    { id: "other", label: "Other Leave", icon: Sparkles, color: "text-violet-500", bg: "bg-violet-500/10" },
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-[340px] translate-x-[-50%] translate-y-[-50%] rounded-3xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-0.5">
                <Dialog.Title className="text-sm font-bold font-display flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(day, "EEEE, MMMM do")}
                </Dialog.Title>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Daily Archives</p>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-full p-2 hover:bg-accent text-muted-foreground transition-colors group">
                <X className="h-4 w-4 group-hover:rotate-90 transition-transform" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-1 custom-scrollbar">
            {/* Sessions List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-2.5 w-2.5" /> Tracked Sessions
                </h4>
                <span className="text-[10px] font-mono font-bold text-primary/60">{daySessions.length} total</span>
              </div>
              
              {daySessions.length === 0 ? (
                <div className="py-8 rounded-2xl border border-dashed border-border/60 flex flex-col items-center justify-center opacity-40">
                    <AlertCircle className="h-6 w-6 mb-2" />
                    <span className="text-[10px] font-bold">No sessions found</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {daySessions.map((s, i) => {
                    const duration = s.punch_out_time ? new Date(s.punch_out_time) - new Date(s.punch_in_time) : 0;
                    return (
                        <div key={s.id} className="p-3 rounded-2xl bg-muted/30 border border-border/40 group hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-[11px] font-mono font-bold flex items-center gap-1.5">
                                    <span className="text-emerald-500">{formatTime(s.punch_in_time)}</span>
                                    <span className="opacity-20">→</span>
                                    <span className={s.punch_out_time ? "text-amber-500" : "text-primary animate-pulse"}>
                                        {s.punch_out_time ? formatTime(s.punch_out_time) : "Live"}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground">{formatShortDuration(duration)}</span>
                            </div>
                            {s.notes && (
                                <p className="text-[9px] text-muted-foreground italic line-clamp-1 border-t border-border/20 pt-1 mt-1 opacity-60">
                                    {s.notes}
                                </p>
                            )}
                        </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Leave Management */}
            <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Mark Absence / Leave</h4>
                <div className="grid grid-cols-4 gap-2">
                    {leaveTypes.map((t) => (
                        <button
                            key={t.id}
                            disabled={loading}
                            onClick={() => handleLeaveSelect(t.id)}
                            className={`
                                flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all active:scale-95
                                ${leave?.leave_type === t.id 
                                    ? `border-current ${t.bg} shadow-sm` 
                                    : "border-border/40 bg-muted/20 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 hover:border-border"
                                }
                            `}
                        >
                            <t.icon className={`h-4 w-4 ${t.color}`} />
                            <span className="text-[9px] font-bold text-foreground leading-tight">{t.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                {leave?.leave_type === 'other' && (
                    <div className="pt-2 animate-in slide-in-from-top-1 duration-300">
                        <div className="relative group/input">
                            <input
                                autoFocus
                                type="text"
                                value={customNotes}
                                onChange={(e) => setCustomNotes(e.target.value)}
                                onBlur={handleSaveCustomNotes}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomNotes()}
                                placeholder="Name this leave (e.g. Vacation)"
                                className="w-full bg-muted/40 border border-border/40 rounded-xl px-3 py-2 text-[10px] sm:text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:opacity-50 transition-all"
                            />
                            {loading && leave?.leave_type === 'other' && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <p className="text-[9px] text-center text-muted-foreground/40 italic">Leaves are excluded from consistency alerts.</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
