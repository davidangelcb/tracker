import React, { useEffect, useMemo, useState } from "react";
import RemoveFrameConfirmModal from "./RemoveFrameConfirmModal";
import IconRefresh from "../../../../assets/images/icon-refresh.svg";
import IconVideo from "../../../../assets/images/icon-video2.svg";
import FramePreviewCarouselModal from "../../../../components/FramePreviewCarouselModal";
import {
  buildBboxBoxStyle,
  getBboxLabelStyle,
  prettifyDetectedClass,
} from "../../../../utils/framePreview";

function normalizeVideoUiState(item) {
  const backendVideoStatus =
    item?.videoStatus ||
    item?.remoteResponse?.videoStatus ||
    "";

  console.log("videoID", item?.videoID);
  console.log("backendVideoStatus", backendVideoStatus);

  const localStatus = item?.status || "";

  const normalizedBackend = String(backendVideoStatus).trim().toLowerCase();
  const normalizedLocal = String(localStatus).trim().toLowerCase();

  // 1) Errores locales explícitos
  if (normalizedLocal === "failed" || normalizedLocal === "error") {
    return {
      kind: "serviceInterrupted",
      label: "Service Interrupted",
      color: "#FF1E49",
      bg: "#FFE4E4",
      message:
        item?.errorMessage ||
        "An internal system error occurred. This is not a problem with your file; please process video again.",
      buttonLabel: "Process video again",
      showRetry: true,
      showRetake: false,
      showDate: false,
      showMetrics: false,
    };
  }

  // 2) Prioridad a estados finales/error del backend
  if (
    normalizedBackend === "serviceinterrupted" ||
    normalizedBackend === "interrupted"
  ) {
    return {
      kind: "serviceInterrupted",
      label: "Service Interrupted",
      color: "#FF1E49",
      bg: "#FFE4E4",
      message:
        "An internal system error occurred. This is not a problem with your file; please process video again.",
      buttonLabel: "Process video again",
      showRetry: true,
      showRetake: false,
      showDate: false,
      showMetrics: false,
    };
  }

  if (
    normalizedBackend === "ineligiblecontent" ||
    normalizedBackend === "ineligible"
  ) {
    return {
      kind: "ineligible",
      label: "Ineligible Content",
      color: "#E68600",
      bg: "#FFFAE7",
      message:
        "Insufficient video quality or length. Please re-take the video for better results.",
      buttonLabel: "Re-take video",
      showRetry: false,
      showRetake: true,
      showDate: false,
      showMetrics: false,
    };
  }

  if (
    normalizedBackend === "completed" ||
    normalizedLocal === "completed"
  ) {
    return {
      kind: "completed",
      label: "Analysis Completed",
      color: "#241D5D",
      bg: "#E9EFFA",
      message:
        "The video was processed, and frames were extracted successfully.",
      buttonLabel: "",
      showRetry: false,
      showRetake: false,
      showDate: true,
      showMetrics: true,
    };
  }

  // 3) Estados en progreso
  if (
    normalizedLocal === "local" ||
    normalizedLocal === "uploading" ||
    normalizedLocal === "saving" ||
    normalizedLocal === "uploaded" ||
    normalizedBackend === "inprogress" ||
    normalizedBackend === "processing"
  ) {
    return {
      kind: "processing",
      label: "Processing Video",
      color: "#E68600",
      bg: "#FFFAE7",
      message:
        "When the video process is complete, the image frames are generated automatically.",
      buttonLabel: "",
      showRetry: false,
      showRetake: false,
      showDate: false,
      showMetrics: false,
    };
  }

  return {
    kind: "processing",
    label: "Processing Video",
    color: "#E68600",
    bg: "#FFFAE7",
    message:
      "When the video process is complete, the image frames are generated automatically.",
    buttonLabel: "",
    showRetry: false,
    showRetake: false,
    showDate: false,
    showMetrics: false,
  };
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  } catch {
    return dateString;
  }
}

function formatFrameDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

/*
function prettifyClassName(value) {
  if (!value) return "Detected object";

  return String(value)
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
*/

function getFrameId(frame, index) {
  return frame?._id || frame?.id || frame?.s3_url || `frame-${index}`;
}

