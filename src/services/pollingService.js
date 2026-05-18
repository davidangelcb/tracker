import { syncPendingPhotos } from "./syncService";
import { dbEvents, DB_EVENTS } from "./dbEvents";
import { useGlobalStore } from "../store/useGlobalStore";
import { getPhotosBySection } from "./db";

let intervalId = null;
let pollingRunning = false;

export function startPhotoPolling() {
  if (pollingRunning) return;

  const enable = import.meta.env.VITE_ENABLE_PHOTO_POLLING === "true";
  const POLLING_INTERVAL = Number(import.meta.env.VITE_POLLING_INTERVAL || 5000);
  
  if (!enable) {
    // console.log("[Polling] DESACTIVADO por .env");
    return;
  }

  console.log("[Polling] ACTIVATED (every 10 seconds)");

  pollingRunning = true;

  intervalId = setInterval(async () => {
    try {
      await syncPendingPhotos();
      console.log("[Polling] Searching for changes in the cloud (every " + POLLING_INTERVAL + " milliseconds)");
    } catch (e) {
      console.warn("Error in syncPendingPhotos:", e);
    }
  }, POLLING_INTERVAL);

  // Linqueo automático con UI
  listenPhotoEvents();
}

export function stopPhotoPolling() {
  if (intervalId) clearInterval(intervalId);
  pollingRunning = false;
  intervalId = null;
}


// Cuando hay cambios en IndexedDB, reinyectar al store global
function listenPhotoEvents() {
  dbEvents.onmessage = async (event) => {
    const { type } = event.data;
    if (!type) return;

    switch (type) {
      case DB_EVENTS.PHOTO_ADDED:
      case DB_EVENTS.PHOTO_UPDATED:
      case DB_EVENTS.PHOTO_DELETED:
        refreshUISections();
        break;
    }
  };
}

// Refresca todas las fotos dentro del store global
async function refreshUISections() {
  const state = useGlobalStore.getState();
  const { initialConfig, setInitialConfig } = state;

  if (!initialConfig?.tags) return;

  const newTags = [];
  for (const tag of initialConfig.tags) {
    const beforePhotos = await getPhotosBySection(tag.id, "before");
    const afterPhotos = await getPhotosBySection(tag.id, "after");

    newTags.push({
      ...tag,
      beforePhotos,
      afterPhotos,
    });
  }

  setInitialConfig({
    ...initialConfig,
    tags: newTags,
  });
}
