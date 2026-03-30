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

  async getQueue(): Promise<PendingAction[]> {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async saveQueue(queue: PendingAction[]) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
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
      
      while (queue.length > 0) {
        const action = queue[0];
        try {
          const method = action.method.toLowerCase() as 'post' | 'patch' | 'delete';
          await api[method](action.endpoint, action.payload);
          
          // Remove from queue on success
          queue.shift();
          await this.saveQueue(queue);
        } catch (err: any) {
          // If it's a 4xx error (validation/logic), we might want to drop it
          // If it's 5xx or network, stop syncing for now
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
