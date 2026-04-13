import { EventEmitter } from 'events';

class SyncEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  broadcastStatus(userId, data) {
    this.emit(`status-update:${userId}`, data);
  }

  broadcastSettings(userId, data) {
    this.emit(`settings-update:${userId}`, data);
  }
}

const syncEvents = new SyncEvents();
export default syncEvents;
