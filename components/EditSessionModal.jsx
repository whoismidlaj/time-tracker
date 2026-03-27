"use client";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Calendar, Clock, Loader2, Save, Trash2, Coffee } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { toast } from "../lib/use-toast.js";
import { parseLocalToUTC } from "../lib/utils.js";
import { getTimezone } from "../lib/config.js";

export function EditSessionModal({ session: initialSession, open, onOpenChange, onRefresh }) {
  const [punchIn, setPunchIn] = useState("");
  const [punchOut, setPunchOut] = useState("");
  const [notes, setNotes] = useState("");
  const [breaks, setBreaks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!initialSession;

  useEffect(() => {
    const tz = getTimezone();
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz };
    
    const formatTZ = (date) => {
      if (!date) return "";
      try {
        const d = new Date(date);
        const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(d);
        const y = parts.find(p => p.type === 'year').value;
        const m = parts.find(p => p.type === 'month').value;
        const d_day = parts.find(p => p.type === 'day').value;
        const h = parts.find(p => p.type === 'hour').value;
        const min = parts.find(p => p.type === 'minute').value;
        return `${y}-${m}-${d_day}T${h}:${min}`;
      } catch (e) {
        return "";
      }
    };

    if (initialSession) {
      setPunchIn(formatTZ(initialSession.punch_in_time));
      setPunchOut(formatTZ(initialSession.punch_out_time));
      setNotes(initialSession.notes || "");
      setBreaks((initialSession.breaks || []).map(b => {
        const start = b.break_start ? formatTZ(b.break_start) : "";
        const end = b.break_end ? formatTZ(b.break_end) : "";
        return {
          ...b,
          break_start: start.split("T")[1] || "",
          break_end: end.split("T")[1] || ""
        };
      }));
    } else {
      const now = new Date();
      setPunchIn(formatTZ(now));
      setPunchOut("");
      setNotes("");
      setBreaks([]);
    }
  }, [initialSession, open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const tz = getTimezone();
      const formatToUTC = (val, dateRef = punchIn) => {
        if (!val) return null;
        let d, t;
        if (val.includes("T")) {
          [d, t] = val.split("T");
        } else {
          [d] = dateRef.split("T");
          t = val;
        }
        return parseLocalToUTC(d, t, tz);
      };

      const startUTC = formatToUTC(punchIn);
      const endUTC = formatToUTC(punchOut);

      // Validation
      const startMs = new Date(startUTC).getTime();
      const endMs = endUTC ? new Date(endUTC).getTime() : Infinity;

      if (endUTC && startMs >= endMs) {
        throw new Error("Punch out must be after punch in");
      }

      const processedBreaks = breaks.map(b => {
        const bStartUTC = formatToUTC(b.break_start);
        const bEndUTC = formatToUTC(b.break_end);
        
        let bStartMs = null;
        let bEndMs = null;
        
        if (bStartUTC) {
          bStartMs = new Date(bStartUTC).getTime();
          if (bStartMs < startMs || bStartMs > endMs) {
            throw new Error(`Break start (${b.break_start}) must be within session range`);
          }
        }
        if (bEndUTC) {
          bEndMs = new Date(bEndUTC).getTime();
          if (bEndMs < startMs || bEndMs > endMs) {
            throw new Error(`Break end (${b.break_end}) must be within session range`);
          }
          if (bStartUTC && bStartMs > bEndMs) {
             throw new Error(`Break end must be after break start`);
          }
        }

        return {
          break_start: bStartUTC,
          break_end: bEndUTC
        };
      });

      const url = isEdit ? `/api/session/${initialSession.id}` : "/api/session";
      const method = isEdit ? "PATCH" : "POST";
      const body = {
        punch_in_time: startUTC,
        punch_out_time: endUTC,
        notes,
        breaks: processedBreaks
      };

      if (!isEdit) {
        body.action = "manual_entry";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save session");
      
      toast({ title: "Success", description: isEdit ? "Session updated" : "Session added", variant: "success" });
      onRefresh();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this session?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/session/${initialSession.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Deleted", description: "Session has been removed" });
      onRefresh();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[70] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold font-display">
              {isEdit ? "Edit Session" : "Manual Entry"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1.5 hover:bg-accent text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Punch In
                </label>
                <input
                  type="datetime-local"
                  value={punchIn}
                  onChange={(e) => setPunchIn(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-border/60 bg-muted/20 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Punch Out
                </label>
                <input
                  type="datetime-local"
                  value={punchOut}
                  onChange={(e) => setPunchOut(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border/60 bg-muted/20 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  Notes / Description
                </label>
                <textarea
                  placeholder="What did you work on?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                />
              </div>

              {/* Breaks Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Coffee className="h-3 w-3" /> Breaks
                  </label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-[9px] px-2 rounded-lg"
                    onClick={() => {
                      const now = new Date();
                      const h = String(now.getHours()).padStart(2, '0');
                      const m = String(now.getMinutes()).padStart(2, '0');
                      const nowTime = `${h}:${m}`;
                      setBreaks([...breaks, { break_start: nowTime, break_end: "" }]);
                    }}
                  >
                    Add Break
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {breaks.map((brk, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/40 group">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <div className="space-y-0.5">
                           <p className="text-[8px] text-muted-foreground uppercase font-bold ml-1">Start</p>
                           <input
                            type="time"
                            value={brk.break_start || ""}
                            onChange={(e) => {
                              const newBreaks = [...breaks];
                              newBreaks[idx].break_start = e.target.value;
                              setBreaks(newBreaks);
                            }}
                            className="bg-background border border-border/40 rounded px-1.5 py-0.5 text-[10px] font-bold outline-none w-full"
                          />
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-[8px] text-muted-foreground uppercase font-bold ml-1">End</p>
                           <input
                            type="time"
                            value={brk.break_end || ""}
                            onChange={(e) => {
                              const newBreaks = [...breaks];
                              newBreaks[idx].break_end = e.target.value;
                              setBreaks(newBreaks);
                            }}
                            className="bg-background border border-border/40 rounded px-1.5 py-0.5 text-[10px] font-bold outline-none w-full"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBreaks(breaks.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {breaks.length === 0 && (
                    <p className="text-[10px] text-center text-muted-foreground py-2 italic border border-dashed border-border/40 rounded-lg">
                      No breaks recorded
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {isEdit && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleting || loading}
                  className="px-3 rounded-xl h-11"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
              <Button type="submit" className="flex-1 rounded-xl text-xs font-bold h-11 gap-2 shadow-lg shadow-primary/20" disabled={loading || deleting}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEdit ? "Save Changes" : "Create Session"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
