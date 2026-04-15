import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { io, Socket } from 'socket.io-client';
import SyncManager, { LocalStatus } from '../lib/SyncManager';
import api, { setAuthErrorCallback, API_URL } from '../lib/api';

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface AuthContextType {
  isAuth: boolean;
  user: any;
  loading: boolean;
  syncStatus: SyncStatus;
  status: 'working' | 'break' | 'off';
  session: any;
  activeBreak: any;
  breaks: any[];
  serverOffset: number;
  signIn: (token: string, user: any) => Promise<void>;
  signOut: () => Promise<void>;
  performAction: (action: any) => Promise<void>;
  refreshStatus: (force?: boolean) => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateState: (data: any) => void;
  clearPendingSyncs: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  
  // Master Dashboard State
  const [status, setStatus] = useState<'working' | 'break' | 'off'>('off');
  const [session, setSession] = useState<any>(null);
  const [activeBreak, setActiveBreak] = useState<any>(null);
  const [breaks, setBreaks] = useState<any[]>([]);
  const [serverOffset, setServerOffset] = useState<number>(0);

  useEffect(() => {
    const loadAuth = async () => {
      const token = await SecureStore.getItemAsync('userToken');
      const userData = await SecureStore.getItemAsync('userData');
      if (token && userData) {
        setIsAuth(true);
        setUser(JSON.parse(userData));
      }
      setLoading(false);
    };
    loadAuth();
  }, []);

  // Global Auth Failure Listener
  useEffect(() => {
    setAuthErrorCallback(() => {
      if (isAuth) signOut();
    });
    return () => setAuthErrorCallback(() => {});
  }, [isAuth]);

  const refreshSettings = useCallback(async () => {
    if (!isAuth) return;
    try {
      const { data } = await api.get('/user/settings');
      if (data.settings && Object.keys(data.settings).length > 0) {
        await SecureStore.setItemAsync('appSettings', JSON.stringify(data.settings));
      }
    } catch (err) {
      console.warn('Settings sync failed');
    }
  }, [isAuth]);

  const refreshStatus = useCallback(async (force = false) => {
    if (!isAuth) return;
    try {
      // 1. If we have pending offline actions, SKIP refresh unless forced 
      // This prevents background polling from clobbering optimistic UI
      if (!force && await SyncManager.hasPendingActions()) {
        console.log('Skipping background refresh: sync in progress');
        return;
      }

      // 2. Sync settings first 
      await refreshSettings();
      
      // 3. Fetch server status
      const { data } = await api.get('/status');
      setStatus(data.status || 'off');
      setSession(data.session || null);
      setActiveBreak(data.activeBreak || null);
      setBreaks(data.breaks || []);
      if (data.server_time) {
        setServerOffset(Date.now() - new Date(data.server_time).getTime());
      }
      
      // Persist locally
      await SyncManager.saveLocalStatus({
        status: data.status,
        session: data.session,
        activeBreak: data.activeBreak,
        breaks: data.breaks || [],
        lastUpdated: Date.now()
      });
    } catch (err) {
      console.warn('Status refresh failed');
    }
  }, [isAuth, refreshSettings]);

  const clearPendingSyncs = async () => {
    await SyncManager.clearQueue();
    setSyncStatus('synced');
    refreshStatus(true);
  };

  // Sync Manager Success Listener
  useEffect(() => {
    const unsubscribe = SyncManager.subscribe((data) => {
      if (data.status) setStatus(data.status);
      if (data.hasOwnProperty('session')) setSession(data.session);
      if (data.hasOwnProperty('activeBreak')) setActiveBreak(data.activeBreak);
      if (data.hasOwnProperty('breaks')) setBreaks(data.breaks);
      
      // Update local storage too
      SyncManager.saveLocalStatus({
        status: data.status || status,
        session: data.hasOwnProperty('session') ? data.session : session,
        activeBreak: data.hasOwnProperty('activeBreak') ? data.activeBreak : activeBreak,
        breaks: data.hasOwnProperty('breaks') ? data.breaks : breaks,
        lastUpdated: Date.now()
      });
    });
    return unsubscribe;
  }, [status, session, activeBreak, breaks]);

  // Sync Manager Failure/Refresh Listener
  useEffect(() => {
    const unsubscribe = SyncManager.subscribeRefresh(() => {
      console.log('SyncManager requested a forced refresh');
      refreshStatus(true);
    });
    return unsubscribe;
  }, [refreshStatus]);

  // Real-time Push Synchronization (WebSockets)
  useEffect(() => {
    if (!isAuth) return;

    let socket: Socket | null = null;

    const setupWebSockets = async () => {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      // Connect to the base server (e.g. http://192.168.10.x:5000)
      const socketUrl = API_URL.replace('/api', '');
      socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'], // Faster and more reliable on mobile
      });

      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      socket.on('status-update', async (data) => {
        if (!data) return;
        
        // --- Backend Authority: Reconcile pending queue with fresh backend state ---
        await SyncManager.reconcileQueue(data.status);

        setStatus(data.status || 'off');
        setSession(data.session || null);
        setActiveBreak(data.activeBreak || null);
        setBreaks(data.breaks || []);
        if (data.server_time) {
          setServerOffset(Date.now() - new Date(data.server_time).getTime());
        }
        
        SyncManager.saveLocalStatus({
          status: data.status,
          session: data.session,
          activeBreak: data.activeBreak,
          breaks: data.breaks || [],
          lastUpdated: Date.now()
        });
      });

      socket.on('settings-update', () => {
        refreshSettings();
      });

      socket.on('connect_error', (err) => {
        console.warn('WebSocket Connection error:', err.message);
      });
    };

    setupWebSockets();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuth, refreshSettings]);

  // Background Sync Loop (Offline-First reconciliation only)
  useEffect(() => {
    if (isAuth) {
      refreshStatus(); // Initial sync on login
      const interval = setInterval(async () => {
        setSyncStatus('syncing');
        try {
          // Only perform the sync (pushing local actions to server)
          await SyncManager.sync();
          setSyncStatus('synced');
        } catch (err) {
          setSyncStatus('error');
        }
      }, 60000); // 1 minute safety check is enough with SSE active
      return () => clearInterval(interval);
    }
  }, [isAuth, refreshStatus]);

  // AppState Foreground Refresh
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuth) {
        refreshStatus();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuth, refreshStatus]);

  const signIn = async (token: string, userData: any) => {
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userData', JSON.stringify(userData));
    setIsAuth(true);
    setUser(userData);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
    await SyncManager.clearLocalStatus();
    // Also sign out from Google if they used Google login
    try { await GoogleSignin.signOut(); } catch (_) {}
    setIsAuth(false);
    setUser(null);
  };

  const performAction = async (action: any) => {
    // Add to sync queue for offline processing
    await SyncManager.addAction(action);
    // Note: addAction already triggers SyncManager.sync()
  };

  const updateState = (data: any) => {
    if (data.status) setStatus(data.status);
    if (data.hasOwnProperty('session')) setSession(data.session);
    if (data.hasOwnProperty('activeBreak')) setActiveBreak(data.activeBreak);
    if (data.hasOwnProperty('breaks')) setBreaks(data.breaks);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuth,
      user,
      loading, 
      syncStatus, 
      status,
      session,
      activeBreak,
      breaks,
      serverOffset,
      signIn, 
      signOut, 
      performAction,
      refreshStatus,
      refreshSettings,
      updateState,
      clearPendingSyncs
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
