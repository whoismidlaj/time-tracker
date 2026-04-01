"use client";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Info, Loader2, Calendar, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button.jsx";

export function AppInfoModal({ open, onOpenChange }) {
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/app-info')
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
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[70] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200 font-body">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold font-display">App Information</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1.5 hover:bg-accent text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-[120px] bg-muted/20 border border-border/60 p-5 rounded-xl relative shadow-inner">
             {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                   <Loader2 className="h-6 w-6 text-primary/40 animate-spin" />
                </div>
             ) : (
                <div className="space-y-4 animate-in fade-in duration-500">
                   <p className="text-foreground/80 text-sm font-medium leading-relaxed whitespace-pre-wrap">{info}</p>
                   
                   <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Status</p>
                         <p className="text-[11px] text-primary font-bold flex items-center gap-1.5 uppercase tracking-widest leading-none mt-1">
                            <ShieldCheck size={12} className="relative -top-[1px]" /> Verified
                         </p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Updates</p>
                         <p className="text-[11px] text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-widest leading-none mt-1">
                            <Calendar size={12} className="relative -top-[1px]" /> v1.2.0
                         </p>
                      </div>
                   </div>
                </div>
             )}
          </div>

          <div className="flex pt-4">
             <Dialog.Close asChild>
                <Button className="flex-1 rounded-xl text-xs font-bold h-11 bg-muted/60 text-foreground hover:bg-accent hover:text-accent-foreground border border-border/60 transition-all">
                   Close Information
                </Button>
             </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
