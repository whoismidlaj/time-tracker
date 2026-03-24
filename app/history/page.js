"use client";
import { useState, useEffect } from "react";
import { SessionHistory } from "../../components/SessionHistory.jsx";
import { Clock } from "lucide-react";

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/history?type=recent&limit=100');
        if (!res.ok) throw new Error('Could not load history');
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive">
        {error}
      </div>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>All sessions</span>
      </div>
      <SessionHistory sessions={sessions} />
    </main>
  );
}
