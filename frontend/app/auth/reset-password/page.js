"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, Loader2, ShieldCheck, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "../../../lib/use-toast.js";
import { Button } from "../../../components/ui/button.jsx";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Missing or invalid reset token.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      
      setSubmitted(true);
      toast({ title: "Success", description: "Password updated successfully." });
      setTimeout(() => router.push('/'), 3000);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm font-bold text-destructive uppercase tracking-widest">{error}</p>
        <Button onClick={() => router.push('/')} variant="outline" className="rounded-xl">Go Home</Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2 text-emerald-500">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold font-display uppercase tracking-tight">Success!</h2>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          Your password has been updated. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/60 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">New Password</label>
            <div className="relative group/input">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within/input:text-primary transition-colors" size={16} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 bg-muted/20 border border-border/60 rounded-xl pl-11 pr-12 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Confirm New Password</label>
            <div className="relative group/input">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within/input:text-primary transition-colors" size={16} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 bg-muted/20 border border-border/60 rounded-xl pl-11 pr-12 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>Update Password <ArrowRight size={16} /></>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-body">
      <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2 mb-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
            <Lock size={28} />
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight uppercase">Reset Password</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest px-8 leading-relaxed">
            Please enter your new security credentials.
          </p>
        </div>

        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
