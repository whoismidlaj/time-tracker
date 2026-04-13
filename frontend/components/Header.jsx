"use client";
import React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { usePathname } from "next/navigation";
import { SettingsModal } from "./SettingsModal.jsx";
import { UserNav } from "./UserNav.jsx";
import { useAuth } from "../lib/auth-context.jsx";

export function Header() {
  const { user, loading, logout, refresh } = useAuth();
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;
  if (loading || !user) return null;

  async function handleLogout() {
    await logout();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shadow-inner">
            <Clock className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">TimeTrack</span>
        </Link>

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
          <UserNav user={user} onLogout={handleLogout} onUpdate={refresh} />
        </div>
      </div>
    </header>
  );
}
