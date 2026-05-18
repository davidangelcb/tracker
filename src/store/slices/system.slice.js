export const createSystemSlice = (set) => ({
  uuid: null,
  initialConfig: null,
  dbName: null,
  dbInitialized: false,
  tab: "unable", // Modal "Unable to Track This Job"
  phoneNumber: "",
  jobStarted: false,
  evidenceCompleted: false,
  startJobInfo: {},
  allSectionsComplete: false,
  // --- NEW: cache para fotos remotas (por categoría) ---
  cachedPhotosByCategory: {},
  jobStatus: null,

  setUuid: (value) => set({ uuid: value }),
  setInitialConfig: (initialConfig) => set({ initialConfig }),
  setDbName: (name) => set({ dbName: name }),
  setDbInitialized: (value) => set({ dbInitialized: value }),
  setTab: (value) => set({ tab: value }),
  setPhoneNumber: (value) => set({ phoneNumber: value }),
  setJobStarted: (value) => set({ jobStarted: value }),
  setEvidenceCompleted: (value) => set({ evidenceCompleted: value }),
  setStartJobInfo: (value) => set({ startJobInfo: value }),
  setAllSectionsComplete: (v) => set({ allSectionsComplete: v }),

  setCachedPhotos: (categoryId, photos) =>
    set((state) => ({
      cachedPhotosByCategory: {
        ...state.cachedPhotosByCategory,
        [categoryId]: photos,
      },
    })),

  setJobStatus: (jobStatus) => set({ jobStatus }),

  handleJobStatusChange: (jobStatus, responseData = null) => {
    if (jobStatus === "completed") {
      console.log("Redirect to Summary");

      const statusTrackerDate =
        responseData?.statusTrackerDate ??
        responseData?.data?.statusTrackerDate ??
        responseData?.job?.statusTrackerDate ??
        responseData?.date ??
        responseData?.data?.date ??
        responseData?.job?.date ??
        null;

      set((state) => {
        const nextInitialConfig = state.initialConfig
          ? {
              ...state.initialConfig,
              jobStatus: "completed",
              statusTracker: "completed",
              ...(statusTrackerDate ? { statusTrackerDate } : {}),
            }
          : state.initialConfig;

        const isVideoMode = state.initialConfig?.mode === "videos";

        // Si el usuario ya se fue manualmente a Location, no lo regresamos.
        const shouldKeepCurrentMenu = state.activeMenu === "location";

        return {
          activeMenu: shouldKeepCurrentMenu
            ? state.activeMenu
            : isVideoMode
              ? "summary-video"
              : "summary",
          evidenceCompleted: true,
          initialConfig: nextInitialConfig,
        };
      });
    }
  },
});