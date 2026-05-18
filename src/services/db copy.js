import { openDB } from "idb";
import { useGlobalStore } from "../store/useGlobalStore";

const DB_VERSION = 2;
const STORE_PHOTOS = "photos";
const STORE_CONFIG = "config";
const STORE_VIDEOS = "videos";

let dbInstance = null;
let dbReadyPromise = null;

/* --------------------------------------------------
 * INIT
 * -------------------------------------------------- */
export function initDB(dbName) {
  if (!dbReadyPromise) {
    dbReadyPromise = openDB(dbName, DB_VERSION, {
      upgrade(db) {
        // PHOTOS
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          const store = db.createObjectStore(STORE_PHOTOS, {
            keyPath: "id",
            autoIncrement: true,
          });

          store.createIndex("sectionId", "sectionId");
          store.createIndex("tabType", "tabType");
          store.createIndex("sectionId_tabType", ["sectionId", "tabType"]);
        }

        // CONFIG
        if (!db.objectStoreNames.contains(STORE_CONFIG)) {
          db.createObjectStore(STORE_CONFIG, { keyPath: "key" });
        }

        // VIDEOS
        if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
          const store = db.createObjectStore(STORE_VIDEOS, {
            keyPath: "id",
            autoIncrement: true,
          });

          store.createIndex("sectionId", "sectionId");
          store.createIndex("tabType", "tabType");
          store.createIndex("sectionId_tabType", ["sectionId", "tabType"]);
          store.createIndex("status", "status");
        }
      },
    }).then((db) => {
      dbInstance = db;
      return db;
    });
  }

  return dbReadyPromise;
}

export async function getDB() {
  if (dbInstance) return dbInstance;

  if (!dbReadyPromise) {
    throw new Error("IndexedDB is not initialized");
  }

  dbInstance = await dbReadyPromise;
  return dbInstance;
}

/* --------------------------------------------------
 * HELPERS
 * -------------------------------------------------- */
function hasStore(db, storeName) {
  return db.objectStoreNames.contains(storeName);
}

/* --------------------------------------------------
 * CONFIG
 * -------------------------------------------------- */
export async function getStoreConfig(key) {
  const db = await getDB();

  if (!hasStore(db, STORE_CONFIG)) return null;

  return (await db.get(STORE_CONFIG, key))?.value ?? null;
}

export async function saveStoreConfig(key, value) {
  const db = await getDB();

  if (!hasStore(db, STORE_CONFIG)) return;

  await db.put(STORE_CONFIG, { key, value });
}

/* --------------------------------------------------
 * PHOTOS
 * -------------------------------------------------- */
export const addPhoto = async (
  sectionId,
  blob,
  tabType,
  local,
  url,
  idPhoto
) => {
  const db = await getDB();

  // SAFARI SAFE
  if (!hasStore(db, STORE_PHOTOS)) {
    console.warn("[DB] photos store not found, skipping addPhoto");
    return;
  }

  const buffer = await blob.arrayBuffer();

  await db.add(STORE_PHOTOS, {
    sectionId,
    buffer,
    type: blob.type,
    tabType,
    createdAt: Date.now(),
    local,
    url,
    idPhoto,
    deleted: false,
    fileNameS3: "",
  });

  // señal determinista para UI
  useGlobalStore.getState().bumpPhotosRevision();
};

export const updatePhoto = async (id, data) => {
  const db = await getDB();

  if (!hasStore(db, STORE_PHOTOS)) return;

  const tx = db.transaction(STORE_PHOTOS, "readwrite");
  const store = tx.objectStore(STORE_PHOTOS);

  const item = await store.get(id);
  if (!item) return;

  await store.put({ ...item, ...data });
  await tx.done;

  // CLAVE: si es sync, NO refrescar UI
  if (!data?._silent) {
    useGlobalStore.getState().bumpPhotosRevision();
  }
};

const revivePhoto = (item) => {
  if (!item?.buffer) return null;

  const blob = new Blob([item.buffer], {
    type: item.type || "image/jpeg",
  });

  return {
    ...item,
    url: URL.createObjectURL(blob),
  };
};

export const getPhotosBySection = async (sectionId, tabType) => {
  const db = await getDB();

  // SAFARI SAFE
  if (!hasStore(db, STORE_PHOTOS)) return [];

  const tx = db.transaction(STORE_PHOTOS, "readonly");
  const store = tx.objectStore(STORE_PHOTOS);
  const index = store.index("sectionId_tabType");

  const items = await index.getAll([sectionId, tabType]);
  await tx.done;

  // return items.map(revivePhoto).filter(Boolean);
  return items
    .filter(
      (p) => !p.deleted && !p.syncBlocked
    )
    .map(revivePhoto)
    .filter(Boolean);

};

export const deletePhoto = async (id) => {
  const db = await getDB();

  if (!hasStore(db, STORE_PHOTOS)) return;

  await updatePhoto(id, { deleted: true });
};

export async function hasPhotoByIdPhoto(idPhoto) {
  if (!idPhoto) return false;

  const db = await getDB();

  // SAFARI SAFE
  if (!hasStore(db, STORE_PHOTOS)) return false;

  const all = await db.getAll(STORE_PHOTOS);
  return all.some((p) => p?.idPhoto === idPhoto);
}

export async function updatePhotoByRemoteId(idPhoto) {
  const db = await getDB();
  const tx = db.transaction("photos", "readwrite");
  const store = tx.objectStore("photos");
  const all = await store.getAll();

  const target = all.find(p => p.idPhoto === idPhoto);
  if (!target) {
    await tx.done;
    return;
  }

  await store.put({
    ...target,
    deleted: true,
    local: false,        // clave: ya no es local
    syncBlocked: true,   // evita resubidas
  });

  await tx.done;

  // notificar UI
  useGlobalStore.getState().bumpPhotosRevision();
}

