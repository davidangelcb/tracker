// syncScheduler.js
import { syncPendingPhotos } from "./syncService";

let intervalId = null;

export function startSyncScheduler() {
  if (intervalId) return;

  intervalId = setInterval(() => {
    syncPendingPhotos();
  }, 6000);
}
