"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SessionHistory } from "../../components/SessionHistory.jsx";
import { Clock, ArrowLeft } from "lucide-react";

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-destructive gap-4">
        <p>{error}</p>
        <Link href="/" className="text-sm text-primary underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
      <div>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to Dashboard
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground px-1 uppercase tracking-widest">
          <Clock className="h-3.5 w-3.5" />
          <span>All Session History</span>
        </div>
        <SessionHistory sessions={sessions} />
      </div>
    </main>
  );
}
