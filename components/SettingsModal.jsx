import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Settings, Sparkles, Globe, CalendarDays } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { getTimezone, DEFAULT_TIMEZONE, getOfficeStartTime, getOfficeEndTime, getBreakHours, getWeeklyHolidays } from "../lib/config.js";
import { formatTimeString } from "../lib/utils.js";

const DAYS = [
  { label: "S", value: "0", name: "Sunday" },
  { label: "M", value: "1", name: "Monday" },
  { label: "T", value: "2", name: "Tuesday" },
  { label: "W", value: "3", name: "Wednesday" },
  { label: "T", value: "4", name: "Thursday" },
  { label: "F", value: "5", name: "Friday" },
  { label: "S", value: "6", name: "Saturday" },
];

export function SettingsModal() {
  const [tz, setTz] = useState(getTimezone());
  const [startTime, setStartTime] = useState(getOfficeStartTime());
  const [endTime, setEndTime] = useState(getOfficeEndTime());
  const [breakHours, setBreakHours] = useState(getBreakHours());
  const [weeklyHolidays, setWeeklyHolidays] = useState(getWeeklyHolidays());
  const [loading, setLoading] = useState(true);

  // Fetch Cloud Settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/user/settings");
        const data = await res.json();
        if (data.settings && Object.keys(data.settings).length > 0) {
          const s = data.settings;
          if (s.app_timezone) { setTz(s.app_timezone); localStorage.setItem("app_timezone", s.app_timezone); }
          if (s.app_start_time) { setStartTime(s.app_start_time); localStorage.setItem("app_start_time", s.app_start_time); }
          if (s.app_end_time) { setEndTime(s.app_end_time); localStorage.setItem("app_end_time", s.app_end_time); }
          if (s.app_break_hours) { setBreakHours(s.app_break_hours); localStorage.setItem("app_break_hours", s.app_break_hours); }
          if (s.app_weekly_holidays) { setWeeklyHolidays(s.app_weekly_holidays); localStorage.setItem("app_weekly_holidays", JSON.stringify(s.app_weekly_holidays)); }
        }
      } catch (err) {
        console.error("Failed to fetch cloud settings", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleTzChange = (newTz) => {
    setTz(newTz);
  };

  const toggleHoliday = (dayVal) => {
    setWeeklyHolidays(prev => {
      const next = prev.includes(dayVal) 
        ? prev.filter(d => d !== dayVal) 
        : [...prev, dayVal];
      return next;
    });
  };

  const handleDone = async () => {
    const settings = {
      app_timezone: tz,
      app_start_time: startTime,
      app_end_time: endTime,
      app_break_hours: breakHours,
      app_weekly_holidays: weeklyHolidays
    };

    // Save to Local
    localStorage.setItem("app_timezone", settings.app_timezone);
    localStorage.setItem("app_start_time", settings.app_start_time);
    localStorage.setItem("app_end_time", settings.app_end_time);
    localStorage.setItem("app_break_hours", settings.app_break_hours);
    localStorage.setItem("app_weekly_holidays", JSON.stringify(settings.app_weekly_holidays));

    // Push to Cloud
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      });
    } catch (err) {
      console.error("Failed to push cloud settings", err);
    }

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
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-[300px] translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-background p-5 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
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
            </div>

            <div className="space-y-3 p-3 rounded-xl border border-border/50 bg-muted/30">
              <p className="text-[11px] font-bold text-foreground lowercase tracking-tight">Working Rules</p>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[9px] text-muted-foreground font-bold uppercase">Office Start</label>
                      <span className="text-[8px] font-bold text-primary/60">{formatTimeString(startTime)}</span>
                    </div>
                    <input 
                      type="time" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-8 bg-background/50 border border-border/40 rounded-lg px-2 text-[10px] font-bold focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[9px] text-muted-foreground font-bold uppercase">Office End</label>
                      <span className="text-[8px] font-bold text-primary/60">{formatTimeString(endTime)}</span>
                    </div>
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

            <div className="space-y-3 p-3 rounded-xl border border-border/50 bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] font-bold text-foreground lowercase tracking-tight">Weekly Holidays</p>
              </div>
              <div className="flex justify-between gap-1">
                {DAYS.map(day => (
                  <button
                    key={day.value}
                    onClick={() => toggleHoliday(day.value)}
                    title={day.name}
                    className={`
                      w-7 h-7 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center
                      ${weeklyHolidays.includes(day.value) 
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                        : "bg-background border border-border/40 text-muted-foreground hover:border-primary/30"
                      }
                    `}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-[8px] text-muted-foreground/60 px-0.5">Selected days will be marked as holidays in charts.</p>
            </div>
            
            <Dialog.Close asChild>
              <button 
                onClick={handleDone}
                className="w-full py-2.5 text-[11px] font-bold bg-primary text-white rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Save Changes
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
