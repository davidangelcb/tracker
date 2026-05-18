import { useEffect, useRef } from "react";
import { useGlobalStore } from "../store/useGlobalStore";
import {
  handlePhotoNotification,
  handlePhotoRemoveNotification,
} from "../services/realtimeHandlers";
import {
  handleVideoProcessingNotification,
  handleReviewNotification,
} from "../services/realtimeVideoHandlers";
import { syncVideoStatusFromSocket } from "../services/apiVideo";
import { runInitializerOnce } from "./useInitializer";

/**
 * FLAGS DE CONTROL
 * Cuando el usuario ya está en summary y vuelve del background:
 *
 * true  => NO rehidratar.
 * false => SÍ rehidratar.
 */

const SKIP_REHYDRATE_ON_VIDEO_SUMMARY_RESTORE = true;
const SKIP_REHYDRATE_ON_PHOTO_SUMMARY_RESTORE = false;

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua)) return true;

  return false;
}

function resolveSocketVideoId(message = {}) {
  return message?.idVideo ?? message?.videoID ?? message?.id ?? null;
}

function isVideoSummaryState(state = {}) {
  const initialConfig = state?.initialConfig;
  const activeMenu = state?.activeMenu;

  return (
    initialConfig?.mode === "videos" &&
    (activeMenu === "summary-video" || initialConfig?.tab === "summary")
  );
}

function isPhotoSummaryState(state = {}) {
  const initialConfig = state?.initialConfig;
  const activeMenu = state?.activeMenu;

  return (
    initialConfig?.mode !== "videos" &&
    (activeMenu === "summary" || initialConfig?.tab === "summary")
  );
}

export function useJobSocket(trackerId) {
  const socketRef = useRef(null);
  const retryRef = useRef(null);

  const lastVisibilityRef = useRef(Date.now());

  const skipNextVisibleRehydrateRef = useRef(false);

  useEffect(() => {
    if (!trackerId) return;

    const WS_URL =
      import.meta.env.VITE_WS_URL ||
      "wss://hef82na8o2.execute-api.us-east-1.amazonaws.com/dev";

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            action: "joinChannel",
            id: trackerId,
          })
        );
        console.log("WS connected");
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { message } = data || {};
          if (!message?.topic) return;

          if (message.topic === "start") {
            useGlobalStore.setState((state) => ({
              initialConfig: { ...state.initialConfig, tab: "evidence" },
              activeMenu: "evidence",
              jobStarted: true,
              showVideoProcessingOverlay: false,
              showVideoReviewModal: false,
              videoReviewPending: false,
            }));
          }

          if (message.topic === "end") {
            console.log("message", message);

            useGlobalStore.setState((state) => {
              const isVideoMode = state.initialConfig?.mode === "videos";

              return {
                initialConfig: {
                  ...state.initialConfig,
                  tab: "summary",
                  evidence: {
                    ...state.initialConfig?.evidence,
                    date: message.date,
                  },
                },
                activeMenu: isVideoMode ? "summary-video" : "summary",
                evidenceCompleted: true,
                showVideoProcessingOverlay: false,
                showVideoReviewModal: false,
                videoReviewPending: false,
              };
            });
          }

          if (message.topic === "photo") {
            handlePhotoNotification(message);
          }

          if (message.topic === "remove") {
            handlePhotoRemoveNotification(message);
          }

          if (message.topic === "video") {
            console.log("Message Topic: ", message);

            const socketVideoId = resolveSocketVideoId(message);

            if (!socketVideoId) {
              console.warn("video topic without id", message);
            } else {
              syncVideoStatusFromSocket(socketVideoId)
                .then((result) => {
                  console.log("video sync result", result);

                  useGlobalStore.getState().bumpVideosRevision();
                })
                .catch((err) => {
                  console.error("video sync failed", err);
                });
            }
          }

          if (message.topic === "processing") {
            handleVideoProcessingNotification(message);
          }

          if (message.topic === "review") {
            handleReviewNotification(message);
          }
        } catch (err) {
          console.warn("Invalid WS message", err);
        }
      };

      socket.onclose = () => {
        console.warn("WS closed, retrying...");
        retryRef.current = setTimeout(connect, 2000);
      };

      socket.onerror = (e) => {
        console.error("WS error", e);
        socket.close();
      };
    };

    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastVisibilityRef.current = Date.now();

        const currentState = useGlobalStore.getState();

        const shouldSkipVideo =
          SKIP_REHYDRATE_ON_VIDEO_SUMMARY_RESTORE &&
          isVideoSummaryState(currentState);

        const shouldSkipPhoto =
          SKIP_REHYDRATE_ON_PHOTO_SUMMARY_RESTORE &&
          isPhotoSummaryState(currentState);

        skipNextVisibleRehydrateRef.current =
          shouldSkipVideo || shouldSkipPhoto;

        return;
      }

      if (document.visibilityState === "visible" && isMobileBrowser()) {
        const now = Date.now();
        const delta = now - lastVisibilityRef.current;

        if (delta < 400) {
          return;
        }

        if (skipNextVisibleRehydrateRef.current) {
          skipNextVisibleRehydrateRef.current = false;

          console.warn(
            "[Mobile] Visibility restore skipped on summary (photo/video)"
          );

          return;
        }

        console.warn("[Mobile] Visibility restore -> rehydrate state", {
          delta,
        });

        runInitializerOnce()
          .then(() => {
            useGlobalStore.getState().bumpPhotosRevision();
            useGlobalStore.getState().bumpVideosRevision();
          })
          .catch((err) => {
            console.error("Soft re-init failed", err);
          });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(retryRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      socketRef.current?.close();
    };
  }, [trackerId]);
}