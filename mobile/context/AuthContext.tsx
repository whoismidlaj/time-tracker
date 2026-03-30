import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import SyncManager, { LocalStatus } from '../lib/SyncManager';
import api from '../lib/api';

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface AuthContextType {
  isAuth: boolean;
  user: any;
  loading: boolean;
  syncStatus: SyncStatus;
  signIn: (token: string, user: any) => Promise<void>;
  signOut: () => Promise<void>;
  performAction: (action: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

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

  // Background Sync Loop
  useEffect(() => {
    if (isAuth) {
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
  }, [isAuth]);

  const signIn = async (token: string, userData: any) => {
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userData', JSON.stringify(userData));
    setIsAuth(true);
    setUser(userData);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
    setIsAuth(false);
    setUser(null);
  };

  const performAction = async (action: any) => {
    // Add to sync queue for offline processing
    await SyncManager.addAction(action);
    // Trigger sync immediately to try it
    SyncManager.sync();
  };

  return (
    <AuthContext.Provider value={{ 
      isAuth, 
      user, 
      loading, 
      syncStatus, 
      signIn, 
      signOut, 
      performAction 
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
