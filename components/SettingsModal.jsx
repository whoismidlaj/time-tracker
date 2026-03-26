import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Settings, Sparkles, Globe } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { getTimezone, DEFAULT_TIMEZONE, getOfficeStartTime, getOfficeEndTime, getBreakHours } from "../lib/config.js";

export function SettingsModal() {
  const [tz, setTz] = useState(getTimezone());
  const [startTime, setStartTime] = useState(getOfficeStartTime());
  const [endTime, setEndTime] = useState(getOfficeEndTime());
  const [breakHours, setBreakHours] = useState(getBreakHours());

  const handleTzChange = (newTz) => {
    setTz(newTz);
    localStorage.setItem("app_timezone", newTz);
  };

  const handleDone = () => {
    localStorage.setItem("app_start_time", startTime);
    localStorage.setItem("app_end_time", endTime);
    localStorage.setItem("app_break_hours", breakHours);
    // Reload to apply changes site-wide
    window.location.reload();
  };

  const timezones = [
    { label: "India (Kolkata)", value: "Asia/Kolkata" },
    { label: "UTC", value: "UTC" },
    { label: "Dubai", value: "Asia/Dubai" },
    { label: "London", value: "Europe/London" },
    { label: "New York", value: "America/New_York" },
    { label: "Singapore", value: "Asia/Singapore" },
  ];
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

            <div className="space-y-2 p-3 rounded-xl border border-border/50 bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] font-bold text-foreground lowercase tracking-tight">App Timezone</p>
              </div>
              <select 
                value={tz}
                onChange={(e) => handleTzChange(e.target.value)}
                className="w-full h-8 bg-background/50 border border-border/40 rounded-lg px-2 text-[10px] font-medium focus:ring-1 focus:ring-primary/20 outline-none transition-all"
              >
                {timezones.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-[9px] text-muted-foreground/60 px-1 font-medium">Selected: {tz}</p>
            </div>

            <div className="space-y-3 p-3 rounded-xl border border-border/50 bg-muted/30">
              <p className="text-[11px] font-bold text-foreground lowercase tracking-tight">Working Rules</p>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-muted-foreground font-bold uppercase ml-1">Office Start</label>
                    <input 
                      type="time" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-8 bg-background/50 border border-border/40 rounded-lg px-2 text-[10px] font-bold focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-muted-foreground font-bold uppercase ml-1">Office End</label>
                    <input 
                      type="time" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-8 bg-background/50 border border-border/40 rounded-lg px-2 text-[10px] font-bold focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-[10px] text-muted-foreground font-medium">Allowed Break (hrs)</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={breakHours}
                    onChange={(e) => setBreakHours(e.target.value)}
                    className="w-12 h-7 bg-background/50 border border-border/40 rounded-md px-1.5 text-[10px] font-bold text-right focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
            
            <Dialog.Close asChild>
              <button 
                onClick={handleDone}
                className="w-full py-2.5 text-[11px] font-bold bg-primary text-white rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
