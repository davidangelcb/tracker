import React, { useRef, useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { FaCamera, FaTimes, FaBolt } from "react-icons/fa";
import { useGlobalStore } from "../../../store/useGlobalStore";
import "./CameraModal.css";

export default function CameraModal({
  show,
  onHide,
  onCapture,
  maxPhotos = 5,
  minPhotos = 0,
  selectionMode = "multiple",
  sendButtonLabel = "Send",
  showMinMaxHint = true,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [photos, setPhotos] = useState([]);

  const [cameraReady, setCameraReady] = useState(false);
  const setSyncingPhotos = useGlobalStore((s) => s.setSyncingPhotos);

  const [videoTrack, setVideoTrack] = useState(null);
  const [flashAvailable, setFlashAvailable] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const isSingleSelection = selectionMode === "single";

  useEffect(() => {
    if (show) {
      startCamera();
    } else {
      stopCamera();
      setPhotos([]);
    }

    return stopCamera;
  }, [show]);

  const startCamera = async () => {
    setCameraReady(false);

    try {
      const constraints = {
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      setStream(mediaStream);

      const track = mediaStream.getVideoTracks()[0];
      setVideoTrack(track);

      let flashSupported = false;

      try {
        const capabilities = track.getCapabilities?.();

        if (capabilities?.torch === true) {
          flashSupported = true;
        }

        if (!capabilities && track.applyConstraints) {
          flashSupported = true;
        }
      } catch (e) {
        // silencio intencional
      }

      setFlashAvailable(flashSupported);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Error iniciando cámara:", err);

      onHide?.();

      window.dispatchEvent(new CustomEvent("camera-permission-denied"));
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    setFlashOn(false);
    setFlashAvailable(false);
    setVideoTrack(null);
  };

  const toggleFlash = async () => {
    if (!videoTrack) return;

    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !flashOn }],
      });
      setFlashOn(!flashOn);
    } catch (err) {
      console.warn("Flash no soportado:", err);
    }
  };

  const takePhoto = () => {
    if (!cameraReady || !videoRef.current) return;

    if (!isSingleSelection && photos.length >= maxPhotos) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      setPhotos((prev) => {
        if (isSingleSelection) {
          return [{ blob, selected: true }];
        }

        return [...prev, { blob, selected: true }];
      });
    }, "image/jpeg");
  };

  const toggleSelectPhoto = (index) => {
    setPhotos((prev) => {
      if (isSingleSelection) {
        return prev.map((photo, i) => {
          if (i !== index) return { ...photo, selected: false };

          return { ...photo, selected: !photo.selected };
        });
      }

      return prev.map((photo, i) =>
        i === index ? { ...photo, selected: !photo.selected } : photo
      );
    });
  };

  const handleConfirm = () => {
    const selectedPhotos = photos
      .filter((photo) => photo.selected)
      .map((photo) => photo.blob);

    onCapture(selectedPhotos);
    setPhotos([]);
    onHide();
    setSyncingPhotos(true);
  };

  const selectedCount = photos.filter((photo) => photo.selected).length;

  const sendDisabled =
    selectedCount === 0 ||
    selectedCount > maxPhotos ||
    (isSingleSelection && selectedCount !== 1);

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      className="camera-modal"
    >
      <Modal.Body className="p-0 bg-black text-white camera-modal-body">
        <div className="camera-wrapper">
          <video ref={videoRef} autoPlay playsInline className="camera-view" />

          <button className="close-overlay-btn" onClick={onHide}>
            <FaTimes />
          </button>

          {flashAvailable && (
            <button
              className={`flash-btn ${flashOn ? "on" : ""}`}
              onClick={toggleFlash}
            >
              <FaBolt />
            </button>
          )}

          <button
            className={`capture-btn ${!cameraReady ? "disabled" : ""}`}
            onClick={takePhoto}
            disabled={!cameraReady}
          >
            <FaCamera />
          </button>
        </div>

        <canvas ref={canvasRef} hidden />

        <div className="thumbnails-container">
          {photos.map((photo, index) => (
            <div
              key={index}
              className={`thumb ${photo.selected ? "selected" : ""}`}
              onClick={() => toggleSelectPhoto(index)}
            >
              <img
                src={URL.createObjectURL(photo.blob)}
                alt={`captura-${index}`}
                className="rounded-0 border-0"
                width={90}
                height={70}
              />
              {photo.selected && <div className="overlay-checkmark">✓</div>}
            </div>
          ))}
        </div>

        <div className="footer-section">
          <button
            className="send-btn rounded-0"
            disabled={sendDisabled}
            onClick={handleConfirm}
          >
            {sendButtonLabel}
            {!isSingleSelection ? ` (${selectedCount} / ${maxPhotos})` : ""}
          </button>

          {showMinMaxHint && (
            <p className="hint-text">
              {minPhotos > 1 && (
                <>
                  The min number of photos is {minPhotos}.
                  <br />
                </>
              )}
              The max number of photos is {maxPhotos}.
            </p>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}