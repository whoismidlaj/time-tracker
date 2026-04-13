import { EventEmitter } from 'events';

// Singleton instance for the whole application process
class SyncEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many concurrent connections
  }

  // Broadcaster for status updates
  broadcastStatus(userId, data) {
    console.log(`[SyncEvents] Broadcasting status-update to User ${userId}:`, data.status);
    this.emit(`status-update:${userId}`, data);
  }

  // Broadcaster for settings updates
  broadcastSettings(userId, data) {
    console.log(`[SyncEvents] Broadcasting settings-update to User ${userId}`);
    this.emit(`settings-update:${userId}`, data);
  }
}

// In Next.js dev mode, the global object is preserved between HMR reloads
const globalSyncEvents = global.syncEvents || new SyncEvents();
if (process.env.NODE_ENV !== 'production') global.syncEvents = globalSyncEvents;

export default globalSyncEvents;
