// src/services/realtimeHandlers.js
import { fetchPhotoById } from "./api";
import { addPhoto, hasPhotoByIdPhoto, updatePhotoByRemoteId } from "./db";

export async function handlePhotoNotification(message) {
  try {
    const { id: incomingId } = message;
    if (!incomingId) return;

    console.log("Photo notification received", message);

    // 1) Traer metadata real desde backend
    const raw = await fetchPhotoById(incomingId);
    if (!raw) return;

    const {
      id: idPhoto,        // ID REAL de la foto
      idCategory,         // sectionId
      tab,                // "before" | "after"
      downloadUrl,
    } = raw;

    if (!idPhoto || !idCategory || !tab || !downloadUrl) {
      console.warn("[WS] Incomplete photo payload:", raw);
      return;
    }

    // 2) SI YA EXISTE EN INDEXEDDB → OMITIR
    // (caso: el mismo usuario que subió la foto)
    const alreadyHaveIt = await hasPhotoByIdPhoto(idPhoto);
    if (alreadyHaveIt) {
      console.log("[WS] Own photo already in IndexedDB, skipping:", idPhoto);
      return;
    }

    // 3) Descargar blob real desde S3
    const res = await fetch(downloadUrl, { cache: "no-store" });
    if (!res.ok) {
      console.warn(
        "[WS] Failed to download photo blob:",
        res.status,
        downloadUrl
      );
      return;
    }

    const blob = await res.blob();

    // 4) Guardar en IndexedDB
    await addPhoto(
      idCategory,  // sectionId
      blob,
      tab,         // tabType
      false,       // local = false (viene del backend)
      downloadUrl, // url remota
      idPhoto      // idPhoto remoto
    );

    console.log("[WS] photo saved in IndexedDB", idPhoto);

    // NO emitir evento aquí
    // addPhoto() ya emite PHOTO_ADDED correctamente

  } catch (err) {
    console.error("Error processing photo notification", err);
  }
}

export async function handlePhotoRemoveNotification(message) {
  try {
    const { id: idPhoto } = message;
    if (!idPhoto) return;

    console.log("[WS] remove photo received:", idPhoto);

    // Verificar si existe localmente
    const exists = await hasPhotoByIdPhoto(idPhoto);
    if (!exists) {
      console.log("[WS] photo not found locally, skipping remove:", idPhoto);
      return;
    }

    // Marcar como deleted (NO borrar)
    await updatePhotoByRemoteId(idPhoto);

  } catch (err) {
    console.error("Error processing photo remove notification", err);
  }
}