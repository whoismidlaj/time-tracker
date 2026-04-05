"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { StatusCard } from "../components/StatusCard.jsx";
import { getTimezone } from "../lib/config.js";
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
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { data: sessionData, status: authStatus, update } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState("off");
  const [session, setSession] = useState(null);
  const [activeBreak, setActiveBreak] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [tick, setTick] = useState(0);
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
      const localDate = new Date().toLocaleDateString('en-CA', { timeZone: getTimezone() });
      const [todayRes, allRes] = await Promise.all([
        fetch(`/api/history?type=today&date=${localDate}`),
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
    if (user.role === 'admin') {
      router.replace('/admin');
      return;
    }
    refresh();
  }, [user, refresh, router]);

  // Live timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (session && (status === "working" || status === "break")) {
      const update = () => {
        setElapsed(calcSessionDurationMs(session, breaks));
        setTick(t => t + 1);
      };
      update();
      timerRef.current = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [session, status, breaks, activeBreak]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-44">
        {/* Status card */}
        <StatusCard
          status={status}
          session={session}
          activeBreak={activeBreak}
          breaks={breaks}
          elapsed={elapsed}
          onRefresh={refresh}
        />

        <SyncManager onSyncComplete={refresh} />

        {/* Daily summary */}
        <DailySummary
          todaySessions={todaySessions}
          activeSession={session}
          activeSessionBreaks={breaks}
          activeBreak={activeBreak}
          activeElapsed={elapsed}
          tick={tick}
        />

        {/* Session history */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-semibold">Recent Sessions</h2>
          <Link href="/history" className="text-xs text-primary underline">View full history</Link>
        </div>
        <SessionHistory
          sessions={allSessions}
          activeSessionId={session?.id}
          onRefresh={refresh}
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
