// import axios from "axios";
import api from "./http";
import React from "react";
import { useGlobalStore } from "../store/useGlobalStore";

const API_BASE = import.meta.env.DEV
? "http://localhost:3000/"
: "/";

export async function getInitialConfig(uuid) {
  try {
    const url = `${API_BASE}api/job?action=job`;
    const res = await api.get(url, {
      params: { id: uuid },
      timeout: 8000,
    });

    if (res.status !== 200 || !res.data) {
      throw new Error("Unexpected server response");
    }

    return res.data;

  } catch (err) {
    let message = "Unknown error";

    if (err.code === "ECONNABORTED") {
      message = "The request took too long (timeout)";
    } else if (err.response) {
      message = `Server error: ${err.response.status}`;
    } else if (err.request) {
      message = "No response from server";
    } else {
      message = err.message;
    }

    console.error("getInitialConfig failed:", message, err);
    throw new Error(message);
  }
}

// Welcome Modal
export async function setNotiOff(uuid) {
  try {
    const url = `${API_BASE}api/tracker`;

    const res = await api.post(url, {
      id: uuid,
     }, { timeout: 8000 });

    if (res.status !== 200 || !res.data) {
      throw new Error("Unexpected server response");
    }

    return res.data;
  } catch (err) {
    let message = "Unknown error";

    if (err.code === "ECONNABORTED") {
      message = "Timeout";
    } else if (err.response) {
      message = `Server error: ${err.response.status}`;
    } else if (err.request) {
      message = "No response from server";
    } else {
      message = err.message;
    }

    console.error("setNotiOff failed:", message, err);
    throw new Error(message);
  }
}

// Start Job
export async function startJob(uuid) {
  try {

    const geoCoords = useGlobalStore.getState().geoCoords;
    const getPhone = useGlobalStore.getState().phoneNumber;

    const payload = {
      id: uuid,
      lat: geoCoords?.lat || 0,
      lng: geoCoords?.lng || 0,
      phone: getPhone?.trim() || 0,
    };

    const url = `${API_BASE}api/start-job`;

    const res = await api.post(url, payload, { timeout: 8000 });

    if (res.status !== 200 || !res.data) {
      throw new Error("Unexpected server response");
    }

    return res.data;
  } catch (err) {
    let message = "Unknown error";

    if (err.code === "ECONNABORTED") {
      message = "Timeout";
    } else if (err.response) {
      message = `Server error: ${err.response.status}`;
    } else if (err.request) {
      message = "No response from server";
    } else {
      message = err.message;
    }

    console.error("setNotiOff failed:", message, err);
    throw new Error(message);
  }
}

// Show Work Modal
export async function setNotiOffStartJob(uuid) {
  try {
    const url = `${API_BASE}api/notijobstart`;

    const res = await api.post(url, { id: uuid }, { timeout: 8000 });

    if (res.status !== 200 || !res.data) {
      throw new Error("Unexpected server response");
    }

    return res.data;
  } catch (err) {
    let message = "Unknown error";

    if (err.code === "ECONNABORTED") {
      message = "Timeout";
    } else if (err.response) {
      message = `Server error: ${err.response.status}`;
    } else if (err.request) {
      message = "No response from server";
    } else {
      message = err.message;
    }

    console.error("setNotiOff failed:", message, err);
    throw new Error(message);
  }
}

