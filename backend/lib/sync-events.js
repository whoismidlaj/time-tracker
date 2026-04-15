import { EventEmitter } from 'events';

class SyncEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this.io = null;
  }

  setIO(io) {
    this.io = io;
  }

  broadcastStatus(userId, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('status-update', data);
    }
    this.emit(`status-update:${userId}`, data);
  }

  broadcastSettings(userId, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('settings-update', data);
    }
    this.emit(`settings-update:${userId}`, data);
  }
}

const syncEvents = new SyncEvents();
export default syncEvents;
