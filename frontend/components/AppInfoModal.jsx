"use client";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, Calendar, Sparkles, CheckCircle2, Bug } from "lucide-react";

import { apiClient } from "../lib/api-client.js";

export function AppInfoModal({ open, onOpenChange }) {
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);

  const updates = [
    { id: 1, title: "Calendar & Heatmap", desc: "Added interactive 7-column grid with Sunday starts.", icon: Calendar },
    { id: 2, title: "Leave Management", desc: "Track Sick, Casual, and Custom leaves seamlessly.", icon: CheckCircle2 },
    { id: 3, title: "Daily Drill-down", desc: "Click any day to audit exact session logs and notes.", icon: Sparkles },
    { id: 4, title: "Smart Analytics", desc: "Leaves are now excluded from success rate calculations.", icon: CheckCircle2 },
    { id: 5, title: "Bug Fixes", desc: "Resolved timezone mismatches and React 19 rendering issues.", icon: Bug },
  ];

  useEffect(() => {
    if (open) {
      setLoading(true);
      apiClient('/app-info')
        .then(res => res.json())
        .then(data => {
          setInfo(data.info || "Information unavailable.");
        })
        .catch(() => setInfo("Error loading information."))
        .finally(() => setLoading(false));
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[70] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-[2.5rem] border border-border/50 bg-background/95 p-8 shadow-2xl animate-in zoom-in-95 duration-200 font-body backdrop-blur-md">
          
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
                <Dialog.Title className="text-xl font-bold font-display tracking-tight text-foreground">App Information</Dialog.Title>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-0.5 bg-muted rounded-full">TimeTrack</span>
                    <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">v1.0.0</span>
                </div>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-full p-2 hover:bg-accent text-muted-foreground transition-all active:scale-90 group">
                <X className="h-5 w-5 group-hover:rotate-90 transition-transform" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-8">
             {/* Main Info */}
             <div className="bg-muted/30 border border-border/40 p-6 rounded-[2rem] relative overflow-hidden group/info">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/info:opacity-20 transition-opacity">
                    <Sparkles className="h-12 w-12 text-primary" />
                </div>
                {loading ? (
                    <div className="flex items-center justify-center h-12">
                        <Loader2 className="h-6 w-6 text-primary/40 animate-spin" />
                    </div>
                ) : (
                    <p className="text-foreground/80 text-[13px] font-medium leading-relaxed italic animate-in fade-in slide-in-from-bottom-1">
                        "{info}"
                    </p>
                )}
             </div>

             {/* Updates List */}
             <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-border" /> 🛡️ System Updates
                </h4>
                
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {updates.map((upd) => (
                        <div key={upd.id} className="flex gap-4 group/item">
                            <div className="mt-1">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-colors group-hover/item:bg-primary group-hover/item:text-primary-foreground">
                                    <upd.icon className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <h5 className="text-[11px] font-bold text-foreground">{upd.title}</h5>
                                <p className="text-[10px] text-muted-foreground leading-snug">{upd.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             {/* Credits */}
             <div className="pt-6 flex flex-col items-center gap-4 border-t border-border/20 mx-2">
                <div className="px-5 py-3 rounded-[1.5rem] bg-primary/5 border border-primary/10 shadow-sm">
                    <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/80 text-center leading-relaxed">
                        built by <a href="https://midlaj.is-a.dev" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline decoration-primary/30 underline-offset-4 transition-all">@whoismidlaj</a> with a hint of <span className="text-foreground font-bold italic text-[9px] uppercase tracking-widest opacity-70">AI 🤖</span>
                    </p>
                </div>

                <div className="h-1 w-10 rounded-full bg-border/40" />
             </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