export const uploadToS3Blob = async (
  blob,
  fileNameLocal,
  fileType,
  fileSize,
  sectionId,
  tabType,
  photoId,
  options = {}
) => {
  let response = {
    url: "",
    fileNameS3: "",
    log: null
  };

  const { skipEvidenceModeLock = false } = options;
  const uuid = useGlobalStore.getState().uuid;

  // Solicitar URL firmada
  // ----------------------
  const url = `${API_BASE}api/job`;
  
  const res = await api.put(url,
    {
      action: "generateSignature",
      name: fileNameLocal,
      type: fileType,
      size: fileSize,
      trackerId: uuid,
      idCategory: sectionId,
      tab: tabType,
    },
    {
      headers: { "Content-Type": "application/json" }
    }
  );

  const resFirma = res.data;

  if (resFirma.status !== "success") {
    throw new Error(json.message || "Error al generar URL");
  }

  const { uploadUrl, uploadTags, downloadUrl, fileName } = resFirma.data;

  // ---------------------------------------------------------
  // Subir Blob a S3 usando la URL firmada
  // ---------------------------------------------------------
  const responseS3 = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': fileType,
      'x-amz-tagging':uploadTags
    } 
  });
     
  if (!responseS3.ok) {
    console.log('S3 Error', responseS3);
  }

  // ---------------------------------------------------------
  // Guardamos en DB
  // ---------------------------------------------------------
  const geoCoords = useGlobalStore.getState().geoCoords;

  let resDb;
  try {
    resDb = await api.post(url,
      {
        action: "toDb",
        trackerId: uuid,
        idCategory: sectionId,
        tab: tabType,
        downloadUrl: downloadUrl,
        fileNameS3: fileName,
        ori: "landscape",
        date: new Date().toISOString().replace('Z', '+00:00'),
        comment: '',
        location: {
          lat: geoCoords?.lat || 0,
          lon: geoCoords?.lng || 0,
        },
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    // Error 500
    const msg = err?.response?.data?.message || "";

    if (/Max photos\s*\(\d+\)\s*already reached/i.test(msg)) {
      const e = new Error("PHOTO_REJECTED_BY_BACKEND");
      e.code = "PHOTO_REJECTED";
      e.activeSummary = err?.response?.data?.activeSummary === true;
      throw e;
    }

    throw err; // otros errores reales
  }

  /**
   * Backend responde 200 pero NO guardó la foto
   * { acknowledged:false, activeSummary:true }
   */
  if (resDb.data?.acknowledged === false) {
    const e = new Error("PHOTO_REJECTED_BY_BACKEND");
    e.code = "PHOTO_REJECTED";
    e.activeSummary = resDb.data?.activeSummary === true;
    throw e;
  }

  /**
   * Respuesta inválida
   */
  if (!resDb.data?.idPhoto) {
    throw new Error("INVALID_BACKEND_RESPONSE");
  }

  /**
   * Caso OK
   * Ya quedó guardado en backend DB correctamente.
   * Solo bloqueamos el switch si este upload NO fue marcado para omitir bloqueo.
   */
  if (!skipEvidenceModeLock) {
    useGlobalStore.getState().setEvidenceModeLocked(true);
  }

  return {
    url: downloadUrl,
    fileNameS3: fileName,
    idPhoto: resDb.data.idPhoto,
    activeSummary: resDb.data.activeSummary,
  };
};

export const deletePhoto = async (sectionId, tabType, idPhoto) => {
  const uuid = useGlobalStore.getState().uuid;

  const url = `${API_BASE}api/job`;

  return api.post(url, {
    headers: { 
      "Content-Type": "application/json" 
    },
    data: {
      action: 'deletePhoto',
      trackerId: uuid,
      idCategory: sectionId,
      tab: tabType,
      idPhoto: idPhoto,
    }
  });
};

export async function finishJobApi() {
  const uuid = useGlobalStore.getState().uuid;
  const geoCoords = useGlobalStore.getState().geoCoords;

  const url = `${API_BASE}api/job`;

  return api.post(
    url,
    {
      action: "finishJobApi",
      trackerId: uuid,
      location: {
        lat: geoCoords?.lat || 0,
        lon: geoCoords?.lng || 0,
      }
    },
    {
      headers: {
        "Content-Type": "application/json",
      }
    }
  );
}

// *****

export async function toApiGetPhotosByCategory (trackerId, categoryId) {
  try {
    const url = `${API_BASE}api/job?action=getphotos`;
    const res = await api.get(url, {
      params: { 
        tracker_id: trackerId,
        category_id: categoryId
      },
    });

    if (res.status !== 200 || !res.data) {
      throw new Error("Unexpected server response");
    }

    return res.data;

  } catch (err) {
    let message = "Unknown error";

    if (err.code === "ECONNABORTED") {
      message = "The request took too long (timeout)";
    } else if (err.response) {
      message = `Server error: ${err.response.status}`;
    } else if (err.request) {
      message = "No response from server";
    } else {
      message = err.message;
    }

    console.error("toApiGetPhotosByCategory() failed:", message, err);
    throw new Error(message);
  }
};

// Get foto info despues de recibir notificacion WS
export async function fetchPhotoById(photoId) {
  try {
    const url = `${API_BASE}api/job?action=fetchPhotoById`;
    const res = await api.get(url, {
      params: { 
        photo_id: photoId,
      },
    });

    if (res.status !== 200 || !res.data) {
      throw new Error("Unexpected server response");
    }

    return res.data;

  } catch (err) {
    let message = "Unknown error";

    if (err.code === "ECONNABORTED") {
      message = "The request took too long (timeout)";
    } else if (err.response) {
      message = `Server error: ${err.response.status}`;
    } else if (err.request) {
      message = "No response from server";
    } else {
      message = err.message;
    }

    console.error("services/api - fetchPhotoById() failed:", message, err);
    throw new Error(message);
  }
};