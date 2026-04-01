import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import api from './api';

const QUEUE_KEY = '@time-track/pending-actions';
const STATUS_KEY = '@time-track/local-status';

export interface PendingAction {
  id: string;
  type: 'session' | 'break' | 'note';
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload: any;
  timestamp: number;
}

export interface LocalStatus {
  status: 'working' | 'break' | 'off';
  session: any;
  activeBreak: any;
  breaks: any[];
  lastUpdated: number;
}

class SyncManager {
  private isSyncing = false;
  private listeners: ((data: any) => void)[] = [];

  subscribe(callback: (data: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify(data: any) {
    this.listeners.forEach(l => l(data));
  }

  async getQueue(): Promise<PendingAction[]> {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async saveQueue(queue: PendingAction[]) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async clearQueue() {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  }

  async getLocalStatus(): Promise<LocalStatus | null> {
    const data = await AsyncStorage.getItem(STATUS_KEY);
    return data ? JSON.parse(data) : null;
  }

  async saveLocalStatus(status: LocalStatus) {
    await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status));
  }

  async clearLocalStatus() {
    await AsyncStorage.removeItem(STATUS_KEY);
  }

  async addAction(action: Omit<PendingAction, 'id' | 'timestamp'>) {
    const queue = await this.getQueue();
    const newAction: PendingAction = {
      ...action,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    queue.push(newAction);
    await this.saveQueue(queue);
    
    // Attempt immediate sync if possible
    this.sync();
  }

  async sync() {
    if (this.isSyncing) return;
    
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected || !state.isInternetReachable) return;

    this.isSyncing = true;
    try {
      let queue = await this.getQueue();
      const idMap: Record<string, string> = {};
      
      while (queue.length > 0) {
        const action = queue[0];
        try {
          const method = action.method.toLowerCase() as 'post' | 'patch' | 'delete';
          
          // --- ID Resolution ---
          let isOrphan = false;
          if (action.payload?.sessionId && typeof action.payload.sessionId === 'string' && action.payload.sessionId.startsWith('tmp-')) {
             if (idMap[action.payload.sessionId]) {
               action.payload.sessionId = idMap[action.payload.sessionId];
             } else {
               isOrphan = true;
             }
          }
          if (action.payload?.breakId && typeof action.payload.breakId === 'string' && action.payload.breakId.startsWith('tmp-')) {
             if (idMap[action.payload.breakId]) {
               action.payload.breakId = idMap[action.payload.breakId];
             } else {
               isOrphan = true;
             }
          }

          if (isOrphan) {
            console.warn('Dropping orphaned sync action:', action.id);
            queue.shift();
            await this.saveQueue(queue);
            continue;
          }
          
          const res = await api[method](action.endpoint, action.payload);
          
          // Store actual IDs for subsequent actions in the queue
          if (action.payload?.offlineSessionId && res.data?.session?.id) {
             idMap[action.payload.offlineSessionId] = res.data.session.id;
          }
          if (action.payload?.offlineBreakId && res.data?.break?.id) {
             idMap[action.payload.offlineBreakId] = res.data.break.id;
          }
          
          // Notify listeners with fresh server state
          if (res.data) {
            this.notify(res.data);
          }
          
          // Remove from queue on success
          queue.shift();
          await this.saveQueue(queue);
        } catch (err: any) {
          // If it's a 401 error, the session is likely expired.
          // In this case, we STOP the sync loop but KEEP the action in the queue
          // so it can be retried once the user logs in again.
          if (err.response?.status === 401) {
            console.warn('Sync paused: Session expired (401). Retrying after re-auth.');
            break; 
          }

          // If it's a 500 error from an old offline payload that we cannot resolve, drop it to avoid blocking the queue.
          if (err.response?.status === 500 && (action.payload?.sessionId?.toString().startsWith('tmp-') || action.payload?.breakId?.toString().startsWith('tmp-'))) {
            console.error('Dropping fatal 500 error due to unresolvable tmp- ID:', action, err.message);
            queue.shift();
            await this.saveQueue(queue);
            continue;
          }

          if (err.response?.status && err.response.status < 500) {
            console.error('Action failed, dropping:', action, err.message);
            queue.shift();
            await this.saveQueue(queue);
          } else {
            console.warn('Sync failed for action:', action.id, err.message);
            break; 
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

export default new SyncManager();
