"use client";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Calendar, Clock, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { toast } from "../lib/use-toast.js";

export function EditSessionModal({ session: initialSession, open, onOpenChange, onRefresh }) {
  const [punchIn, setPunchIn] = useState("");
  const [punchOut, setPunchOut] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!initialSession;

  useEffect(() => {
    if (initialSession) {
      setPunchIn(initialSession.punch_in_time ? initialSession.punch_in_time.slice(0, 16) : "");
      setPunchOut(initialSession.punch_out_time ? initialSession.punch_out_time.slice(0, 16) : "");
      setNotes(initialSession.notes || "");
    } else {
      setPunchIn(new Date().toISOString().slice(0, 16));
      setPunchOut("");
      setNotes("");
    }
  }, [initialSession, open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEdit ? `/api/session/${initialSession.id}` : "/api/session";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit 
        ? { punch_in_time: new Date(punchIn).toISOString(), punch_out_time: punchOut ? new Date(punchOut).toISOString() : null, notes }
        : { action: "manual_entry", punch_in_time: new Date(punchIn).toISOString(), punch_out_time: punchOut ? new Date(punchOut).toISOString() : null, notes };

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
                  rows={3}
                  className="w-full rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                />
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
