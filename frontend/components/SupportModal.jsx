"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, MessageSquare, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button.jsx";
import { toast } from "../lib/use-toast.js";

import { apiClient } from "../lib/api-client.js";

export function SupportModal({ open, onOpenChange }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient('/support', {
        method: 'POST',
        body: JSON.stringify({ subject, message })
      });
      if (!res.ok) throw new Error("Failed to send ticket");
      setSubmitted(true);
      toast({ title: "Ticket Sent", description: "We will reach out via email shortly.", variant: "success" });
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setSubject("");
        setMessage("");
      }, 2000);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[70] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200 font-body">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold font-display">Contact Support</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-1.5 hover:bg-accent text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {submitted ? (
            <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-500">
               <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-primary" />
               </div>
               <h3 className="text-foreground font-bold text-lg uppercase tracking-widest">Message Sent</h3>
               <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest leading-relaxed px-4">Our team will verify your inquiry and respond shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Subject</label>
                   <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      placeholder="Brief summary"
                      className="w-full flex h-11 rounded-xl border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background transition-all focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Message</label>
                   <textarea 
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      placeholder="How can we help?"
                      className="w-full flex rounded-xl border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background transition-all focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                   />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                 <Dialog.Close asChild>
                   <Button type="button" variant="outline" className="flex-1 rounded-xl text-xs font-bold h-11">Cancel</Button>
                 </Dialog.Close>
                 <Button type="submit" disabled={loading} className="flex-1 rounded-xl text-xs font-bold h-11 gap-2 shadow-lg shadow-primary/20">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send size={14} className="-rotate-12" /> Send Ticket</>}
                 </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
