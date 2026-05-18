import React, { useRef, useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import { FaCamera, FaTimes, FaBolt } from "react-icons/fa";
import { useGlobalStore } from "../../../store/useGlobalStore";
import "./CameraModal.css";

export default function CameraModal({ show, onHide, onCapture, maxPhotos = 5, minPhotos = 0 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [photos, setPhotos] = useState([]);

  const [cameraReady, setCameraReady] = useState(false);
  const setSyncingPhotos = useGlobalStore((s) => s.setSyncingPhotos);

  // estados FLASH
  // =========================
  const [videoTrack, setVideoTrack] = useState(null); // track de video
  const [flashAvailable, setFlashAvailable] = useState(false); // si el device soporta torch
  const [flashOn, setFlashOn] = useState(false); // estado actual del flash


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
      const constraints = { video: { facingMode: { ideal: "environment" } }, audio: false };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      // detectar flash
      // =========================
      const track = mediaStream.getVideoTracks()[0];
      setVideoTrack(track);

      let flashSupported = false;

      try {
        const capabilities = track.getCapabilities?.();

        if (capabilities?.torch === true) {
          flashSupported = true;
        }

        // muchos Android NO reportan torch pero sí lo soportan
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
          setCameraReady(true);   // La cámara ya está lista
        };
      }
    } catch (err) {
      console.error("Error iniciando cámara:", err);

      // iOS: cámara bloqueada > cerrar modal
      onHide?.();

      // Emitir evento global
      window.dispatchEvent(
        new CustomEvent("camera-permission-denied")
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // reset flash
    // =========================
    setFlashOn(false);
    setFlashAvailable(false);
    setVideoTrack(null);
  };

  // toggle flash
  // =========================
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
    if (!cameraReady || !videoRef.current || photos.length >= maxPhotos) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      setPhotos(prev => [...prev, { blob, selected: true }]); // cada foto inicia como seleccionada
    }, "image/jpeg");
  };

  const toggleSelectPhoto = (index) => {
    setPhotos(prev =>
      prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p)
    );
  };

  const handleConfirm = () => {
    const selectedPhotos = photos.filter(p => p.selected).map(p => p.blob);
    onCapture(selectedPhotos);
    setPhotos([]);
    onHide();
    setSyncingPhotos(true);
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" className="camera-modal">
      <Modal.Body className="p-0 bg-black text-white camera-modal-body">
        <div className="camera-wrapper">
          <video ref={videoRef} autoPlay playsInline className="camera-view" />
          
          {/* cerrar */}
          <button className="close-overlay-btn" onClick={onHide}>
            <FaTimes />
          </button>

          {/* botón FLASH */}
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
          {photos.map((p, i) => (
            <div
              key={i}
              className={`thumb ${p.selected ? "selected" : ""}`}
              onClick={() => toggleSelectPhoto(i)}
            >
              <img
                src={URL.createObjectURL(p.blob)}
                alt={`captura-${i}`}
                className="rounded-0 border-0"
                width={90}
                height={70}
              />
              {p.selected && <div className="overlay-checkmark">✓</div>}
            </div>
          ))}
        </div>

        <div className="footer-section">
          <button
            className="send-btn rounded-0"
            disabled={
              photos.filter(p => p.selected).length === 0 ||
              photos.filter(p => p.selected).length > maxPhotos
            }
            onClick={handleConfirm}
          >
            Send ({photos.filter(p => p.selected).length} / {maxPhotos})
          </button>

          <p className="hint-text">
            {minPhotos > 1 && (
            <>
            The min number of photos is {minPhotos}.<br />
            </>
            )}
            The max number of photos is {maxPhotos}.
          </p>
        </div>
      </Modal.Body>
    </Modal>
  );
}
