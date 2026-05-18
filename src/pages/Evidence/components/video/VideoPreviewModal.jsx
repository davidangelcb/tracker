import React, { useEffect, useRef } from "react";
import "./VideoPreviewModal.css";

export default function VideoPreviewModal({ show, videoUrl, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!show) return;

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [show]);

  if (!show || !videoUrl) return null;

  return (
    <div className="video-preview-modal">
      <button className="video-preview-close-btn" onClick={onClose}>
        ✕
      </button>

      <div className="video-preview-modal-body">
        <video
          ref={videoRef}
          src={videoUrl}
          className="video-preview-modal-player"
          controls
          autoPlay
          playsInline
        />
      </div>
    </div>
  );
}