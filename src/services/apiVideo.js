import axios from "axios";
import api from "./http";
import { useGlobalStore } from "../store/useGlobalStore";
import {
  addVideo,
  updateVideo,
  deleteVideo,
  getVideoBlobById,
  getVideoById,
  getVideoByRemoteId,
  upsertRemoteVideo,
} from "./db";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:3000/"
  : "/";

const toBackendMode = (mode) => {
  if (mode === "video" || mode === "videos") return "videos";
  return "photos";
};

function resolveRemoteVideoId(detail, fallback = {}) {
  return (
    detail?.idVideo ??
    detail?.videoID ??
    detail?.id ??
    fallback?.idVideo ??
    fallback?.videoID ??
    fallback?.id ??
    null
  );
}

function resolveRemoteVideoUrl(detail, fallback = {}) {
  return (
    detail?.downloadUrl ??
    detail?.fileNameS3 ??
    fallback?.downloadUrl ??
    fallback?.fileNameS3 ??
    ""
  );
}

function resolveFrameId(frame) {
  return (
    frame?._id ??
    frame?.id ??
    frame?.imageId ??
    frame?.frameId ??
    frame?.s3_url ??
    null
  );
}

function normalizeVideoImagesResponse(remoteData, fallbackItem = {}) {
  const remoteVideoId = resolveRemoteVideoId(remoteData, fallbackItem);
  const remoteVideoUrl = resolveRemoteVideoUrl(remoteData, fallbackItem);

  return {
    ...fallbackItem,
    remoteResponse: remoteData || fallbackItem?.remoteResponse || null,
    idVideo: remoteVideoId ?? fallbackItem?.idVideo ?? fallbackItem?.videoID ?? null,
    videoID: remoteVideoId ?? fallbackItem?.videoID ?? fallbackItem?.idVideo ?? null,
    fileNameS3:
      remoteData?.fileNameS3 ??
      fallbackItem?.fileNameS3 ??
      "",
    jobStatus:
      remoteData?.jobStatus ??
      fallbackItem?.jobStatus ??
      null,
    videoStatus:
      remoteData?.videoStatus ??
      fallbackItem?.videoStatus ??
      null,
    activeSummary:
      remoteData?.activeSummary ??
      fallbackItem?.activeSummary ??
      null,
    images: Array.isArray(remoteData?.images)
      ? remoteData.images
      : Array.isArray(fallbackItem?.images)
      ? fallbackItem.images
      : [],
    downloadUrl: remoteVideoUrl,
    local: false,
    status:
      String(remoteData?.videoStatus || fallbackItem?.videoStatus || "")
        .trim()
        .toLowerCase() === "completed"
        ? "completed"
        : (fallbackItem?.status || "uploaded"),
  };
}

