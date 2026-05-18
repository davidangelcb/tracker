import React, { useEffect } from "react";
import { parseVideo } from "../utils/video";
import "./VideoModal.css";

export function VideoModal({ show, onClose, videoUrl }) {
  const video = parseVideo(videoUrl);
  if (!show || !video) return null;

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const ratioClass = video.isVertical
    ? "video-ratio-9x16"
    : "video-ratio-16x9";

  return (
    <div className="video-modal-overlay">
      <div className={`video-modal-container ${video.isVertical ? "vertical" : ""}`}>
        
        {/* BOTÓN CLOSE (100% funcional) */}
        <button
          className="video-modal-close"
          onClick={onClose}
          aria-label="Close video"
        >
          <i className="bi bi-x-lg"></i>
        </button>

        <div className={`video-frame ${ratioClass}`}>
          <iframe
            src={video.embedUrl}
            title="Video tutorial"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
