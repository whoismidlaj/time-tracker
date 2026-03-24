"use client";
import { useState } from 'react';
import { Button } from './ui/button.jsx';
import { toast } from '../lib/use-toast.js';

export function AuthForm({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Validation', description: 'Email and password are required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      toast({ title: mode === 'login' ? 'Logged in' : 'Registered', description: `Welcome ${email}!`, variant: 'success' });
      onAuthenticated(data.user);
    } catch (err) {
      toast({ title: 'Auth error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 rounded-xl border border-border/50 bg-card">
      <h2 className="text-2xl font-bold mb-4 text-center">{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-border px-3 py-2 bg-background text-foreground"
        />
        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-md border border-border px-3 py-2 bg-background text-foreground"
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Working…' : mode === 'login' ? 'Login' : 'Register'}
        </Button>
      </form>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        {mode === 'login' ? 'New? ' : 'Already have an account? '}
        <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-medium text-primary underline">
          {mode === 'login' ? 'Create account' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