/* --------------------------------------------------
 * VIDEOS
 * -------------------------------------------------- */
const reviveVideo = (item) => {
  if (!item) return null;

  if (item?.buffer) {
    const blob = new Blob([item.buffer], {
      type: item.type || "video/webm",
    });

    return {
      ...item,
      blob,
      videoUrl: URL.createObjectURL(blob),
    };
  }

  const remoteUrl = item?.downloadUrl || item?.fileNameS3 || "";

  if (remoteUrl) {
    return {
      ...item,
      blob: null,
      videoUrl: remoteUrl,
    };
  }

  return {
    ...item,
    blob: null,
    videoUrl: "",
  };
};

export const addVideo = async (sectionId, blob, tabType) => {
  const db = await getDB();

  if (!hasStore(db, STORE_VIDEOS)) {
    console.warn("[DB] videos store not found, skipping addVideo");
    return null;
  }

  const buffer = await blob.arrayBuffer();

  const id = await db.add(STORE_VIDEOS, {
    sectionId,
    tabType,
    buffer,
    type: blob.type || "video/webm",
    size: blob.size || 0,
    createdAt: new Date().toISOString(),
    local: true,
    deleted: false,
    status: "local",
    uploadProgress: 0,
    videoID: null,
    fileNameS3: "",
  });

  return id;
};

export const updateVideo = async (id, data) => {
  const db = await getDB();

  if (!hasStore(db, STORE_VIDEOS)) return null;

  const tx = db.transaction(STORE_VIDEOS, "readwrite");
  const store = tx.objectStore(STORE_VIDEOS);

  const item = await store.get(id);
  if (!item) {
    await tx.done;
    return null;
  }

  const updated = { ...item, ...data };
  await store.put(updated);
  await tx.done;

  return updated;
};

export const getVideoBySection = async (sectionId, tabType) => {
  const db = await getDB();

  if (!hasStore(db, STORE_VIDEOS)) return null;

  const tx = db.transaction(STORE_VIDEOS, "readonly");
  const store = tx.objectStore(STORE_VIDEOS);
  const index = store.index("sectionId_tabType");

  const items = await index.getAll([sectionId, tabType]);
  await tx.done;

  const valid = items
    .filter((v) => !v.deleted)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!valid.length) return null;

  return reviveVideo(valid[0]);
};

export const getVideoByRemoteId = async (remoteVideoId) => {
  const db = await getDB();

  if (!hasStore(db, STORE_VIDEOS)) return null;
  if (!remoteVideoId) return null;

  const items = await db.getAll(STORE_VIDEOS);

  const valid = items
    .filter((v) => !v.deleted)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const found = valid.find(
    (item) =>
      item?.idVideo === remoteVideoId ||
      item?.videoID === remoteVideoId
  );

  return found ? reviveVideo(found) : null;
};

export const upsertRemoteVideo = async (data) => {
  const db = await getDB();

  if (!hasStore(db, STORE_VIDEOS)) return null;

  const remoteId = data?.idVideo || data?.videoID;
  if (!remoteId) return null;

  const tx = db.transaction(STORE_VIDEOS, "readwrite");
  const store = tx.objectStore(STORE_VIDEOS);
  const all = await store.getAll();

  const existing = all.find(
    (item) =>
      !item?.deleted &&
      (item?.idVideo === remoteId || item?.videoID === remoteId)
  );

  if (existing) {
    const updated = {
      ...existing,
      ...data,
      idVideo: data?.idVideo ?? existing?.idVideo ?? remoteId,
      videoID: data?.videoID ?? existing?.videoID ?? remoteId,
    };

    await store.put(updated);
    await tx.done;
    return updated;
  }

  const newItem = {
    sectionId: data?.sectionId ?? "",
    tabType: data?.tabType ?? "before",
    createdAt: data?.createdAt || new Date().toISOString(),
    local: false,
    deleted: false,
    status: data?.status || "uploaded",
    uploadProgress: 100,
    videoID: data?.videoID ?? remoteId,
    idVideo: data?.idVideo ?? remoteId,
    fileNameS3: data?.fileNameS3 ?? "",
    remoteResponse: data?.remoteResponse ?? null,
    acknowledged: data?.acknowledged ?? null,
    activeSummary: data?.activeSummary ?? null,
    jobStatus: data?.jobStatus ?? null,
    videoStatus: data?.videoStatus ?? null,
    images: Array.isArray(data?.images) ? data.images : [],
    downloadUrl: data?.downloadUrl ?? "",
    type: data?.type || "video/mp4",
    size: data?.size || 0,
  };

  const id = await store.add(newItem);
  await tx.done;

  return { ...newItem, id };
};

export const getAllVideos = async () => {
  const db = await getDB();

  if (!hasStore(db, STORE_VIDEOS)) return [];

  const items = await db.getAll(STORE_VIDEOS);

  return items
    .filter((v) => !v.deleted)
    .map(reviveVideo)
    .filter(Boolean);
};

export const deleteVideo = async (id) => {
  return updateVideo(id, { deleted: true });
};

export const getVideoBlobById = async (id) => {
  const db = await getDB();

  if (!hasStore(db, STORE_VIDEOS)) return null;

  const item = await db.get(STORE_VIDEOS, id);
  if (!item?.buffer) return null;

  return new Blob([item.buffer], {
    type: item.type || "video/webm",
  });
};

export const getVideoById = async (id) => {
  const db = await getDB();

  if (!hasStore(db, STORE_VIDEOS)) return null;
  if (!id) return null;

  const item = await db.get(STORE_VIDEOS, id);
  return item ? reviveVideo(item) : null;
};

