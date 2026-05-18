import { saveStoreConfig, getStoreConfig } from "../../services/db";

const normalizeEvidenceMode = (mode) => {
  if (mode === "videos" || mode === "video") return "video";
  if (mode === "photos" || mode === "photo" || mode === "fotos") return "photos";
  return "photos";
};

const denormalizeEvidenceMode = (mode) => {
  return mode === "video" ? "videos" : "photos";
};

export const createUiSlice = (set, get) => ({
  activeMenu: "location",
  notiOff: false,
  notiOffStartJob: false,
  showTooEarlyModal: false,

  syncingPhotos: false,
  initialPhotosReady: false,
  hasPendingSync: false,

  sectionPhotoLoading: {},
  sectionPhotosReady: {},

  photosRevision: 0,
  videosRevision: 0,

  // Overlay global de procesamiento para video
  showVideoProcessingOverlay: false,

  // Habilita Finish Job en modo video
  videoSummaryEnabled: false,

  // Bloquea Finish Job cuando llegó topic "review"
  videoReviewPending: false,

  // Bloquea el switch de evidencia (photos/video)
  evidenceModeLocked: false,

  setActiveMenu: async (menu) => {
    set({ activeMenu: menu });
  },

  setNotiOff: (value) => set({ notiOff: value }),
  setNotiOffStartJob: (value) => set({ notiOffStartJob: value }),
  setShowTooEarlyModal: (value) => set({ showTooEarlyModal: value }),

  setSyncingPhotos: (value) => set({ syncingPhotos: value }),
  setInitialPhotosReady: (v) => set({ initialPhotosReady: v }),
  setHasPendingSync: (v) => set({ hasPendingSync: v }),

  // For Video
  setShowVideoProcessingOverlay: (value) =>
    set({ showVideoProcessingOverlay: value }),

  // For Summary Video
  setVideoSummaryEnabled: (value) =>
    set((state) => ({
      videoSummaryEnabled: value === true,
      initialConfig: state.initialConfig
        ? {
            ...state.initialConfig,
            activeSummary: value === true,
          }
        : state.initialConfig,
    })),
  
  setVideoReviewPending: (value) =>
    set({ videoReviewPending: value === true }),

  // Inicializa el bloqueo del switch desde backend
  initEvidenceModeLocked: async (backendLocked) => {
    const normalizedLocked = backendLocked === true;

    const currentLocked = get().evidenceModeLocked;
    if (currentLocked !== normalizedLocked) {
      set({
        evidenceModeLocked: normalizedLocked,
      });
    }

    // reflejar también en initialConfig si ya existe
    set((state) => ({
      initialConfig: state.initialConfig
        ? {
            ...state.initialConfig,
            evidenceModeLocked: normalizedLocked,
          }
        : state.initialConfig,
    }));
  },

  // Permite bloquear/desbloquear desde frontend cuando corresponda
  setEvidenceModeLocked: async (value) => {
    const normalizedLocked = value === true;

    const currentLocked = get().evidenceModeLocked;
    if (currentLocked === normalizedLocked) return;

    set((state) => ({
      evidenceModeLocked: normalizedLocked,
      initialConfig: state.initialConfig
        ? {
            ...state.initialConfig,
            evidenceModeLocked: normalizedLocked,
          }
        : state.initialConfig,
    }));
  },

  initSectionsLoadingState: (tags = []) => {
    const loading = {};
    const ready = {};
    for (const t of tags) {
      loading[t.id] = true;
      ready[t.id] = false;
    }
    set({ sectionPhotoLoading: loading, sectionPhotosReady: ready });
  },

  setSectionPhotoLoading: (sectionId, v) =>
    set((state) => ({
      sectionPhotoLoading: { ...state.sectionPhotoLoading, [sectionId]: v },
    })),

  markSectionPhotosReady: (sectionId) =>
    set((state) => ({
      sectionPhotosReady: { ...state.sectionPhotosReady, [sectionId]: true },
    })),

  resetSectionsLoadingState: () => set({ sectionPhotoLoading: {}, sectionPhotosReady: {} }),

  bumpPhotosRevision: () =>
    set((s) => ({ photosRevision: s.photosRevision + 1 })),

  bumpVideosRevision: () =>
    set((s) => ({ videosRevision: s.videosRevision + 1 })),

  evidenceMediaMode: "photos",

  initEvidenceMediaMode: async (backendMode) => {
    const normalizedBackendMode = normalizeEvidenceMode(backendMode);

    if (backendMode) {
      const currentMode = get().evidenceMediaMode;

      if (currentMode !== normalizedBackendMode) {
        set({ evidenceMediaMode: normalizedBackendMode });
      }

      await saveStoreConfig("last_state_switch", normalizedBackendMode);
      return;
    }

    const saved = await getStoreConfig("last_state_switch");
    if (saved === "photos" || saved === "video" || saved === "videos") {
      const normalizedSaved = normalizeEvidenceMode(saved);
      const currentMode = get().evidenceMediaMode;

      if (currentMode !== normalizedSaved) {
        set({ evidenceMediaMode: normalizedSaved });
      }

      return;
    }

    const currentMode = get().evidenceMediaMode;
    if (currentMode !== "photos") {
      set({ evidenceMediaMode: "photos" });
    }

    await saveStoreConfig("last_state_switch", "photos");
  },

  setEvidenceMediaMode: async (mode) => {
    const normalizedMode = normalizeEvidenceMode(mode);

    if (normalizedMode !== "photos" && normalizedMode !== "video") return;

    // NO permitir cambio si ya está bloqueado
    if (get().evidenceModeLocked) return;

    const nextBackendMode = denormalizeEvidenceMode(normalizedMode);
    const state = get();

    const sameUiMode = state.evidenceMediaMode === normalizedMode;
    const sameConfigMode = state.initialConfig?.mode === nextBackendMode;

    if (sameUiMode && sameConfigMode) return;

    set((state) => ({
      evidenceMediaMode: normalizedMode,
      initialConfig: state.initialConfig
        ? {
            ...state.initialConfig,
            mode: nextBackendMode,
          }
        : state.initialConfig,
    }));

    await saveStoreConfig("last_state_switch", normalizedMode);
  },
  showVideoReviewModal: false,
  setShowVideoReviewModal: (value) =>
    set({ showVideoReviewModal: !!value }),
});