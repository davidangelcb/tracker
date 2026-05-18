import { getDB } from "./db";
// import { dbEvents, DB_EVENTS } from "./dbEvents";

const STORE_PHOTOS = "photos";

/**
 * Hace que IndexedDB sea un reflejo exacto del backend
 * sin reemplazar blobs locales existentes
 */
export async function syncRemotePhotosFromConfig(initialConfig) {
  if (!initialConfig?.tags?.length) return;

  const db = await getDB();
  const tx = db.transaction(STORE_PHOTOS, "readwrite");
  const store = tx.objectStore(STORE_PHOTOS);

  const allLocalPhotos = await store.getAll();

  // Limpiar fotos bloqueadas (solo en reload)
  // =====================================================
  const blockedPhotos = allLocalPhotos.filter(p => p.syncBlocked === true);

  if (blockedPhotos.length > 0) {
    console.warn("Removing syncBlocked photos on init:", blockedPhotos.length);

    for (const p of blockedPhotos) {
      await store.delete(p.id);
    }
  }
  // =====================================================
  
  for (const tag of initialConfig.tags) {
    const sectionId = tag.id;

    await syncTab({
      store,
      allLocalPhotos,
      sectionId,
      tabType: "before",
      backendList: tag.beforePhotos || [],
    });

    await syncTab({
      store,
      allLocalPhotos,
      sectionId,
      tabType: "after",
      backendList: tag.afterPhotos || [],
    });
  }

  await tx.done;
}

/**
 * Reconciliación exacta por sección + tab
 */
async function syncTab({
  store,
  allLocalPhotos,
  sectionId,
  tabType,
  backendList,
}) {
  const backendIds = new Set(
    backendList.map(p => p.idPhoto).filter(Boolean)
  );

  // Fotos locales de esta sección + tab
  const localPhotos = allLocalPhotos.filter(
    p => p.sectionId === sectionId && p.tabType === tabType
  );

  // ELIMINAR locales que ya no existen en backend
  for (const local of localPhotos) {
    if (local.idPhoto && !backendIds.has(local.idPhoto)) {
      await store.delete(local.id);
    }
  }

  // INSERTAR placeholders faltantes
  for (const idPhoto of backendIds) {
    const exists = localPhotos.some(p => p.idPhoto === idPhoto);
    if (exists) continue;

    await store.add({
      sectionId,
      tabType,
      idPhoto,
      local: false,
      buffer: null,
      blob: null,
      url: null,
      type: null,
      deleted: false,
      createdAt: Date.now(),
      fileNameS3: "",
    });
  }
}
