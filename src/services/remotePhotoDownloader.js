import { getDB, updatePhoto } from "./db";
import { toApiGetPhotosByCategory } from "./api";
import { dbEvents, DB_EVENTS } from "./dbEvents";
import { useGlobalStore } from "../store/useGlobalStore";

const STORE_PHOTOS = "photos";

/**
 * Descarga fotos reales del backend y las inyecta a IndexedDB, POR SECCIÓN.
 * Mientras una sección descarga, la UI de esa sección queda oculta (loader).
 */
export async function startRemotePhotoDownloader(initialConfig) {
  if (!initialConfig?.tags?.length) return;

  const trackerId = useGlobalStore.getState().uuid;
  if (!trackerId) return;

  const db = await getDB();

  // cache inicial para evitar db.getAll por cada remote
  const allLocal = await db.getAll(STORE_PHOTOS);
  const byIdPhoto = new Map(allLocal.map((p) => [p.idPhoto, p]));

  for (const tag of initialConfig.tags) {
    const sectionId = tag.id;

    // Inicia loader de sección
    useGlobalStore.getState().setSectionPhotoLoading(sectionId, true);

    try {
      const res = await toApiGetPhotosByCategory(trackerId, sectionId);
      const list = res?.photos || [];

      // Si no hay fotos en backend, igual marcamos sección como lista
      if (!list.length) continue;

      for (const remote of list) {
        const idPhoto = remote?._id;
        if (!idPhoto) continue;

        // Normalizar tab
        const tabType = remote.tab || remote.tabType; // "before"/"after"
        if (!tabType) continue;

        // 1) Crear placeholder si no existe
        let local = byIdPhoto.get(idPhoto);

        if (!local) {
          const newId = await db.add(STORE_PHOTOS, {
            sectionId,
            tabType,
            idPhoto,
            local: false,
            deleted: false,
            createdAt: Date.now(),
            url: remote.downloadUrl || null,
            buffer: null,
            blob: null,
            type: null,
            fileNameS3: remote.fileNameS3 || "",
            date: remote.date || "",
            comment: remote.comment || "",
          });

          local = { id: newId, sectionId, tabType, idPhoto, buffer: null, blob: null };
          byIdPhoto.set(idPhoto, local);

          // refrescar UI de esa sección (sin mostrar aún si sigue loading)
          dbEvents.postMessage({
            type: DB_EVENTS.PHOTO_ADDED,
            sectionId,
            source: "remote-downloader",
          });
        }

        // 2) Si ya está descargada, skip
        if (local.buffer || local.blob) continue;

        // 3) Descargar y guardar
        const downloadUrl = remote.downloadUrl;
        if (!downloadUrl) continue;

        const blob = await fetch(downloadUrl).then((r) => r.blob());
        const buffer = await blob.arrayBuffer();

        await updatePhoto(local.id, {
          blob,
          buffer,
          type: blob.type,
          fileNameS3: remote.fileNameS3,
          date: remote.date,
          comment: remote.comment,
          local: false,
          url: downloadUrl,
          // si tu updatePhoto respeta _silent, genial; si no, no pasa nada
          _silent: true,
        });

        // actualizar cache local
        byIdPhoto.set(idPhoto, { ...local, blob, buffer });

        // Dispara update limpio
        dbEvents.postMessage({
          type: DB_EVENTS.PHOTO_UPDATED,
          sectionId,
          source: "remote-downloader",
        });
      }
    } catch (err) {
      console.warn(`Downloader error for section ${sectionId}:`, err?.message || err);
    } finally {
      // Termina loader de sección
      useGlobalStore.getState().setSectionPhotoLoading(sectionId, false);
      useGlobalStore.getState().markSectionPhotosReady(sectionId);

      // evento final de sección lista
      dbEvents.postMessage({
        type: DB_EVENTS.PHOTO_UPDATED,
        sectionId,
        source: "remote-downloader-section-ready",
      });
    }
  }
}
