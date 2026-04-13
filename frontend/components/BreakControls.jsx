"use client";
import { useState } from "react";
import { Button } from "./ui/button.jsx";
import { Coffee, Play, Loader2 } from "lucide-react";
import { toast } from "../lib/use-toast.js";

import { apiClient } from "../lib/api-client.js";

export function BreakControls({ status, session, activeBreak, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const isOff = status === "off";
  const isBreak = status === "break";
  const isWorking = status === "working";

  async function handleStartBreak() {
    setLoading(true);
    const endpoint = "/break";
    const body = { sessionId: session.id };

    try {
      if (!navigator.onLine) {
        const { queueAction } = await import("../lib/offline-db.js");
        await queueAction({ url: `/api${endpoint}`, body });
        toast({ title: "Offline: Queued", description: "Break will sync once you are online.", variant: "warning" });
        return;
      }

      const res = await apiClient(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Break started", description: "Enjoy your break!", variant: "default" });
      onRefresh();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleEndBreak() {
    setLoading(true);
    const endpoint = `/break/${activeBreak.id}`;

    try {
      if (!navigator.onLine) {
        const { queueAction } = await import("../lib/offline-db.js");
        await queueAction({ url: `/api${endpoint}`, method: 'PATCH', body: {} });
        toast({ title: "Offline: Queued", description: "Break end will sync once you are online.", variant: "warning" });
        return;
      }

      const res = await apiClient(endpoint, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Back to work!", description: "Break ended.", variant: "success" });
      onRefresh();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (isOff) {
    return (
      <Button disabled size="lg" variant="outline" className="w-full opacity-40">
        <Coffee className="mr-2 h-4 w-4" /> Take a Break
      </Button>
    );
  }

  if (isBreak) {
    return (
      <Button
        onClick={handleEndBreak}
        disabled={loading}
        size="lg"
        variant="warning"
        className="w-full font-display"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
        End Break
      </Button>
    );
  }

  return (
    <Button
      onClick={handleStartBreak}
      disabled={loading || !isWorking}
      size="lg"
      variant="outline"
      className="w-full font-display border-2"
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coffee className="mr-2 h-4 w-4" />}
      Take a Break
    </Button>
  );
}