/*
function buildBoxStyle(bbox, dimensions) {
  if (!bbox || !dimensions?.width || !dimensions?.height) return null;

  const left = (bbox.x1 / dimensions.width) * 100;
  const top = (bbox.y1 / dimensions.height) * 100;
  const width = ((bbox.x2 - bbox.x1) / dimensions.width) * 100;
  const height = ((bbox.y2 - bbox.y1) / dimensions.height) * 100;

  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    topPct: top,
    heightPct: height,
  };
}
*/

/*
function getBboxLabelStyle(boxStyle) {
  if (!boxStyle) return null;

  const reservedTopPx = 34;
  const canRenderAbove = boxStyle.topPct > 18;

  if (canRenderAbove) {
    return {
      left: boxStyle.left,
      top: `max(${reservedTopPx}px, calc(${boxStyle.top} - 34px))`,
    };
  }

  return {
    left: boxStyle.left,
    top: `calc(${boxStyle.top} + ${boxStyle.height} + 6px)`,
  };
}
*/

export default function VideoResultCard({
  item,
  sectionTitle,
  onRetry,
  onRetake,
  onOpenPreview,
  onRemoveFrames,
}) {
  if (!item) return null;

  const currentStatus = normalizeVideoUiState(item);

  const [selectedFrameIds, setSelectedFrameIds] = useState([]);
  const [frameDimensions, setFrameDimensions] = useState({});
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const [preview, setPreview] = useState({
    show: false,
    currentIndex: 0,
  });

  const frames = useMemo(() => {
    return Array.isArray(item?.images)
      ? item.images
      : Array.isArray(item?.remoteResponse?.images)
      ? item.remoteResponse.images
      : [];
  }, [item]);

  useEffect(() => {
    setSelectedFrameIds([]);
    setFrameDimensions({});
    setShowRemoveConfirm(false);
  }, [item?.id, item?.idVideo, frames.length]);

  useEffect(() => {
    setSelectedFrameIds((prev) =>
      prev.filter((selectedId) =>
        frames.some((frame, index) => getFrameId(frame, index) === selectedId)
      )
    );
  }, [frames]);

  const selectedFrames = useMemo(() => {
    return frames.filter((frame, index) =>
      selectedFrameIds.includes(getFrameId(frame, index))
    );
  }, [frames, selectedFrameIds]);

  const previewFrames = useMemo(() => {
    return frames
      .map((frame, index) => ({
        id: getFrameId(frame, index),
        url: frame?.s3_url || "",
        date: item?.createdAt || "",
        className: frame?.class_name || "",
        bbox: frame?.bbox || null,
      }))
      .filter((frame) => !!frame.url);
  }, [frames, item?.createdAt]);

  const removingFrameId = item?.removingFrameId || null;
  const removeFrameError = item?.removeFrameError || "";

  const framesExtracted =
    frames.length || item?.framesExtracted || "--";

  const canSelectMore = selectedFrameIds.length < Math.max(frames.length - 1, 0);

  const handleBottomAction = () => {
    if (currentStatus.showRetake) {
      onRetake?.();
      return;
    }

    onRetry?.();
  };

  const handleToggleFrame = (frameId) => {
    if (removingFrameId) return;

    setSelectedFrameIds((prev) => {
      const alreadySelected = prev.includes(frameId);

      if (alreadySelected) {
        return prev.filter((id) => id !== frameId);
      }

      if (prev.length >= frames.length - 1) {
        return prev;
      }

      return [...prev, frameId];
    });
  };

  const handleRemoveSelected = () => {
    if (!selectedFrames.length) return;
    if (frames.length - selectedFrames.length < 1) return;
    if (removingFrameId) return;

    setShowRemoveConfirm(true);
  };

  const handleConfirmRemoveSelected = async () => {
    if (!selectedFrames.length) return;
    if (frames.length - selectedFrames.length < 1) return;
    if (removingFrameId) return;

    try {
      await onRemoveFrames?.(selectedFrames);
      setSelectedFrameIds([]);
      setShowRemoveConfirm(false);
    } catch (err) {
      console.error("handleConfirmRemoveSelected error:", err);
    }
  };

  const handleCloseRemoveConfirm = () => {
    if (removingFrameId) return;
    setShowRemoveConfirm(false);
  };

  const handleImageLoad = (frameId, event) => {
    const img = event.currentTarget;

    setFrameDimensions((prev) => ({
      ...prev,
      [frameId]: {
        width: img.naturalWidth || 0,
        height: img.naturalHeight || 0,
      },
    }));
  };

  const showFramesGallery =
    currentStatus.kind === "completed" &&
    Array.isArray(frames) &&
    frames.length > 0;

    const openFramePreview = (index) => {
    setPreview({
      show: true,
      currentIndex: index,
    });
  };

  const closeFramePreview = () => {
    setPreview({
      show: false,
      currentIndex: 0,
    });
  };

  return (
    <div className="video-result-wrapper">
      <div className="video-result-card">
        <div className="video-result-thumb-wrap">
          <video
            src={item.videoUrl}
            className="video-result-thumb"
            playsInline
            muted
            preload="metadata"
          />

          <button
            type="button"
            className="video-result-play-overlay"
            onClick={onOpenPreview}
          >
            <span className="video-result-play-triangle" />
          </button>
        </div>

        <div className="video-result-info">
          <div
            className="video-result-status rounded-5 fw-semibold"
            style={{
              color: currentStatus.color,
              backgroundColor: currentStatus.bg,
            }}
          >
            • {currentStatus.label}
          </div>

          {currentStatus.message ? (
            <p className="video-result-message mb-0 mt-0 fs-12">
              {currentStatus.message}
            </p>
          ) : null}

          {(currentStatus.showDate || currentStatus.showMetrics) && (
            <div className="video-result-divider" />
          )}

          {currentStatus.showDate && (
            <div className="video-result-date fs-12">
              {formatDate(item.createdAt)}
            </div>
          )}

          {currentStatus.showMetrics && (
            <div className="video-result-metrics fs-12">
              <div>
                Frames extracted: <strong>{framesExtracted}</strong>
              </div>
              <div>
                Avg. interval: <strong>{item.remoteResponse.avgInterval ?? "0s"}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {(currentStatus.showRetry || currentStatus.showRetake) && (
        <button
          type="button"
          className="video-process-again-btn"
          onClick={handleBottomAction}
        >
          {currentStatus.showRetake ? (
            <img src={IconVideo} height="25" alt="Video" />
          ) : IconRefresh ? (
            <img src={IconRefresh} alt="" />
          ) : (
            <span className="me-2">↻</span>
          )}
          <span>{currentStatus.buttonLabel}</span>
        </button>
      )}

      {showFramesGallery && (
        <div className="video-frames-gallery mt-3">
          {frames.length > 1 && (
            <div
              className="d-flex align-items-center justify-content-end mb-2"
              style={{ gap: "8px" }}
            >
              <button
                type="button"
                onClick={handleRemoveSelected}
                disabled={
                  !selectedFrameIds.length ||
                  !!removingFrameId ||
                  frames.length - selectedFrameIds.length < 1
                }
                title={
                  frames.length - selectedFrameIds.length < 1
                    ? "At least one frame must remain."
                    : "Remove selected"
                }
                style={{
                  border: "none",
                  background: "transparent",
                  color:
                    !selectedFrameIds.length ||
                    removingFrameId ||
                    frames.length - selectedFrameIds.length < 1
                      ? "#B8BCC6"
                      : "#FF2B2B",
                  fontSize: "14px",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: 0,
                  cursor:
                    !selectedFrameIds.length ||
                    removingFrameId ||
                    frames.length - selectedFrameIds.length < 1
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {removingFrameId ? (
                  <span className="spinner-border spinner-border-sm" role="status" />
                ) : (
                  <i className="bi bi-trash" style={{ fontSize: "20px" }}></i>
                )}
                <span style={{
                  color:
                    !selectedFrameIds.length ||
                    removingFrameId ||
                    frames.length - selectedFrameIds.length < 1
                      ? "#B8BCC6"
                      : "#4F4F4F",
                }}>
                  {removingFrameId
                    ? "Removing..."
                    : selectedFrameIds.length > 1
                    ? `Remove (${selectedFrameIds.length})`
                    : "Remove"}
                </span>
              </button>
            </div>
          )}

          {removeFrameError ? (
            <div
              className="mb-2"
              style={{
                color: "#F5335F",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {removeFrameError}
            </div>
          ) : null}

          <div
            className="video-frames-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {frames.map((frame, index) => {
              const frameId = getFrameId(frame, index);
              const imageUrl = frame?.s3_url || "";
              const label = prettifyDetectedClass(frame?.class_name);
              const bbox = frame?.bbox || null;
              const boxStyle = buildBboxBoxStyle(bbox, frameDimensions[frameId]);
              const bboxLabelStyle = getBboxLabelStyle(boxStyle, {
                reservedTopPx: 34,
              });
              const isSelected = selectedFrameIds.includes(frameId);
              const isRemoving = removingFrameId === frameId;
              const isDisabledForSelection =
                !isSelected && !canSelectMore;

              return (
                <div
                  key={frameId}
                  className="video-frame-card"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    background: "#F4F6FA",
                    border: isSelected ? "2px solid #1185FE" : "1px solid #D9E2F1",
                    opacity: isRemoving ? 0.65 : 1,
                  }}
                >
                  <div
                    className="video-frame-date-bar"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      zIndex: 4,
                      background: "#253B8E",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      lineHeight: 1.2,
                      padding: "4px 8px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {formatFrameDate(item.createdAt)}
                  </div>

                  <div
                    className="video-frame-image-wrap"
                    onClick={() => imageUrl && openFramePreview(index)}
                    style={{
                      position: "relative",
                      width: "100%",
                      background: "#EEF2F8",
                      paddingTop: "22px",
                      cursor: imageUrl ? "zoom-in" : "default",
                    }}
                  >
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={label}
                          className="video-frame-image"
                          onLoad={(event) => handleImageLoad(frameId, event)}
                          style={{
                            width: "100%",
                            minHeight: "140px",
                            display: "block",
                          }}
                        />

                        {boxStyle && (
                          <>
                            <div
                              style={{
                                position: "absolute",
                                left: boxStyle.left,
                                top: boxStyle.top,
                                width: boxStyle.width,
                                height: boxStyle.height,
                                border: "2px solid #1185FE",
                                background: "transparent",
                                zIndex: 3,
                                boxSizing: "border-box",
                                pointerEvents: "none",
                              }}
                            />

                            <div
                              style={{
                                position: "absolute",
                                ...bboxLabelStyle,
                                maxWidth: "75%",
                                background: "#1185FE",
                                color: "#FFFFFF",
                                fontSize: "10px",
                                fontWeight: 600,
                                lineHeight: 1.2,
                                padding: "6px 10px",
                                zIndex: 4,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                pointerEvents: "none",
                                boxSizing: "border-box",
                              }}
                              title={label}
                            >
                              {label}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          minHeight: "180px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          color: "#6B7280",
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >
                        Frame unavailable
                      </div>
                    )}

                    {frames.length > 1 && (
                      <label
                        onClick={(event) => event.stopPropagation()}
                        style={{
                          position: "absolute",
                          top: "25px",
                          right: "3px",
                          zIndex: 5,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "26px",
                          height: "26px",
                          cursor:
                            removingFrameId || isDisabledForSelection
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleFrame(frameId)}
                          disabled={!!removingFrameId || isDisabledForSelection}
                          style={{
                            position: "absolute",
                            opacity: 0,
                            pointerEvents: "none",
                          }}
                        />

                        <span
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            border: isSelected
                              ? "3px solid #1185FE"
                              : "2px solid #D7DCE6",
                            background: isSelected ? "#1185FE" : "#FFFFFF",
                            boxShadow: "0 0 0 2px rgba(255,255,255,0.85)",
                            display: "inline-block",
                            opacity: isDisabledForSelection ? 0.5 : 1,
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <RemoveFrameConfirmModal
        show={showRemoveConfirm}
        onClose={handleCloseRemoveConfirm}
        onConfirm={handleConfirmRemoveSelected}
        isRemoving={!!removingFrameId}
      />

      <FramePreviewCarouselModal
        show={preview.show}
        frames={previewFrames}
        currentIndex={preview.currentIndex}
        onClose={closeFramePreview}
        onChangeIndex={(idx) =>
          setPreview((prev) => ({
            ...prev,
            currentIndex: idx,
          }))
        }
        showDates={true}
        showCategoryTag={!!sectionTitle}
        categoryTagText={sectionTitle || ""}
        showBbox={true}
      />
    </div>
  );
}
