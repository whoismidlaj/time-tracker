import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import SyncManager, { LocalStatus } from '../lib/SyncManager';
import api, { setAuthErrorCallback } from '../lib/api';

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
  signIn: (token: string, user: any) => Promise<void>;
  signOut: () => Promise<void>;
  performAction: (action: any) => Promise<void>;
  refreshStatus: () => Promise<void>;
  updateState: (data: any) => void;
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

  const refreshStatus = useCallback(async () => {
    if (!isAuth) return;
    try {
      const { data } = await api.get('/status');
      setStatus(data.status || 'off');
      setSession(data.session || null);
      setActiveBreak(data.activeBreak || null);
      setBreaks(data.breaks || []);
      
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
  }, [isAuth]);

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

  // Background Sync Loop
  useEffect(() => {
    if (isAuth) {
      refreshStatus(); // Refresh on initial login
      const interval = setInterval(async () => {
        setSyncStatus('syncing');
        try {
          await SyncManager.sync();
          setSyncStatus('synced');
        } catch (err) {
          setSyncStatus('error');
        }
      }, 10000); // Sync every 10s
      return () => clearInterval(interval);
    }
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
    // Trigger sync immediately to try it
    SyncManager.sync();
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
      signIn, 
      signOut, 
      performAction,
      refreshStatus,
      updateState
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
