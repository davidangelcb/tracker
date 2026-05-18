import React from "react";
import MediaModeSwitch from "./MediaModeSwitch";

export default function EvidenceBottomBar({
  evidenceMediaMode,
  setEvidenceMediaMode,
  isChangingMode,
  isButtonDisabled,
  buttonMode,
  onFinishClick,
  evidenceModeLocked = false,
}) {
  return (
    <div className="evidence-bottom-bar">
      {/*
      <MediaModeSwitch
        mode={evidenceMediaMode}
        onChange={setEvidenceMediaMode}
        disabled={isChangingMode || evidenceModeLocked}
      />
      */}

      <div className="finish-job-fixed">
        <button
          className="btn btn-custom btn-primary finish-job-btn rounded-0"
          disabled={isButtonDisabled}
          onClick={onFinishClick}
        >
          {buttonMode === "sync" ? (
            <>
              <i className="bi bi-hourglass-split me-2 spin"></i>
              Syncing Photos
            </>
          ) : buttonMode === "loading" ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Loading Photos
            </>
          ) : (
            <>Finish Job</>
          )}
        </button>
      </div>
    </div>
  );
}