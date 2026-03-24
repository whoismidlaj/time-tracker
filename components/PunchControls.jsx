"use client";
import { useState } from "react";
import { Button } from "./ui/button.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "./ui/dialog.jsx";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { toast } from "../lib/use-toast.js";

export function PunchControls({ status, session, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isOff = status === "off";

  async function handlePunchIn() {
    setLoading(true);
    const url = "/api/session";
    const body = { action: "punch_in" };

    try {
      if (!navigator.onLine) {
        const { queueAction } = await import("../lib/offline-db.js");
        await queueAction({ url, body });
        toast({ title: "Offline: Queued", description: "Punch in will sync once you are online.", variant: "warning" });
        return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Punched in!", description: "Your session has started.", variant: "success" });
      onRefresh();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handlePunchOut() {
    setShowConfirm(false);
    setLoading(true);
    const url = "/api/session";
    const body = { action: "punch_out", sessionId: session.id };

    try {
      if (!navigator.onLine) {
        const { queueAction } = await import("../lib/offline-db.js");
        await queueAction({ url, body });
        toast({ title: "Offline: Queued", description: "Punch out will sync once you are online.", variant: "warning" });
        return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Punched out!", description: "Session ended. Great work!", variant: "success" });
      onRefresh();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {isOff ? (
        <Button
          onClick={handlePunchIn}
          disabled={loading}
          size="xl"
          variant="success"
          className="w-full font-display text-lg tracking-wide"
        >
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
          Punch In
        </Button>
      ) : (
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          size="xl"
          variant="destructive"
          className="w-full font-display text-lg tracking-wide"
        >
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
          Punch Out
        </Button>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End your session?</DialogTitle>
            <DialogDescription>
              This will clock you out and save your session. You can&apos;t undo this action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handlePunchOut} className="flex-1">
              <LogOut className="mr-2 h-4 w-4" /> Yes, Punch Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
