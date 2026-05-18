import React, { useEffect, useRef, useState } from "react";
import "./VideoRecorderModal.css";
import ProcessingModal from "./ProcessingModal";

const MAX_VIDEO_SECONDS = 30;

export default function VideoRecorderModal({
  show,
  onClose,
  sectionId,
  tab,
  onDoneVideo,
  retakeContext = null,
}) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const videoBlobRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [seconds, setSeconds] = useState(0);

  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);

  useEffect(() => {
    if (!show) return;

    const initCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: true,
        });

        streamRef.current = s;

        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Camera error", err);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [show]);

  useEffect(() => {
    if (!recording) return;

    const t = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;

        if (next >= MAX_VIDEO_SECONDS) {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          setRecording(false);
          return MAX_VIDEO_SECONDS;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [recording]);

  const formatTime = (sec) => {
    const safeSec = Math.max(0, sec);
    const m = String(Math.floor(safeSec / 60)).padStart(2, "0");
    const s = String(safeSec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const remainingSeconds = MAX_VIDEO_SECONDS - seconds;

  const startRecording = () => {
    if (!streamRef.current) return;

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    const candidates = [
      "video/mp4;codecs=h264,aac",
      "video/mp4",
      "video/quicktime",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    let mimeType = "";

    for (const type of candidates) {
      try {
        if (window.MediaRecorder?.isTypeSupported?.(type)) {
          mimeType = type;
          break;
        }
      } catch (err) {
        console.warn("MediaRecorder.isTypeSupported error:", err);
      }
    }

    const recorder = mimeType
      ? new MediaRecorder(streamRef.current, { mimeType })
      : new MediaRecorder(streamRef.current);

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const finalMimeType = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type: finalMimeType });
      const url = URL.createObjectURL(blob);

      videoBlobRef.current = blob;
      setVideoUrl(url);
      setShowPlayOverlay(true);
      setShowControls(false);
    };

    recorder.start();

    setRecording(true);
    setSeconds(0);
    setShowPlayOverlay(false);
    setShowControls(false);
    setShowProcessingModal(false);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "recording") return;

    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handlePlay = () => {
    if (!videoRef.current) return;

    try {
      setShowControls(true);
      setShowPlayOverlay(false);
      videoRef.current.play();
    } catch (e) {
      console.warn("play() blocked:", e);
    }
  };

  const resetAndClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setVideoUrl(null);
    setShowPlayOverlay(false);
    setShowControls(false);
    setShowProcessingModal(false);
    setSeconds(0);
    setRecording(false);
    chunksRef.current = [];
    videoBlobRef.current = null;

    onClose();
  };

  const handleClose = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    resetAndClose();
  };

  const handleShowProcessingModal = () => {
    if (!videoUrl || !sectionId || !tab) return;

    if (videoRef.current) {
      videoRef.current.pause();
    }

    setShowPlayOverlay(true);
    setShowControls(false);

    // 1. mostrar processing inmediatamente
    setShowProcessingModal(true);

    // 2. lanzar upload sin esperar respuesta
    if (onDoneVideo) {
      Promise.resolve(
        onDoneVideo({
          sectionId,
          tab,
          blob: videoBlobRef.current,
          videoUrl,
          createdAt: new Date().toISOString(),
          retakeContext,
        })
      ).catch((err) => {
        console.error("onDoneVideo error:", err);
      });
    }

    // 3. ocultar solo el recorder desde el padre
    onClose();
  };

  const handleCloseProcessingModal = () => {
    setShowProcessingModal(false);

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setVideoUrl(null);
    setShowPlayOverlay(false);
    setShowControls(false);
    setSeconds(0);
    setRecording(false);
    chunksRef.current = [];
    videoBlobRef.current = null;
  };

  if (!show && !showProcessingModal) return null;

  return (
    <>
      {show && (
        <div className="video-recorder-modal">
          <button className="video-close-btn" onClick={handleClose}>
            ✕
          </button>

          {recording && (
            <div className="video-timer">
              {formatTime(remainingSeconds)}
            </div>
          )}

          {!videoUrl ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-preview"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                className="video-preview"
                playsInline
                controls={showControls}
                onPlay={() => setShowPlayOverlay(false)}
                onPause={() => setShowPlayOverlay(true)}
              />

              {showPlayOverlay && (
                <button
                  className="video-play-overlay"
                  onClick={handlePlay}
                  type="button"
                >
                  <span className="video-play-triangle"></span>
                </button>
              )}
            </>
          )}

          {!videoUrl && (
            <div className="record-container">
              <button
                className={`record-btn ${recording ? "recording" : ""}`}
                onClick={recording ? stopRecording : startRecording}
              />
            </div>
          )}

          {videoUrl && (
            <div className="video-done-container">
              <button
                className="video-done-btn"
                onClick={handleShowProcessingModal}
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}

      <ProcessingModal
        show={showProcessingModal}
        onClose={handleCloseProcessingModal}
      />
    </>
  );
}