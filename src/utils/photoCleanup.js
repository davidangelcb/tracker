import { getDB } from "../services/db";
import { dbEvents, DB_EVENTS } from "../services/dbEvents";

/**
 * Limpia las fotos eliminadas localmente que nunca fueron subidas.
 * Las que tienen null en idPhoto.
 */
export const cleanupLocallyDeletedPhotos = async (all = []) => {
  // Filtrar las fotos que están marcadas como eliminadas
  // pero no tienen idPhoto (null, undefined o string vacío)
  const locallyDeleted = all.filter(
    (p) =>
      p.deleted &&
      (p.idPhoto === null || p.idPhoto === undefined || p.idPhoto === "")
  );

  if (locallyDeleted.length === 0) return;

  console.log(
    "Deleting local-only photos (without idPhoto)...",
    locallyDeleted
  );

  // Open DB
  const db = await getDB();
  const tx = db.transaction("photos", "readwrite");
  const store = tx.objectStore("photos");

  // Delete one by one
  for (const photo of locallyDeleted) {
    await store.delete(photo.id);

    // Notify other tabs
    dbEvents.postMessage({
      type: DB_EVENTS.PHOTO_DELETED,
      payload: { id: photo.id },
    });
  }

  await tx.done;
};
