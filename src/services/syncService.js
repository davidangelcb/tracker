import { getDB } from "./db";
import { updatePhoto } from "./db";
import { dbEvents, DB_EVENTS } from "./dbEvents";
import { uploadToS3Blob, deletePhoto } from "./api";
import { useGlobalStore } from "../store/useGlobalStore";
import { cleanupLocallyDeletedPhotos } from "../utils/photoCleanup";

let syncing = false;

export async function syncPendingPhotos() {

  const { setHasPendingSync } = useGlobalStore.getState();

  if (syncing) return; // evita overlap
  syncing = true;

  const { setSyncingPhotos } = useGlobalStore.getState();
  let hasWork = false;

  try {    
    const db = await getDB();
    const tx = db.transaction("photos", "readonly");
    const store = tx.objectStore("photos");
    const all = await store.getAll();

    const toUpload = all.filter(
      p => p.local && !p.deleted && !p.syncBlocked
    );

    cleanupLocallyDeletedPhotos(all)
      .catch(err => console.error("Cleanup error:", err));

    const toDelete = all.filter(p => p.deleted && !!p.idPhoto);

    const hasPending = toUpload.length > 0 || toDelete.length > 0;
    setHasPendingSync(hasPending);

    if (!hasPending) {
      return;
    }

    console.log("Searching for local photos with status LOCAL=TRUE to sync");

    hasWork = toUpload.length > 0 || toDelete.length > 0;

    if (!hasWork) {
      return; // salimos sin tocar UI
    }

    setSyncingPhotos(true);

    // ----------------------------------
    // SUBIR FOTOS
    // ----------------------------------
    for (const photo of toUpload) {
      try {
        // console.log('========================================================')
        // console.log("Uploading photo to the cloud - ID:", photo.id);

        // Creamos el Blob real desde el buffer guardado
        const blob = new Blob([photo.buffer], { type: photo.type });

        // Llamamos al API puente
        const response = await uploadToS3Blob(
          blob,
          photo.fileName || `photo_${photo.id}_${Date.now()}`,  // nombre local (si no existe)
          photo.type,
          blob.size,
          photo.sectionId,
          photo.tabType,
          photo.id
        );

        // ---------------------------------------------------------
        // IndexedDB
        // ---------------------------------------------------------
        await updatePhoto(photo.id, {
          local: false,
          url: response.url,
          fileNameS3: response.fileNameS3,
          idPhoto: response.idPhoto,
          _silent: true, // flag interno
        });


      } catch (err) {
        if (err?.code === "PHOTO_REJECTED") {
          await updatePhoto(photo.id, { syncBlocked: true });
          continue;
        }

        console.warn("Unable to sync photo", photo.id, err);
      }
    }

    // ----------------------------------
    // ELIMINAR FOTOS REMOTAS
    // ----------------------------------
    for (const photo of toDelete) {
      try {
        await deletePhoto(
          photo.sectionId,
          photo.tabType,
          photo.idPhoto,
        );

        const db2 = await getDB();
        const tx2 = db2.transaction("photos", "readwrite");
        await tx2.objectStore("photos").delete(photo.id);
        await tx2.done;

        dbEvents.postMessage({
          type: DB_EVENTS.PHOTO_DELETED,
          payload: { id: photo.id },
          source: "sync",
        });

      } catch (err) {
        const msg = err?.response?.data?.error || "";

        // Caso: la foto ya fue eliminada en otro dispositivo
        if (msg === "delete failed") {
          console.warn(
            "Photo already deleted remotely, cleaning local copy:",
            photo.idPhoto
          );

          // Eliminar localmente
          const db2 = await getDB();
          const tx2 = db2.transaction("photos", "readwrite");
          await tx2.objectStore("photos").delete(photo.id);
          await tx2.done;

          // Notificar UI
          dbEvents.postMessage({
            type: DB_EVENTS.PHOTO_DELETED,
            payload: { id: photo.id },
            source: "sync",
          });

          continue; // NO reintentar
        }

        // Si hay otros errores dejamos para retry
        console.warn("Delete failed, will retry later:", err);
      }
    }
  } finally {
    syncing = false;
    setSyncingPhotos(false);
    // useGlobalStore.getState().setHasPendingSync(false);
  }
}
