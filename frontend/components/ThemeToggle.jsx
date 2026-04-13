"use client";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-full border border-border/50 bg-background/50 text-muted-foreground w-9 h-9 flex items-center justify-center opacity-0">
        <div className="h-4 w-4" />
      </button>
    );
  }

  const themes = [
    { name: "light", icon: Sun, label: "Light" },
    { name: "dark", icon: Moon, label: "Dark" },
    { name: "system", icon: Monitor, label: "System" },
  ];

  const currentTheme = themes.find(t => t.name === theme) || themes[2];

  return (
    <div className="flex items-center gap-1 p-1 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm">
      {themes.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.name;
        return (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            className={`p-1.5 rounded-full transition-all duration-200 ${
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm scale-110" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            title={t.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
