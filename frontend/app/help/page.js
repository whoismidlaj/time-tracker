"use client";
import React from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  HelpCircle, 
  Clock, 
  Coffee, 
  Calendar, 
  Heart, 
  TrendingUp, 
  MousePointer2,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

const HelpSection = ({ icon: Icon, title, children }) => (
  <div className="p-6 rounded-[2rem] bg-card border border-border/50 shadow-sm space-y-4 hover:border-primary/20 transition-all group">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold font-display tracking-tight">{title}</h3>
    </div>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const FeatureStep = ({ number, text }) => (
  <div className="flex gap-3 items-start">
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground/60 border border-border/40">
      {number}
    </span>
    <p className="text-[11px] leading-relaxed text-muted-foreground/80">{text}</p>
  </div>
);

export default function HelpPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-8 min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Dashboard
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary/60">
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Learning Center</span>
        </div>
      </div>

      {/* Intro */}
      <div className="space-y-3 px-2">
        <h1 className="text-3xl font-bold font-display tracking-tight leading-tight italic">Hey there! <br/>Let's get you started.</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
            TimeTrack is designed to stay out of your way while you do your best work. Here's a quick guide to how everything works.
        </p>
      </div>

      {/* Sections Grid */}
      <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
        
        <HelpSection icon={Clock} title="Starting your day">
          <FeatureStep number="1" text="Ready to work? Just hit 'Punch In'. We'll handle the clock while you focus on the task at hand." />
          <FeatureStep number="2" text="Feeling organized? Add a quick note to your session to remind your future self what you did." />
          <FeatureStep number="3" text="Finished? 'Punch Out' to wrap up your day and save your progress to the archives." />
        </HelpSection>

        <HelpSection icon={Coffee} title="Taking a breather">
          <FeatureStep number="1" text="Coffee time? Stepping away? Tap 'Break' to pause. We won't count that toward your work time." />
          <FeatureStep number="2" text="Taking breaks helps you stay fresh. Your consistency scores won't be affected by offline time." />
          <FeatureStep number="3" text="Oops, forgot to resume? No worries—you can always fix your session times later on." />
        </HelpSection>

        <HelpSection icon={Calendar} title="See your progress">
          <FeatureStep number="1" text="Your calendar shows your steady progress. Darker squares mean you were absolutely on fire!" />
          <FeatureStep number="2" text="Curious about a specific day? Just click it to see exactly when you worked and what you achieved." />
          <FeatureStep number="3" text="It's your data, your way. Navigate through months to see how much you've grown." />
        </HelpSection>

        <HelpSection icon={Heart} title="Time for yourself">
          <FeatureStep number="1" text="Under the weather? Or just need a day off? Don't let your performance stats take a hit." />
          <FeatureStep number="2" text="Mark those days as 'Leave'. We'll skip them when calculating your consistency scores." />
          <FeatureStep number="3" text="Choose Sick, Casual, or Other. We believe your rest is just as important as your work." />
        </HelpSection>

        <HelpSection icon={TrendingUp} title="Staying on track">
          <FeatureStep number="1" text="We track your consistency, not just your hours. Our goal is a steady rhythm, not burnout." />
          <FeatureStep number="2" text="Your success rate is smart—it automatically adjusts for holidays and your marked leave days." />
          <FeatureStep number="3" text="Check the 'Reports' page for a deep dive into your monthly efficiency and work patterns." />
        </HelpSection>
      </div>

      {/* Pro Tip */}
      <div className="p-8 rounded-[3rem] bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden group shadow-xl shadow-primary/20">
        <div className="absolute -top-4 -right-4 p-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform">
            <CheckCircle2 className="h-32 w-32 text-white" />
        </div>
        <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
                <span className="w-6 h-[2px] bg-white/40" />
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em]">One more thing</p>
            </div>
            <p className="text-base font-bold text-white leading-relaxed">
                Add TimeTrack to your phone's home screen! It works just like a native app and keeps you focused on the go.
            </p>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-8 flex flex-col items-center gap-4 border-t border-border/20 mx-2">
          <p className="text-[11px] font-medium text-muted-foreground/60 leading-none">Still have questions?</p>
          <div className="flex items-center gap-4">
            <Link 
                href="/reports" 
                className="flex items-center gap-2 group text-xs font-bold text-foreground hover:text-primary transition-colors"
            >
                View Analytics
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <span className="w-1 h-1 rounded-full bg-border" />
            <a 
                href="https://midlaj.is-a.dev" 
                target="_blank"
                className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors"
            >
                Contact Me
            </a>
          </div>
          <div className="h-1 w-10 rounded-full bg-border/40 mt-4" />
      </div>
    </main>
  );
}
