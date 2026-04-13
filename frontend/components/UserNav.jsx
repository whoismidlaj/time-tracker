"use client";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import { LogOut, User, Settings, Info, MessageSquare, HelpCircle } from "lucide-react";
import Link from "next/link";
import { ProfileModal } from "./ProfileModal.jsx";
import { AppInfoModal } from "./AppInfoModal.jsx";
import { SupportModal } from "./SupportModal.jsx";

export function UserNav({ user, onLogout, onUpdate }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  
  const initials = user.display_name 
    ? user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="relative h-9 w-9 rounded-xl outline-none ring-offset-background transition-all hover:scale-105 active:scale-95 group">
            <div className="absolute inset-0 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors" />
            <Avatar.Root className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border/50 shadow-sm relative z-10">
              <Avatar.Image src={user.avatar_url} alt={user.display_name || user.email} className="h-full w-full object-cover" />
              <Avatar.Fallback className="text-[10px] font-bold text-foreground/80">{initials}</Avatar.Fallback>
            </Avatar.Root>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="z-50 min-w-[14rem] overflow-hidden rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
            sideOffset={10}
            align="end"
          >
            <div className="px-3 py-2.5 mb-2 flex flex-col gap-1 bg-muted/30 rounded-xl">
              <p className="text-xs font-bold truncate leading-none text-foreground">{user.display_name || "New User"}</p>
              <p className="text-[10px] text-muted-foreground truncate font-medium">{user.email}</p>
            </div>
            
            <DropdownMenu.Item 
              onClick={() => setProfileOpen(true)}
              className="relative flex cursor-default select-none items-center rounded-lg px-2.5 py-2 text-[11px] font-bold ml-1 outline-none transition-all focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 gap-2.5 group"
            >
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center group-focus:bg-primary/20 transition-colors">
                <User className="h-3 w-3 text-primary" />
              </div>
              Edit Profile
            </DropdownMenu.Item>
            
            <DropdownMenu.Item 
              onClick={() => setInfoOpen(true)}
              className="relative flex cursor-default select-none items-center rounded-lg px-2.5 py-2 text-[11px] font-bold ml-1 outline-none transition-all focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 gap-2.5 group"
            >
              <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center group-focus:bg-muted-foreground/10 transition-colors">
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
              App Info
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link 
                href="/help"
                className="relative flex cursor-default select-none items-center rounded-lg px-2.5 py-2 text-[11px] font-bold ml-1 outline-none transition-all focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 gap-2.5 group"
              >
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center group-focus:bg-muted-foreground/10 transition-colors">
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </div>
                Help & Guide
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item 
              onClick={() => setSupportOpen(true)}
              className="relative flex cursor-default select-none items-center rounded-lg px-2.5 py-2 text-[11px] font-bold ml-1 outline-none transition-all focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 gap-2.5 group"
            >
              <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center group-focus:bg-muted-foreground/10 transition-colors">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
              </div>
              Contact Support
            </DropdownMenu.Item>
            
            <DropdownMenu.Separator className="my-2 h-px bg-border/50" />
            
            <DropdownMenu.Item 
              onClick={onLogout}
              className="relative flex cursor-default select-none items-center rounded-lg px-2.5 py-2 text-[11px] font-bold ml-1 outline-none transition-all focus:bg-destructive/5 focus:text-destructive disabled:pointer-events-none disabled:opacity-50 gap-2.5 group"
            >
              <div className="w-6 h-6 rounded-md bg-destructive/10 flex items-center justify-center group-focus:bg-destructive/20 transition-colors">
                <LogOut className="h-3 w-3 text-destructive" />
              </div>
              Sign Out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ProfileModal 
        user={user} 
        onUpdate={onUpdate} 
        open={profileOpen} 
        onOpenChange={setProfileOpen} 
      />
      <AppInfoModal 
        open={infoOpen} 
        onOpenChange={setInfoOpen} 
      />

      <SupportModal 
        open={supportOpen} 
        onOpenChange={setSupportOpen} 
      />
    </>
  );
}