export async function setMode({ trackerId, mode }) {
  const url = `${API_BASE}api/video`;

  return api.post(
    url,
    {
      action: "setMode",
      trackerId,
      mode: toBackendMode(mode),
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

export async function getVideoDetailById(idVideo) {
  if (!idVideo) {
    throw new Error("VIDEO_ID_REQUIRED");
  }

  const res = await api.get(`${API_BASE}api/video`, {
    params: {
      action: "detail",
      id: idVideo,
    },
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  return res.data || null;
}

export async function finishJobVideoApi() {
  const uuid = useGlobalStore.getState().uuid;
  const geoCoords = useGlobalStore.getState().geoCoords;

  const url = `${API_BASE}api/video`;

  const response = api.post(
    url,
    {
      action: "finish",
      trackerId: uuid,
      location: {
        lat: geoCoords?.lat || 0,
        lon: geoCoords?.lng || 0,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return response;
}

function normalizeRemoteVideoToDb(detail, fallback = {}) {
  const remoteVideoId = resolveRemoteVideoId(detail, fallback);
  const remoteVideoStatus = detail?.videoStatus ?? fallback?.videoStatus ?? null;
  const normalizedVideoStatus =
    typeof remoteVideoStatus === "string"
      ? remoteVideoStatus.trim()
      : null;

  return {
    sectionId: detail?.idCategory ?? fallback?.sectionId ?? "",
    tabType: detail?.tab ?? fallback?.tabType ?? "before",
    createdAt:
      detail?.date ||
      fallback?.createdAt ||
      new Date().toISOString(),
    local: false,
    deleted: false,
    status:
      normalizedVideoStatus?.toLowerCase?.() === "completed"
        ? "completed"
        : "uploaded",
    uploadProgress: 100,
    videoID: remoteVideoId,
    idVideo: remoteVideoId,
    fileNameS3: detail?.fileNameS3 ?? fallback?.fileNameS3 ?? "",
    remoteResponse: detail || null,
    jobStatus: detail?.jobStatus ?? fallback?.jobStatus ?? null,
    videoStatus: normalizedVideoStatus,
    images: Array.isArray(detail?.images) ? detail.images : [],
    downloadUrl: resolveRemoteVideoUrl(detail, fallback),
    type: detail?.contentType ?? fallback?.type ?? "video/mp4",
    size: detail?.size ?? fallback?.size ?? 0,
  };
}

export async function syncVideoStatusFromSocket(idVideo) {
  if (!idVideo) {
    throw new Error("VIDEO_ID_REQUIRED");
  }

  const remoteData = await getVideoDetailById(idVideo);
  const remoteVideoId = resolveRemoteVideoId(remoteData, { idVideo });

  if (!remoteVideoId) {
    return {
      ok: false,
      reason: "REMOTE_VIDEO_ID_NOT_FOUND",
      remoteResponse: remoteData,
    };
  }

  const localItem = await getVideoByRemoteId(remoteVideoId);
  const payload = normalizeRemoteVideoToDb(remoteData, {
    idVideo: remoteVideoId,
    videoID: remoteVideoId,
  });

  if (!localItem?.id) {
    const inserted = await upsertRemoteVideo(payload);

    return {
      ok: true,
      action: "inserted",
      localVideoId: inserted?.id ?? null,
      remoteResponse: remoteData,
    };
  }

  await updateVideo(localItem.id, {
    remoteResponse: remoteData,
    idVideo: payload.idVideo,
    videoID: payload.videoID,
    fileNameS3: payload.fileNameS3,
    jobStatus: payload.jobStatus,
    videoStatus: payload.videoStatus,
    images: payload.images,
    createdAt: payload.createdAt,
    sectionId: payload.sectionId,
    tabType: payload.tabType,
    downloadUrl: payload.downloadUrl,
    type: payload.type,
    status: payload.status,
    local: false,
  });

  return {
    ok: true,
    action: "updated",
    localVideoId: localItem.id,
    remoteResponse: remoteData,
  };
}

export async function syncRemoteVideosFromConfig(initialConfig) {
  const tags = initialConfig?.tags || [];
  if (!tags.length) {
    return { ok: true, total: 0 };
  }

  const refs = [];

  for (const tag of tags) {
    const beforeVideos = Array.isArray(tag?.beforeVideos) ? tag.beforeVideos : [];
    const afterVideos = Array.isArray(tag?.afterVideos) ? tag.afterVideos : [];

    for (const video of beforeVideos) {
      const remoteVideoId =
        video?.idVideo ?? video?.videoID ?? video?.id ?? null;

      if (remoteVideoId) {
        refs.push({
          idVideo: remoteVideoId,
          videoID: remoteVideoId,
          sectionId: tag.id,
          tabType: "before",
          fileNameS3: video?.fileNameS3 ?? "",
          downloadUrl: video?.downloadUrl ?? video?.fileNameS3 ?? "",
        });
      }
    }

    for (const video of afterVideos) {
      const remoteVideoId =
        video?.idVideo ?? video?.videoID ?? video?.id ?? null;

      if (remoteVideoId) {
        refs.push({
          idVideo: remoteVideoId,
          videoID: remoteVideoId,
          sectionId: tag.id,
          tabType: "after",
          fileNameS3: video?.fileNameS3 ?? "",
          downloadUrl: video?.downloadUrl ?? video?.fileNameS3 ?? "",
        });
      }
    }
  }

  if (!refs.length) {
    return { ok: true, total: 0 };
  }

  let synced = 0;

  for (const ref of refs) {
    try {
      const detail = await getVideoDetailById(ref.idVideo);
      const payload = normalizeRemoteVideoToDb(detail, ref);

      await upsertRemoteVideo(payload);
      synced += 1;
    } catch (err) {
      console.error("syncRemoteVideosFromConfig item failed:", ref?.idVideo, err);

      await upsertRemoteVideo({
        sectionId: ref.sectionId,
        tabType: ref.tabType,
        createdAt: new Date().toISOString(),
        local: false,
        deleted: false,
        status: "uploaded",
        uploadProgress: 100,
        videoID: ref.videoID ?? ref.idVideo,
        idVideo: ref.idVideo ?? ref.videoID,
        fileNameS3: ref.fileNameS3 ?? "",
        remoteResponse: null,
        jobStatus: null,
        videoStatus: "InProgress",
        images: [],
        downloadUrl: ref.downloadUrl ?? ref.fileNameS3 ?? "",
        type: "video/mp4",
      });
    }
  }

  return {
    ok: true,
    total: refs.length,
    synced,
  };
}

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
    idVideo: null,
    fileNameS3: "",
    downloadUrl: "",
  };
}

export async function replaceLocalVideoEvidenceBlob(localVideoId, blob) {
  if (!localVideoId) {
    throw new Error("LOCAL_VIDEO_ID_REQUIRED");
  }

  if (!blob) {
    throw new Error("VIDEO_BLOB_REQUIRED");
  }

  const buffer = await blob.arrayBuffer();

  const updated = await updateVideo(localVideoId, {
    buffer,
    type: blob.type || "video/webm",
    size: blob.size || 0,
    createdAt: new Date().toISOString(),
    local: true,
    deleted: false,
    status: "local",
    uploadProgress: 0,
    acknowledged: null,
    activeSummary: null,
    jobStatus: null,
    videoStatus: null,
    images: [],
    remoteResponse: null,
    removeFrameError: "",
    removingFrameId: null,
    errorMessage: "",
    fileNameS3: "",
    downloadUrl: "",
    videoID: null,
    idVideo: null,
  });

  const savedBlob = await getVideoBlobById(localVideoId);
  const videoUrl = savedBlob
    ? URL.createObjectURL(savedBlob)
    : URL.createObjectURL(blob);

  return {
    ...(updated || {}),
    id: localVideoId,
    blob: savedBlob || blob,
    videoUrl,
  };
}

export async function reprocessVideoEvidence(localVideoId) {
  if (!localVideoId) {
    throw new Error("LOCAL_VIDEO_ID_REQUIRED");
  }

  const localItem = await getVideoById(localVideoId);
  if (!localItem) {
    throw new Error("LOCAL_VIDEO_NOT_FOUND");
  }

  const idVideo = localItem?.idVideo || localItem?.videoID;
  if (!idVideo) {
    throw new Error("VIDEO_ID_REQUIRED");
  }

  await updateVideo(localVideoId, {
    status: "saving",
    uploadProgress: 100,
    errorMessage: "",
    removeFrameError: "",
  });

  try {
    const res = await api.post(
      `${API_BASE}api/video?action=toDbReprocess`,
      { idVideo },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const remoteData = res.data || null;
    const remoteVideoId = resolveRemoteVideoId(remoteData, { idVideo });
    const remoteVideoUrl = resolveRemoteVideoUrl(remoteData, {
      fileNameS3: localItem?.fileNameS3,
    });

    await updateVideo(localVideoId, {
      status: "uploaded",
      local: false,
      uploadProgress: 100,
      remoteResponse: remoteData,
      acknowledged: remoteData?.acknowledged ?? null,
      idVideo: remoteVideoId,
      videoID: remoteVideoId,
      fileNameS3: remoteData?.fileNameS3 ?? localItem?.fileNameS3 ?? "",
      activeSummary: remoteData?.activeSummary ?? null,
      jobStatus: remoteData?.jobStatus ?? null,
      videoStatus: remoteData?.videoStatus ?? null,
      images: Array.isArray(remoteData?.images) ? remoteData.images : [],
      downloadUrl: remoteVideoUrl,
      errorMessage: "",
    });

    useGlobalStore.getState().setEvidenceModeLocked(true);

    const isActiveSummary = remoteData?.activeSummary === true;

    useGlobalStore.getState().setVideoSummaryEnabled(isActiveSummary);
    useGlobalStore.getState().setVideoReviewPending(!isActiveSummary);

    return {
      ok: true,
      localVideoId,
      videoID: remoteVideoId,
      remoteResponse: remoteData,
    };
  } catch (err) {
    console.error("reprocessVideoEvidence error:", err);

    await updateVideo(localVideoId, {
      status: "failed",
      errorMessage:
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Video reprocess failed",
    });

    throw err;
  }
}

export async function removeVideoEvidence({
  localVideoId,
  trackerId,
  sectionId,
  tab,
  videoId,
}) {
  if (!trackerId) {
    throw new Error("TRACKER_ID_REQUIRED");
  }

  if (!sectionId) {
    throw new Error("SECTION_ID_REQUIRED");
  }

  if (!tab) {
    throw new Error("TAB_REQUIRED");
  }

  if (!videoId) {
    throw new Error("VIDEO_ID_REQUIRED");
  }

  await api.delete(`${API_BASE}api/video`, {
    data: {
      action: "removeVideo",
      trackerId,
      idCategory: sectionId,
      tab,
      idVideo: videoId,
    },
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  if (localVideoId) {
    await deleteVideo(localVideoId);
  }

  return { ok: true };
}

export async function uploadVideoEvidence(
  localVideoId,
  { onProgress, sectionId, tab } = {}
) {
  const uuid = useGlobalStore.getState().uuid;
  const geoCoords = useGlobalStore.getState().geoCoords;

  const blob = await getVideoBlobById(localVideoId);
  if (!blob) throw new Error("VIDEO_BLOB_NOT_FOUND");

  const current = await updateVideo(localVideoId, {
    status: "uploading",
    uploadProgress: 0,
    sectionId: sectionId ?? undefined,
    tabType: tab ?? undefined,
  });

  const file = new File([blob], getVideoFileName(blob), {
    type: blob.type || "video/webm",
  });

  try {
    // Paso 1: Solicitar firma S3
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

    if (!uploadURL || !videoID || !objectKey) {
      throw new Error("INVALID_VIDEO_SIGNATURE_RESPONSE");
    }

    // Paso 2: Enviar a S3
    await axios({
      method: uploadMethod || "PUT",
      url: uploadURL,
      data: file,
      headers: {
        "Content-Type":
          requiredHeaders?.["Content-Type"] || contentType || file.type,
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
      idVideo: videoID,
      fileNameS3,
    });

    // Paso 3: Guardar en backend DB
    const payload = {
      trackerId: uuid,
      idCategory: sectionId ?? current?.sectionId,
      tab: tab ?? current?.tabType,
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

    const remoteData = dbRes.data || null;
    const remoteVideoId = resolveRemoteVideoId(remoteData, { idVideo: videoID });
    const remoteVideoUrl = resolveRemoteVideoUrl(remoteData, { fileNameS3 });

    await updateVideo(localVideoId, {
      status: "uploaded",
      local: false,
      uploadProgress: 100,
      remoteResponse: remoteData,
      acknowledged: remoteData?.acknowledged ?? null,
      idVideo: remoteVideoId,
      videoID: remoteVideoId,
      fileNameS3: remoteData?.fileNameS3 ?? fileNameS3 ?? "",
      activeSummary: remoteData?.activeSummary ?? null,
      jobStatus: remoteData?.jobStatus ?? null,
      videoStatus: remoteData?.videoStatus ?? null,
      images: Array.isArray(remoteData?.images) ? remoteData.images : [],
      downloadUrl: remoteVideoUrl,
    });

    /**
     * Caso OK
     * Ya quedó guardado en backend DB correctamente, entonces bloqueo el switch en esta sesión.
     */
    useGlobalStore.getState().setEvidenceModeLocked(true);

    const isActiveSummary = remoteData?.activeSummary === true;

    useGlobalStore.getState().setVideoSummaryEnabled(isActiveSummary);
    useGlobalStore.getState().setVideoReviewPending(!isActiveSummary);

    return {
      ok: true,
      localVideoId,
      videoID: remoteVideoId,
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

export async function toApiGetVideosByCategory(trackerId, categoryId) {
  try {
    const res = await api.get(`${API_BASE}api/video`, {
      params: {
        action: "category",
        tracker_id: trackerId,
        category_id: categoryId,
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
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

    console.error("toApiGetVideosByCategory() failed:", message, err);
    throw new Error(message);
  }
}

export async function removeVideoFrameEvidence({
  localVideoId,
  videoId,
  frame,
}) {
  if (!localVideoId) {
    throw new Error("LOCAL_VIDEO_ID_REQUIRED");
  }

  if (!videoId) {
    throw new Error("VIDEO_ID_REQUIRED");
  }

  const frameId = resolveFrameId(frame);

  if (!frameId) {
    throw new Error("FRAME_ID_REQUIRED");
  }

  const localItem =
    (await getVideoById(localVideoId)) ||
    (await getVideoByRemoteId(videoId));

  const currentImages = Array.isArray(localItem?.images)
    ? localItem.images
    : Array.isArray(localItem?.remoteResponse?.images)
    ? localItem.remoteResponse.images
    : [];

  if (currentImages.length <= 1) {
    throw new Error("AT_LEAST_ONE_FRAME_REQUIRED");
  }

  await updateVideo(localVideoId, {
    removingFrameId: frameId,
    removeFrameError: "",
  });

  try {
    await api.delete(`${API_BASE}api/video`, {
      data: {
        action: "removeFrame",
        idImage: frameId,
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    const refreshedRemoteData = await getVideoDetailById(videoId);

    const nextPayload = normalizeVideoImagesResponse(refreshedRemoteData, {
      ...(localItem || {}),
    });

    await updateVideo(localVideoId, {
      ...nextPayload,
      removingFrameId: null,
      removeFrameError: "",
    });

    return {
      ok: true,
      localVideoId,
      videoId,
      frameId,
      remoteResponse: refreshedRemoteData,
    };
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Could not remove frame";

    await updateVideo(localVideoId, {
      removingFrameId: null,
      removeFrameError: message,
    });

    throw err;
  }
}

