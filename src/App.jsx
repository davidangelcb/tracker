import React, { useEffect } from "react";
import Header from "./components/Header";
import { useGlobalStore } from "./store/useGlobalStore";
import LocationPage from "./pages/Location/LocationPage";
import EvidencePage from "./pages/Evidence/EvidencePage";
import SummaryPage from "./pages/Summary/SummaryPage";
import SummaryVideoPage from "./pages/SummaryVideo/SummaryVideoPage";
import WelcomeModal from "./components/WelcomeModal";
import { startSyncScheduler } from "./services/syncScheduler";
import { useJobSocket } from "./hooks/useJobSocket";
import VideoProcessingOverlay from "./components/video/VideoProcessingOverlay";
import VideoReviewModal from "./components/video/VideoReviewModal";

import "./App.css";
import Loader from "./assets/images/loading2.gif";
// import OrientationOverlay from './components/OrientationOverlay';

export default function App() {
  const activeMenu = useGlobalStore((state) => state.activeMenu);
  const setActiveMenu = useGlobalStore((state) => state.setActiveMenu);
  const initialConfig = useGlobalStore((s) => s.initialConfig);
  const notiOff = useGlobalStore((state) => state.notiOff);
  const uuid = useGlobalStore((s) => s.uuid);
  const initEvidenceMediaMode = useGlobalStore((s) => s.initEvidenceMediaMode);
  const initEvidenceModeLocked = useGlobalStore((s) => s.initEvidenceModeLocked);
  const showVideoProcessingOverlay = useGlobalStore(
    (s) => s.showVideoProcessingOverlay
  );
  const setShowVideoProcessingOverlay = useGlobalStore(
    (s) => s.setShowVideoProcessingOverlay
  );

  const showVideoReviewModal = useGlobalStore(
    (state) => state.showVideoReviewModal
  );

  const setShowVideoReviewModal = useGlobalStore(
    (state) => state.setShowVideoReviewModal
  );

  useJobSocket(uuid);

  const initialPhotosReady = useGlobalStore((s) => s.initialPhotosReady);

  useEffect(() => {
    if (!initialConfig?.mode) return;
    initEvidenceMediaMode(initialConfig.mode);
  }, [initialConfig?.mode, initEvidenceMediaMode]);

  useEffect(() => {
    if (typeof initialConfig?.evidenceModeLocked !== "boolean") return;
    initEvidenceModeLocked(initialConfig.evidenceModeLocked);
  }, [initialConfig?.evidenceModeLocked, initEvidenceModeLocked]);

  useEffect(() => {
    if (!initialConfig?.tab) return;

    const isProcessing = initialConfig.tab === "processing";
    setShowVideoProcessingOverlay(isProcessing);

    if (isProcessing && activeMenu !== "evidence") {
      setActiveMenu("evidence");
    }
  }, [
    initialConfig?.tab,
    activeMenu,
    setActiveMenu,
    setShowVideoProcessingOverlay,
  ]);

  useEffect(() => {
    if (!initialConfig) return;
    if (
      initialConfig.tab === "location" ||
      initialConfig.tab === "summary"
    ) return;

    startSyncScheduler();
  }, [initialConfig?.tab]);

  const renderPage = () => {
    if (activeMenu === "evidence" && initialConfig?.jobStatus === "completed") {
      return initialConfig?.mode === "videos"
        ? <SummaryVideoPage />
        : <SummaryPage />;
    }

    if (activeMenu === "evidence" && !initialPhotosReady) {
      return (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <div>
            <img src={Loader} className="loader-photos" alt="Loading..." />
          </div>
        </div>
      );
    }

    switch (activeMenu) {
      case "location":
        return <LocationPage />;
      case "evidence":
        return (
          <EvidencePage
            key={`evidence-${initialPhotosReady}`}
          />
        );
      case "summary":
        return <SummaryPage />;
      case "summary-video":
        return <SummaryVideoPage />;
      default:
        return <LocationPage />;
    }
  };

  return (
    <>
      <Header />

      <main style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {renderPage()}

        {!notiOff && <WelcomeModal />}
      </main>

      {showVideoProcessingOverlay && <VideoProcessingOverlay />}

      <VideoReviewModal
        show={showVideoReviewModal}
        onClose={() => setShowVideoReviewModal(false)}
      />
      
    </>
  );
}