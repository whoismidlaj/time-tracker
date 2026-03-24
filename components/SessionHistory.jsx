import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import { formatTime, formatDate, formatShortDuration, calcSessionDurationMs, calcTotalBreakMs } from "../lib/utils.js";
import { Clock, Coffee, Edit2, Plus, PenSquare, Calendar } from "lucide-react";
import { EditSessionModal } from "./EditSessionModal.jsx";
import { Button } from "./ui/button.jsx";

function SessionRow({ session, isActive, onEdit }) {
  const breaks = session.breaks || [];
  const finishedBreaks = breaks.filter(b => b.break_end);
  const breakMs = calcTotalBreakMs(finishedBreaks);
  const workedMs = session.punch_out_time ? calcSessionDurationMs(session, finishedBreaks) : null;

  return (
    <div className={`group rounded-xl p-3.5 transition-all ${
      isActive
        ? "bg-emerald-500/10 border border-emerald-500/20 shadow-sm"
        : "bg-muted/30 border border-transparent hover:border-border/60 hover:bg-muted/50"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-bold font-display text-foreground flex items-center gap-1.5">
              {formatDate(session.punch_in_time)}
            </span>
            {isActive && (
              <Badge variant="working" className="text-[10px] px-2 py-0.5">Active</Badge>
            )}
            {session.notes && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-dashed border-muted-foreground/30 text-muted-foreground/80 lowercase italic font-normal">
                has notes
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
              {formatTime(session.punch_in_time)}
            </span>
            {session.punch_out_time ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block shadow-[0_0_4px_rgba(248,113,113,0.5)]" />
                {formatTime(session.punch_out_time)}
              </span>
            ) : (
              <span className="text-emerald-500 font-bold tracking-tight">ongoing</span>
            )}
          </div>
          
          {session.notes && (
            <p className="mt-2 text-[11px] text-muted-foreground/70 italic line-clamp-1 border-l border-border/40 pl-2 ml-0.5">
              "{session.notes}"
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            {workedMs !== null ? (
              <div className="font-mono text-sm font-bold text-foreground">
                {formatShortDuration(workedMs)}
              </div>
            ) : (
              <div className="font-mono text-sm font-bold text-emerald-400">—</div>
            )}
            {finishedBreaks.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 justify-end">
                <Coffee className="h-2.5 w-2.5" />
                {finishedBreaks.length} · {formatShortDuration(breakMs)}
              </div>
            )}
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(session); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-background border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SessionHistory({ sessions = [], activeSessionId, onRefresh }) {
  const [editingSession, setEditingSession] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleEdit = (session) => {
    setEditingSession(session);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSession(null);
    setModalOpen(true);
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      const key = formatDate(s.punch_in_time);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return Array.from(map.entries()).map(([date, daySessions]) => {
      const totalMs = daySessions.reduce((acc, session) => {
        const breaks = session.breaks || [];
        const finishedBreaks = breaks.filter(b => b.break_end);
        if (!session.punch_out_time) return acc;
        return acc + calcSessionDurationMs(session, finishedBreaks);
      }, 0);
      return { date, daySessions, totalMs };
    });
  }, [sessions]);

  return (
    <Card className="border-border/50 overflow-hidden shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-bold font-display flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> History
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCreate}
          className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5 border-dashed"
        >
          <Plus className="h-3 h-3" /> Manual
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {grouped.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-muted/20 border border-dashed border-border/60">
            <PenSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No sessions recorded yet.</p>
            <Button variant="link" size="sm" onClick={handleCreate} className="mt-1 text-xs text-primary/70">
              Add your first session manually
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ date, daySessions, totalMs }) => (
              <div key={date}>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="h-3 w-3 opacity-60" /> {date}
                  </p>
                  <p className="text-[10px] font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-full border border-primary/10">
                    {formatShortDuration(totalMs)}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {daySessions.map(s => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      isActive={s.id === activeSessionId}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <EditSessionModal 
        session={editingSession}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onRefresh={onRefresh}
      />
    </Card>
  );
}
