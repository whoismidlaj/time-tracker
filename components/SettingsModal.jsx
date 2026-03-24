"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Settings, Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle.jsx";

export function SettingsModal() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="p-2 hover:bg-accent rounded-xl transition-all text-muted-foreground hover:text-foreground group active:scale-95">
          <Settings className="h-4.5 w-4.5 group-hover:rotate-45 transition-transform duration-300" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-[280px] translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-background p-5 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-sm font-bold font-display flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Settings
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1 hover:bg-accent text-muted-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-foreground">App Theme</p>
                <p className="text-[9px] text-muted-foreground">Switch between modes</p>
              </div>
              <ThemeToggle />
            </div>
            
            <Dialog.Close asChild>
              <button className="w-full py-2 text-[11px] font-bold bg-primary text-white rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all">
                Done
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
