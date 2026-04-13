"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, User, Loader2, Save } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { toast } from "../lib/use-toast.js";

import { apiClient } from "../lib/api-client.js";

export function ProfileModal({ user, onUpdate, open, onOpenChange }) {
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient("/profile", {
        method: "POST",
        body: JSON.stringify({
          display_name: displayName,
          avatar_url: avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      
      toast({ title: "Profile updated", description: "Changes saved successfully." });
      onUpdate(data.user);
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setAvatarUrl(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[70] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold font-display">Edit Profile</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1.5 hover:bg-accent text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col items-center gap-3 py-2">
              <label className="group relative cursor-pointer">
                <div className="h-24 w-24 rounded-full border-4 border-background bg-muted flex items-center justify-center overflow-hidden shadow-2xl ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Save className="h-6 w-6 text-white" />
                  </div>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
              <div className="text-center">
                <p className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-0.5">Change Photo</p>
                <p className="text-[10px] text-muted-foreground">Click to upload image</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full flex h-11 rounded-xl border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background transition-all focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="flex-1 rounded-xl text-xs font-bold h-11">Cancel</Button>
              </Dialog.Close>
              <Button type="submit" className="flex-1 rounded-xl text-xs font-bold h-11 gap-2 shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
