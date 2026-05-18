import axios from "axios";
import api from "./http";
import { useGlobalStore } from "../store/useGlobalStore";
import { addVideo, updateVideo, getVideoBlobById } from "./db";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:3000/"
  : "/";

function getVideoFileName(videoBlob) {
  const ext =
    videoBlob?.type === "video/mp4"
      ? "mp4"
      : videoBlob?.type === "video/quicktime"
      ? "mov"
      : "webm";

  return `video-${Date.now()}.${ext}`;
}

export async function createLocalVideoEvidence({ sectionId, tab, blob }) {
  const localId = await addVideo(sectionId, blob, tab);
  if (!localId) {
    throw new Error("FAILED_TO_SAVE_LOCAL_VIDEO");
  }

  const savedBlob = await getVideoBlobById(localId);
  const videoUrl = savedBlob
    ? URL.createObjectURL(savedBlob)
    : URL.createObjectURL(blob);

  return {
    id: localId,
    sectionId,
    tabType: tab,
    blob: savedBlob || blob,
    videoUrl,
    createdAt: new Date().toISOString(),
    status: "local",
    uploadProgress: 0,
    videoID: null,
    fileNameS3: "",
  };
}

export async function uploadVideoEvidence(localVideoId, { onProgress } = {}) {
  const uuid = useGlobalStore.getState().uuid;
  const geoCoords = useGlobalStore.getState().geoCoords;

  const blob = await getVideoBlobById(localVideoId);
  if (!blob) throw new Error("VIDEO_BLOB_NOT_FOUND");

  const current = await updateVideo(localVideoId, {
    status: "uploading",
    uploadProgress: 0,
  });

  const file = new File([blob], getVideoFileName(blob), {
    type: blob.type || "video/webm",
  });

  try {
    // PASO 1: obtener firma (JSON, no multipart)
    const signRes = await api.post(
      `${API_BASE}api/video?action=upload`,
      {
        filename: file.name,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const {
        uploadURL,
        videoID,
        objectKey,
        requiredHeaders,
        contentType,
        uploadMethod,
    } = signRes.data || {};

    // console.log("_________________")
    // console.log("API CARLOS:")
    // console.log("uploadURL", uploadURL);
    // console.log("videoID", videoID);
    // console.log("_________________")

    if (!uploadURL || !videoID || !objectKey) {
        throw new Error("INVALID_VIDEO_SIGNATURE_RESPONSE");
    }

    // PASO 2: subir a S3
    await axios({
        method: uploadMethod || "PUT",
        url: uploadURL,
        data: file,
        headers: {
            "Content-Type": requiredHeaders?.["Content-Type"] || contentType || file.type,
        },
        onUploadProgress: async (progressEvent) => {
            const total = progressEvent.total || file.size || 1;
            const percent = Math.round((progressEvent.loaded * 100) / total);

            await updateVideo(localVideoId, {
            status: "uploading",
            uploadProgress: percent,
            });

            if (onProgress) onProgress(percent);
        },
    });

    const fileNameS3 = objectKey;

    await updateVideo(localVideoId, {
      status: "saving",
      uploadProgress: 100,
      videoID,
      fileNameS3,
    });

    // PASO 3: guardar en DB
    const payload = {
      trackerId: uuid,
      idCategory: current?.sectionId,
      tab: current?.tabType,
      fileNameS3,
      videoID,
      date: new Date().toISOString().replace("Z", "+00:00"),
      location: {
        lat: geoCoords?.lat || 0,
        lon: geoCoords?.lng || 0,
      },
    };

    const dbRes = await api.put(`${API_BASE}api/video?action=toDb`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    console.log("------------");
    console.log("RESPONSE DB", dbRes);

    await updateVideo(localVideoId, {
      status: "uploaded",
      local: false,
      uploadProgress: 100,
      remoteResponse: dbRes.data || null,
    });

    return {
      ok: true,
      localVideoId,
      videoID,
      fileNameS3,
      remoteResponse: dbRes.data || null,
    };
  } catch (err) {
    console.error("uploadVideoEvidence error:", err);

    await updateVideo(localVideoId, {
      status: "failed",
      errorMessage:
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Video upload failed",
    });

    throw err;
  }
}

export async function retryUploadVideoEvidence(localVideoId, options = {}) {
  return uploadVideoEvidence(localVideoId, options);
}