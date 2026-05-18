import React, { useEffect, useState } from "react";
import CameraModal from "./CameraModal";
import CameraPermissionHelpModal from "./CameraPermissionHelpModal";
import { checkCameraPermission } from "../../../utils/cameraPermission";
import { detectOS } from "../../../utils/device";

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function FrontDoorCaptureStep({
  photo,
  onSend,
  onRemove,
  onNext,
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [deviceOS, setDeviceOS] = useState("other");

  useEffect(() => {
    const handler = () => {
      setShowCamera(false);
      setShowHelp(true);
    };

    window.addEventListener("camera-permission-denied", handler);
    return () =>
      window.removeEventListener("camera-permission-denied", handler);
  }, []);

  const handleOpenCamera = async () => {
    const permission = await checkCameraPermission();
    const os = detectOS();
    setDeviceOS(os);

    if (permission === "granted" || permission === "prompt") {
      setShowCamera(true);
    } else {
      setShowHelp(true);
    }
  };

    const handleCapture = async (selectedBlobs) => {
        const selectedBlob = selectedBlobs?.[0];
        if (!selectedBlob) return;

        await onSend?.(selectedBlob);
    };

  return (
    <div className="front-door-step">
        {photo ? (
            <p className="front-door-done-text mt-3 mb-0">
            <strong>Done.</strong> Tap Next to continue with before and after
            evidence.
            </p>
        ):(
            <p className="front-door-instruction mb-3">
                Take a front door photo-make sure the unit number is visible.
            </p>
        )}

        <div className="front-door-actions-row">
            <button
                type="button"
                className={`front-door-take-photo-card ${photo ? "disabled" : ""}`}
                onClick={() => {
                    if (photo) return;
                    handleOpenCamera();
                }}
                disabled={!!photo}
            >
                <i className="bi bi-camera fs-2 mb-2" />
                <span>Take Photo</span>
            </button>

            {photo && (
                <div className="front-door-thumb-card">
                    {!photo.uploading && !photo.removing && (
                    <button
                        type="button"
                        className="front-door-thumb-remove"
                        onClick={onRemove}
                        aria-label="Remove photo"
                        title="Remove photo"
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                    )}

                    <img
                    src={photo.url}
                    alt="Front door"
                    className="front-door-thumb-image"
                    />

                    {(photo.uploading || photo.removing) && (
                    <div className="front-door-thumb-overlay">
                        <div className="spinner-border spinner-border-sm text-light" role="status" />
                    </div>
                    )}
                </div>
            )}
        </div>

        <div className="front-door-next-bar">
            <button
                type="button"
                className="front-door-next-btn"
                disabled={!photo || photo.uploading}
                onClick={onNext}
            >
                Next
            </button>
        </div>

        <CameraModal
            show={showCamera}
            onHide={() => setShowCamera(false)}
            onCapture={handleCapture}
            minPhotos={1}
            maxPhotos={1}
            selectionMode="single"
            sendButtonLabel="Send"
            showMinMaxHint={false}
        />

        <CameraPermissionHelpModal
            show={showHelp}
            os={deviceOS}
            onClose={() => setShowHelp(false)}
        />
    </div>
  );
}