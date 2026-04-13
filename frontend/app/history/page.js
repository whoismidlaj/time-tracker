"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SessionHistory } from "../../components/SessionHistory.jsx";
import { Clock, ArrowLeft, BarChart3, ChevronRight, ChevronLeft, Calendar as CalendarIcon } from "lucide-react";
import { MonthlyHeatmap } from "../../components/MonthlyHeatmap.jsx";
import { DayDetailsModal } from "../../components/DayDetailsModal.jsx";
import { startOfMonth, addMonths, subMonths, format, isSameMonth, isSameDay } from "date-fns";

import { apiClient } from "../../lib/api-client.js";

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchHistory = async (date) => {
    setLoading(true);
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const res = await apiClient(`/history?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Could not load history');
      const data = await res.json();
      setSessions(data.sessions || []);
      setLeaves(data.leaves || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(selectedMonth);
  }, [selectedMonth]);

  const isCurrentMonth = useMemo(() => isSameMonth(selectedMonth, new Date()), [selectedMonth]);

  const handlePrev = () => setSelectedMonth(prev => subMonths(prev, 1));
  const handleNext = () => {
    if (!isCurrentMonth) setSelectedMonth(prev => addMonths(prev, 1));
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-destructive gap-4">
        <p>{error}</p>
        <Link href="/" className="text-sm text-primary underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-8 min-h-screen pb-20">
      <div className="flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to Dashboard
        </Link>
        <Link 
            href="/reports" 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-all group"
        >
            Full Reports
            <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between bg-card/30 p-2 rounded-2xl border border-border/40 backdrop-blur-sm">
            <button 
                onClick={handlePrev}
                className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-all active:scale-90"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">Visual Logs</span>
                <span className="text-sm font-display font-bold text-foreground">
                    {format(selectedMonth, "MMMM yyyy")}
                </span>
            </div>

            <button 
                onClick={handleNext}
                disabled={isCurrentMonth}
                className={`p-2 rounded-xl transition-all active:scale-90 ${isCurrentMonth ? "opacity-20 cursor-not-allowed" : "hover:bg-accent text-muted-foreground"}`}
            >
                <ChevronRight className="h-5 w-5" />
            </button>
        </div>
        
        {loading ? (
            <div className="h-[300px] flex items-center justify-center rounded-3xl bg-muted/5 border border-dashed border-border/40 text-muted-foreground/40 text-[11px] font-medium animate-pulse">
                Fetching archives for {format(selectedMonth, "MMM yyyy")}...
            </div>
        ) : (
            <MonthlyHeatmap 
              monthDate={selectedMonth} 
              sessions={sessions}
              leaves={leaves}
              onClickDay={handleDayClick}
            />
        )}
      </div>

      <div className="space-y-4 pt-6 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground px-1 uppercase tracking-widest opacity-60">
          <Clock className="h-3.5 w-3.5" />
          <span>Sessions in {format(selectedMonth, "MMMM")}</span>
        </div>
        <SessionHistory sessions={[...sessions].reverse()} onRefresh={() => fetchHistory(selectedMonth)} />
      </div>

      {selectedDay && (
        <DayDetailsModal 
          isOpen={isModalOpen}
          onClose={setIsModalOpen}
          day={selectedDay}
          sessions={sessions}
          leave={leaves.find(l => selectedDay && isSameDay(new Date(l.leave_date), selectedDay))}
          onLeaveToggle={() => {
              fetchHistory(selectedMonth);
              // Don't close modal here so user can see it updated or switch types
          }}
        />
      )}
    </main>
  );
}
