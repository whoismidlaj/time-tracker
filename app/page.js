"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { StatusCard } from "../components/StatusCard.jsx";
import { PunchControls } from "../components/PunchControls.jsx";
import { BreakControls } from "../components/BreakControls.jsx";
import { DailySummary } from "../components/DailySummary.jsx";
import { SessionHistory } from "../components/SessionHistory.jsx";
import { AuthForm } from "../components/AuthForm.jsx";
import { SettingsModal } from "../components/SettingsModal.jsx";
import { UserNav } from "../components/UserNav.jsx";
import { SyncManager } from "../components/SyncManager.jsx";
import { calcSessionDurationMs, calcTotalBreakMs } from "../lib/utils.js";
import { Clock } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function HomePage() {
  const { data: sessionData, status: authStatus, update } = useSession();
  const [status, setStatus] = useState("off");
  const [session, setSession] = useState(null);
  const [activeBreak, setActiveBreak] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  
  const user = sessionData?.user;
  const loading = authStatus === "loading";

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setStatus('off');
      setSession(null);
      setActiveBreak(null);
      setBreaks([]);
      return;
    }
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      setStatus(data.status || 'off');
      setSession(data.session || null);
      setActiveBreak(data.activeBreak || null);
      setBreaks(data.breaks || []);
    } catch (e) {
      console.error('Status fetch error:', e);
      setStatus('off');
      setSession(null);
      setActiveBreak(null);
      setBreaks([]);
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setTodaySessions([]);
      setAllSessions([]);
      return;
    }
    try {
      const [todayRes, allRes] = await Promise.all([
        fetch('/api/history?type=today'),
        fetch('/api/history?type=recent&limit=5'),
      ]);
      const todayData = await todayRes.json();
      const allData = await allRes.json();
      setTodaySessions(todayData.sessions || []);
      setAllSessions(allData.sessions || []);
    } catch (e) {
      console.error('History fetch error:', e);
      setTodaySessions([]);
      setAllSessions([]);
    }
  }, [user]);

  const refresh = useCallback(async () => {
  await Promise.all([fetchStatus(), fetchHistory()]);
}, [fetchStatus, fetchHistory]);

  // Load status/history after user resolves
  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  // Live timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (session && (status === "working" || status === "break")) {
      const update = () => {
        const finishedBreaks = breaks.filter(b => b.break_end);
        setElapsed(calcSessionDurationMs(session, finishedBreaks));
      };
      update();
      timerRef.current = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [session, status, breaks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Clock className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthenticated={refresh} />;
  }

  async function handleLogout() {
    signOut({ redirect: false });
    setStatus('off');
    setSession(null);
    setActiveBreak(null);
    setBreaks([]);
    setTodaySessions([]);
    setAllSessions([]);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shadow-inner">
              <Clock className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">TimeTrack</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end mr-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {new Date().toLocaleDateString([], { weekday: "short" })}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground leading-none">
                {new Date().toLocaleDateString([], { day: "numeric", month: "short" })}
              </span>
            </div>
            
            <SettingsModal />
            <div className="w-px h-4 bg-border/50 mx-1" />
            <UserNav user={user} onLogout={handleLogout} onUpdate={update} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Status card */}
        <StatusCard
          status={status}
          session={session}
          activeBreak={activeBreak}
          breaks={breaks}
          elapsed={elapsed}
        />

        <SyncManager onSyncComplete={refresh} />

        {/* Daily summary */}
        <DailySummary todaySessions={todaySessions} />

        {/* Session history */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-semibold">Recent Sessions</h2>
          <Link href="/history" className="text-xs text-primary underline">View full history</Link>
        </div>
        <SessionHistory
          sessions={allSessions}
          activeSessionId={session?.id}
        />
      </main>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="max-w-lg mx-auto px-4 pb-6 pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="flex flex-col gap-2.5">
            <BreakControls
              status={status}
              session={session}
              activeBreak={activeBreak}
              onRefresh={refresh}
            />
            <PunchControls
              status={status}
              session={session}
              onRefresh={refresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
