import { useGlobalStore } from "../store/useGlobalStore";

export function handleVideoProcessingNotification(message = {}) {
  console.log("Video Processing Notification:", message);

  useGlobalStore.setState((state) => ({
    showVideoProcessingOverlay: true,
    showVideoReviewModal: false,
    initialConfig: state.initialConfig
      ? {
          ...state.initialConfig,
          tab: "processing",
        }
      : state.initialConfig,
    activeMenu: "evidence",
  }));
}

export function handleReviewNotification(message = {}) {
  console.log("WS REVIEW:", message);

  useGlobalStore.setState((state) => ({
    showVideoProcessingOverlay: false,
    showVideoReviewModal: true,
    videoReviewPending: true,
    initialConfig: state.initialConfig
      ? {
          ...state.initialConfig,
          tab: "evidence",
        }
      : state.initialConfig,
    activeMenu: "evidence",
  }));
}
