"use client";
import { useState } from 'react';
import { Button } from './ui/button.jsx';
import { toast } from '../lib/use-toast.js';
import { useAuth } from '../lib/auth-context.jsx';
import { Loader2, Mail, Lock, Chrome, ArrowRight, KeyRound, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../lib/api-client.js';

export function AuthForm({ onAuthenticated }) {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // login, register, forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleCredentialsAuth(e) {
    e.preventDefault();
    const adminEmail = process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL;
    if (email.toLowerCase() === adminEmail?.toLowerCase()) {
      toast({ 
        title: "Access Restricted", 
        description: "Please use the dedicated Admin Portal to log in.", 
        variant: "destructive" 
      });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await apiClient('/auth/register', { 
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Registration failed');
        }
      }

      const result = await login(email, password);

      if (!result.success) throw new Error(result.error);
      
      toast({ title: 'Success', description: 'Welcome back!', variant: 'success' });
      if (onAuthenticated) onAuthenticated();
    } catch (err) {
      toast({ title: 'Auth error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    toast({ title: 'Not Implemented', description: 'Google login is being refactored.', variant: 'warning' });
  }

  async function handleResetRequest(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient('/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ action: 'request', email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      
      setResetSent(true);
      toast({ title: 'Email Sent', description: data.message });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-display">
            {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            {mode === 'login' ? 'Login to TimeTrack' : 'Start your productivity journey'}
          </p>
        </div>

        <div className="space-y-6">
          {mode !== 'complete-reset' && (
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl gap-3 border-border/60 hover:bg-muted/50 font-bold text-xs uppercase tracking-widest transition-all"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <Chrome className="h-4 w-4" />
              Continue with Google
            </Button>
          )}

          {mode !== 'complete-reset' && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em]"><span className="bg-background px-4 text-muted-foreground/60">Or email</span></div>
            </div>
          )}

          <form onSubmit={
            mode === 'forgot' ? handleResetRequest : 
            handleCredentialsAuth
          } className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={resetSent}
                    className="w-full pl-11 pr-4 h-11 rounded-xl border border-border/60 bg-muted/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium disabled:opacity-50"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-12 h-11 rounded-xl border border-border/60 bg-muted/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {resetSent && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl animate-in zoom-in-95 duration-300">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest text-center leading-relaxed">
                    Instructions Have Been Sent To Your Inbox. Refreshing To Home Soon.
                  </p>
                </div>
              )}
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-border/60 text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">Keep logged in</span>
                </label>
                <button type="button" onClick={() => setMode('forgot')} className="text-[11px] font-bold text-primary hover:underline uppercase tracking-wider">Forgot?</button>
              </div>
            )}

            <Button type="submit" className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-[0.15em] shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Register' : 'Reset Password'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {mode === 'login' ? "New here?" : "Joined already?"}{' '}
          <button 
            type="button" 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')} 
            className="text-primary hover:underline decoration-2 underline-offset-4"
          >
            {mode === 'login' ? 'Create Account' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
