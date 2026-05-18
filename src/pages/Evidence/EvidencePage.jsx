import React, { useEffect, useMemo, useState } from "react";
import AccordionSection from "./components/AccordionSection";
import { useGlobalStore } from "../../store/useGlobalStore";
import BeforeFinishingModal from "./components/BeforeFinishingModal";
import JobCompletedModal from "./components/JobCompletedModal";
import ShowWorkModal from "./components/ShowWorkModal";
import FrontDoorCaptureStep from "./components/FrontDoorCaptureStep";
import IconInfo from "../../assets/images/icon-info3.svg";
import { finishJobApi, uploadToS3Blob, deletePhoto } from "../../services/api";
import {
  setMode as setModeApi,
  finishJobVideoApi,
} from "../../services/apiVideo";
import { getStoreConfig, saveStoreConfig } from "../../services/db";

import VideoEvidence from "./components/video/VideoEvidence";
import EvidenceBottomBar from "./components/shared/EvidenceBottomBar";

import "./EvidencePage.css";

const FRONT_DOOR_STATE_KEY = "front_door_capture_state_v1";
const FRONT_DOOR_TAB_TYPE = "before";

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!(blob instanceof Blob)) {
      reject(new Error("Invalid blob received"));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function EvidencePage() {
  const initialConfig = useGlobalStore((state) => state.initialConfig);
  const setActiveMenu = useGlobalStore((s) => s.setActiveMenu);
  const setShowVideoProcessingOverlay = useGlobalStore(
    (s) => s.setShowVideoProcessingOverlay
  );

  const allSectionsComplete = useGlobalStore((s) => s.allSectionsComplete);
  const evidenceCompleted = useGlobalStore((s) => s.evidenceCompleted);
  const videoSummaryEnabled = useGlobalStore(
    (s) => s.videoSummaryEnabled || s.initialConfig?.activeSummary === true
  );

  const videoReviewPending = useGlobalStore((s) => s.videoReviewPending);

  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showBeforeModal, setShowBeforeModal] = useState(false);
  const [changingMode, setChangingMode] = useState(false);

  const syncingPhotos = useGlobalStore((s) => s.syncingPhotos);
  const hasPendingSync = useGlobalStore((s) => s.hasPendingSync);

  const sectionPhotoLoading = useGlobalStore((s) => s.sectionPhotoLoading || {});
  const sectionPhotosReady = useGlobalStore((s) => s.sectionPhotosReady || {});
  const sections = initialConfig?.tags || [];
  const frontDoorSectionId = sections?.[0]?.id || null;

  const hasFrontDoorPhotoInInitialConfig = useMemo(() => {
    const firstSection = sections?.[0];
    return Array.isArray(firstSection?.beforePhotos) && firstSection.beforePhotos.length > 0;
  }, [sections]);

  const evidenceMediaMode = useGlobalStore((s) => s.evidenceMediaMode);
  const setEvidenceMediaMode = useGlobalStore((s) => s.setEvidenceMediaMode);
  const evidenceModeLocked = useGlobalStore((s) => s.evidenceModeLocked);

  const setVideoSummaryEnabled = useGlobalStore((s) => s.setVideoSummaryEnabled);
  const setVideoReviewPending = useGlobalStore((s) => s.setVideoReviewPending);

  const [videoDoneLock, setVideoDoneLock] = useState(false);

  const [frontDoorStateReady, setFrontDoorStateReady] = useState(false);
  const [frontDoorState, setFrontDoorState] = useState({
    photo: null,
    nextDone: false,
  });

  const uuid = useGlobalStore((s) => s.uuid);
  const isPhotosMode = evidenceMediaMode === "photos";
  const isVideoMode = initialConfig?.mode === "videos";

  useEffect(() => {
    let cancelled = false;

    const loadFrontDoorState = async () => {
      try {
        const saved = await getStoreConfig(FRONT_DOOR_STATE_KEY);

        if (cancelled) return;

        if (saved && typeof saved === "object") {
          setFrontDoorState({
            photo: saved.photo ?? null,
            nextDone: saved.nextDone === true,
          });
        } else {
          setFrontDoorState({
            photo: null,
            nextDone: false,
          });
        }
      } catch (error) {
        console.error("Error loading front door state:", error);
        if (!cancelled) {
          setFrontDoorState({
            photo: null,
            nextDone: false,
          });
        }
      } finally {
        if (!cancelled) {
          setFrontDoorStateReady(true);
        }
      }
    };

    loadFrontDoorState();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistFrontDoorState = async (nextState) => {
    setFrontDoorState(nextState);
    await saveStoreConfig(FRONT_DOOR_STATE_KEY, nextState);
  };

  const handleFrontDoorSend = async (blob) => {
    let optimisticPhotoId = null;

    try {
      if (!(blob instanceof Blob)) {
        console.error("Front door upload aborted: invalid blob.", blob);
        return;
      }

      if (!frontDoorSectionId) {
        console.error("Front door upload aborted: first section id not found.");
        return;
      }

      console.log("Front door SEND clicked");

      const localPreviewUrl = await blobToDataUrl(blob);
      optimisticPhotoId = `front-door-${Date.now()}`;

      // 1) Mostrar miniatura al instante
      await persistFrontDoorState({
        photo: {
          id: optimisticPhotoId,
          url: localPreviewUrl,
          createdAt: new Date().toISOString(),
          idPhoto: null,
          fileNameS3: "",
          remoteUrl: "",
          sectionId: frontDoorSectionId,
          tabType: FRONT_DOOR_TAB_TYPE,
          uploaded: false,
          uploading: true,
        },
        nextDone: false,
      });

      // 2) Subir al backend de inmediato
      const response = await uploadToS3Blob(
        blob,
        `front_door_${Date.now()}.jpg`,
        blob.type || "image/jpeg",
        blob.size || 0,
        frontDoorSectionId,
        FRONT_DOOR_TAB_TYPE,
        undefined,
        { skipEvidenceModeLock: true }
      );

      // 3) Completar metadata remota y habilitar remove
      await persistFrontDoorState({
        photo: {
          id: optimisticPhotoId,
          url: localPreviewUrl,
          createdAt: new Date().toISOString(),
          idPhoto: response?.idPhoto || null,
          fileNameS3: response?.fileNameS3 || "",
          remoteUrl: response?.url || "",
          sectionId: frontDoorSectionId,
          tabType: FRONT_DOOR_TAB_TYPE,
          uploaded: true,
          uploading: false,
        },
        nextDone: false,
      });

      console.log("Front door uploaded successfully:", response);
    } catch (error) {
      console.error("Error uploading front door photo:", error);

      // limpiar preview optimista si falla
      await persistFrontDoorState({
        photo: null,
        nextDone: false,
      });
    }
  };

  const handleFrontDoorRemove = async () => {
    const currentPhoto = frontDoorState.photo;

    try {
      if (!currentPhoto) return;
      if (currentPhoto.uploading || currentPhoto.removing) return;

      console.log("Front door REMOVE clicked:", currentPhoto);

      const removingState = {
        photo: {
          ...currentPhoto,
          removing: true,
        },
        nextDone: false,
      };

      await persistFrontDoorState(removingState);

      if (
        currentPhoto.idPhoto &&
        currentPhoto.sectionId &&
        currentPhoto.tabType
      ) {
        await deletePhoto(
          currentPhoto.sectionId,
          currentPhoto.tabType,
          currentPhoto.idPhoto
        );

        console.log(
          "Front door photo deleted successfully from backend:",
          currentPhoto.idPhoto
        );
      }

      await persistFrontDoorState({
        photo: null,
        nextDone: false,
      });
    } catch (error) {
      console.error("Error removing front door photo:", error);

      await persistFrontDoorState({
        photo: {
          ...currentPhoto,
          removing: false,
        },
        nextDone: false,
      });
    }
  };

  const handleFrontDoorNext = async () => {
    if (!frontDoorState.photo) return;

    await persistFrontDoorState({
      ...frontDoorState,
      nextDone: true,
    });
  };

  const allSectionsLoaded = useMemo(() => {
    if (!sections.length) return true;
    return sections.every((t) => {
      const loading = sectionPhotoLoading?.[t.id] === true;
      const ready = sectionPhotosReady?.[t.id] === true;
      return !loading && ready;
    });
  }, [sections, sectionPhotoLoading, sectionPhotosReady]);

  const handleEvidenceMediaModeChange = async (nextMode) => {
    if (changingMode) return;
    if (evidenceModeLocked) return;
    if (nextMode === evidenceMediaMode) return;

    const prevMode = evidenceMediaMode;

    try {
      setChangingMode(true);

      await setEvidenceMediaMode(nextMode);

      const res = await setModeApi({
        trackerId: uuid,
        mode: nextMode,
      });

      if (res?.data) {
        useGlobalStore.setState((state) => ({
          initialConfig: state.initialConfig
            ? {
                ...state.initialConfig,
                ...(res.data?.mode ? { mode: res.data.mode } : {}),
              }
            : state.initialConfig,
        }));
      }
    } catch (err) {
      console.error("Error updating evidence mode:", err);
      await setEvidenceMediaMode(prevMode);
    } finally {
      setChangingMode(false);
    }
  };

  const handleFinishJob = () => {
    setShowBeforeModal(false);
    setShowCompletedModal(true);

    finishJobApi()
      .then((res) => {
        if (res?.data?.acknowledged) {
          useGlobalStore.setState((state) => ({
            initialConfig: {
              ...state.initialConfig,
              evidence: res.data,
            },
          }));
        } else {
          console.warn("finishJobApi respondió sin acknowledged=true");
        }
      })
      .catch((err) => {
        console.error("Error en finishJobApi():", err);
      });
  };

  const handleFinishJobVideo = () => {
    setVideoSummaryEnabled(false);
    setVideoReviewPending(false);
    setShowVideoProcessingOverlay(true);

    useGlobalStore.setState((state) => ({
      initialConfig: state.initialConfig
        ? {
            ...state.initialConfig,
            activeSummary: false,
            tab: "processing",
          }
        : state.initialConfig,
    }));

    finishJobVideoApi()
      .then((res) => {
        if (res?.data?.acknowledged) {
          console.log("RESPONSE finishJobVideoApi()", res?.data);

          useGlobalStore.setState((state) => ({
            initialConfig: {
              ...state.initialConfig,
              evidence: res.data,
              activeSummary: false,
              tab: "processing",
            },
          }));
        } else {
          console.warn("finishJobVideoApi respondió sin acknowledged=true");
          setShowVideoProcessingOverlay(false);
        }
      })
      .catch((err) => {
        console.error("Error en finishJobVideoApi():", err);

        setShowVideoProcessingOverlay(false);

        useGlobalStore.setState((state) => ({
          initialConfig: state.initialConfig
            ? {
                ...state.initialConfig,
                activeSummary: false,
                tab: "evidence",
              }
            : state.initialConfig,
        }));
      });
  };

  const handleBeforeCloseModal = () => setShowBeforeModal(false);

  const handleCloseModal = () => {
    setActiveMenu("summary");
    useGlobalStore.setState({
      initialConfig: { ...initialConfig, tab: "summary" },
    });
  };

  const photoButtonDisabled =
    syncingPhotos ||
    hasPendingSync ||
    !allSectionsLoaded ||
    !allSectionsComplete;

  const videoButtonDisabled = !videoSummaryEnabled || videoReviewPending;

  const isButtonDisabled = isPhotosMode
    ? photoButtonDisabled
    : videoButtonDisabled;

  const buttonMode = isPhotosMode
    ? syncingPhotos || hasPendingSync
      ? "sync"
      : !allSectionsLoaded
      ? "loading"
      : "ready"
    : "ready";

  const shouldShowFrontDoorStep =
    frontDoorStateReady &&
    initialConfig?.jobStatus !== "completed" &&
    initialConfig?.tab !== "processing" &&
    frontDoorState.nextDone !== true &&
    !hasFrontDoorPhotoInInitialConfig;

  if (!frontDoorStateReady) {
    return <div className="p-3 container-before" />;
  }

  return (
    <div className="p-3 container-before">
      {shouldShowFrontDoorStep ? (
        <FrontDoorCaptureStep
          photo={frontDoorState.photo}
          onSend={handleFrontDoorSend}
          onRemove={handleFrontDoorRemove}
          onNext={handleFrontDoorNext}
        />
      ) : (
        <>
          {isPhotosMode ? (
            <>
              <AccordionSection />

              {allSectionsLoaded && !allSectionsComplete && !evidenceCompleted && (
                <div
                  className="d-flex align-items-center p-3 rounded-0 mb-4 w-100 notif-location-share py-2"
                  style={{ backgroundColor: "#FFF7E0" }}
                >
                  <img
                    src={IconInfo}
                    alt=""
                    style={{ height: 25 }}
                    className="pe-2 d-flex align-items-center justify-content-center me-3"
                  />
                  <div>
                    <p className="mb-0 fw-200">
                      To finish this job, some required photo evidence is still
                      missing. Please complete all photos and then click{" "}
                      <strong className="fw-medium">“Finish Job.</strong>”
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <VideoEvidence
              onVideoDoneStart={() => setVideoDoneLock(true)}
              onVideoDoneEnd={() => setVideoDoneLock(false)}
            />
          )}

          {isPhotosMode && (
            <>
              <BeforeFinishingModal
                show={showBeforeModal}
                onFinishJob={handleFinishJob}
                onClose={handleBeforeCloseModal}
              />

              <JobCompletedModal
                show={showCompletedModal}
                onClose={handleCloseModal}
              />
            </>
          )}

          <EvidenceBottomBar
            evidenceMediaMode={evidenceMediaMode}
            setEvidenceMediaMode={handleEvidenceMediaModeChange}
            isChangingMode={changingMode || videoDoneLock}
            isButtonDisabled={isButtonDisabled}
            buttonMode={buttonMode}
            evidenceModeLocked={evidenceModeLocked || videoDoneLock}
            onFinishClick={() => {
              if (isVideoMode) {
                handleFinishJobVideo();
                return;
              }

              setShowBeforeModal(true);
            }}
          />

        </>
      )}

      <ShowWorkModal />
    </div>
  );
}