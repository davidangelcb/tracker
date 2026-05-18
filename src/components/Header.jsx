import React, { useState } from "react";
import { useGlobalStore } from "../store/useGlobalStore";
import Menu from "../components/Menu";
import ShareModal from "../components/ShareModal";
import ContactInfoModal from "../components/ContactInfoModal";
import IconHelp from "../assets/images/icon-help.svg";
import PinchLogo from "../assets/images/pinch_logo.svg";
import "./Header.css";

export default function Header() {
  const initialConfig = useGlobalStore((state) => state.initialConfig);
  const jobStarted = useGlobalStore((state) => state.jobStarted);
  const evidenceCompleted = useGlobalStore((state) => state.evidenceCompleted);

  // --- MODALES ---
  const [showShare, setShowShare] = useState(false);
  const [showContactInfoModal, setShowContactInfoModal] = useState(false);

  const handleCloseContactInfo = () => setShowContactInfoModal(false);

  // Determinar estado del job y estilos
  let statusText = "Scheduled";
  let statusStyles = { backgroundColor: "#EEF2FA", color: "#2F80ED" };

  if (evidenceCompleted || initialConfig.tab == 'summary') {
    statusText = "Completed";
    statusStyles = { backgroundColor: "#EDF9F0", color: "#23A756" };
  } else if (jobStarted || initialConfig.tab == 'evidence') {
    statusText = "In Progress";
    statusStyles = { backgroundColor: "#E2E9FB", color: "#1B3486" };
  }

  return (
    <header>
      <div className="header-top d-flex justify-content-between align-items-center py-3 px-3">
        <img src={PinchLogo} className="PINCH" />
        <div className="tracking d-flex align-items-center">
          <span className="text-secondary me-2 text-blue fs-6 fw-semibold">#{initialConfig.number}</span>
          <button className="btn btn-share btn-sm fw-600" style={{margin: 1 }} onClick={() => setShowShare(true)}>
            <i className="bi bi-share fs-6"></i> Share
          </button>
        </div>
      </div>

      <div className="header-status d-flex justify-content-between align-items-center small py-2 px-3 fw-100">
        <div className="lh-normal">
          <span className="fs-14 fw-500">{initialConfig.service}</span>
        </div>

        <div className="d-flex align-items-center">
          <span
            className="status me-2 rounded-4 px-2 py-1 fs-14"
            style={{
              backgroundColor: statusStyles.backgroundColor,
              color: statusStyles.color,
            }}
          >
            • {statusText}
          </span>
          <span className="support" onClick={() => setShowContactInfoModal(true)}>
            <img src={IconHelp} alt="lock" style={{ width: 25 }} />
          </span>
        </div>
      </div>

      <Menu />

      <ShareModal
        show={showShare}
        onClose={() => setShowShare(false)}
        shareUrl="https://trackingnumber/pp?key=123"
      />

      <ContactInfoModal
        show={showContactInfoModal}
        onClose={handleCloseContactInfo}
      />

    </header>
  );
}
