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

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;

  // iOS
  if (/iPhone|iPad|iPod/i.test(ua)) return true;

  // Android
  if (/Android/i.test(ua)) return true;

  return false;
}

function resolveSocketVideoId(message = {}) {
  return message?.idVideo ?? message?.videoID ?? message?.id ?? null;
}

export function useJobSocket(trackerId) {
  const socketRef = useRef(null);
  const retryRef = useRef(null);

  const lastVisibilityRef = useRef(Date.now());

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

          // VIDEO
          if (message.topic === "video") {
            console.log("Message Topic: ", message);

            const socketVideoId = resolveSocketVideoId(message);

            if (!socketVideoId) {
              console.warn("video topic without id", message);
            } else {
              syncVideoStatusFromSocket(socketVideoId)
                .then((result) => {
                  console.log("video sync result", result);

                  // Rehidratar UI de evidence/videos
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

    // DETECCIÓN UNIVERSAL: volver desde background en MOBILE
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastVisibilityRef.current = Date.now();
        return;
      }

      if (document.visibilityState === "visible" && isMobileBrowser()) {
        const now = Date.now();
        const delta = now - lastVisibilityRef.current;

        // Umbral clave: evita falsos positivos
        if (delta < 400) {
          return;
        }

        console.warn("[Mobile] Visibility restore -> rehydrate state", {
          delta,
        });

        runInitializerOnce()
          .then(() => {
            // Forzar repaint / refresh de UI
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