"use client";
import { useEffect, useState, useCallback } from 'react';
import { getPendingActions, deleteAction } from '../lib/offline-db.js';
import { toast } from '../lib/use-toast.js';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export function SyncManager({ onSyncComplete }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const checkPending = useCallback(async () => {
    const pending = await getPendingActions();
    setPendingCount(pending.length);
    return pending;
  }, []);

  const performSync = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    
    const pending = await getPendingActions();
    if (pending.length === 0) return;

    setSyncing(true);
    toast({ title: 'Syncing...', description: `Pushing ${pending.length} offline actions to server.` });

    try {
      for (const action of pending) {
        const res = await fetch(action.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.body),
        });

        if (res.ok) {
          await deleteAction(action.id);
        } else {
          console.error('Failed to sync action:', action);
        }
      }
      
      const remaining = await checkPending();
      if (remaining.length === 0) {
        toast({ title: 'Sync complete', description: 'All offline actions have been synchronized.', variant: 'success' });
        if (onSyncComplete) onSyncComplete();
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast({ title: 'Sync failed', description: 'Will retry when back online.', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }, [syncing, onSyncComplete, checkPending]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    checkPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync, checkPending]);

  if (!isOnline) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
        <div className="bg-destructive text-destructive-foreground px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg ring-4 ring-destructive/20 uppercase tracking-wider">
          <WifiOff className="h-3.5 w-3.5" />
          Offline Mode
        </div>
      </div>
    );
  }

  if (pendingCount > 0 || syncing) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
        <button 
          onClick={performSync}
          disabled={syncing}
          className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg ring-4 ring-emerald-500/20 uppercase tracking-wider hover:bg-emerald-600 transition-colors"
        >
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
          {syncing ? 'Syncing...' : `${pendingCount} Pending Sync`}
        </button>
      </div>
    );
  }

  return null;
}
