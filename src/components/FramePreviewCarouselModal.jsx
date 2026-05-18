import React, { useEffect, useMemo, useState } from "react";
import { Modal, Carousel } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";
import { useGlobalStore } from "../store/useGlobalStore";
import { convertUtcToTimezone } from "../utils/dateTime";
import {
  buildBboxBoxStyle,
  getBboxLabelStyle,
  prettifyDetectedClass,
} from "../utils/framePreview";
import "./FramePreviewCarouselModal.css";

export default function FramePreviewCarouselModal({
  show,
  frames = [],
  currentIndex = 0,
  onClose,
  onChangeIndex,
  showDates = true,
  showCategoryTag = false,
  categoryTagText = "",
  showBbox = true,
}) {
  const initialConfig = useGlobalStore((state) => state.initialConfig);
  const timezone = initialConfig?.timezone || "America/New_York";

  const [loadedImages, setLoadedImages] = useState({});
  const [imageDimensions, setImageDimensions] = useState({});

  useEffect(() => {
    if (!show) {
      setLoadedImages({});
      setImageDimensions({});
    }
  }, [show]);

  const safeFrames = useMemo(() => {
    return Array.isArray(frames) ? frames.filter((f) => !!f?.url) : [];
  }, [frames]);

  const handleLoad = (idx, event) => {
    const img = event.currentTarget;

    setLoadedImages((prev) => ({ ...prev, [idx]: true }));
    setImageDimensions((prev) => ({
      ...prev,
      [idx]: {
        width: img.naturalWidth || 0,
        height: img.naturalHeight || 0,
      },
    }));
  };

  const currentFrame = safeFrames[currentIndex] || null;

  const renderDate = (date) => {
    if (!date) return "";
    return convertUtcToTimezone(date, timezone, "long");
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      size="lg"
      className="frame-preview-modal"
      backdropClassName="custom-backdrop"
      style={{background: "#000000"}}
    >
      <Modal.Body className="p-0 position-relative">
        <div className="frame-preview-container">
          {safeFrames.length > 0 && (
            <Carousel
              activeIndex={currentIndex}
              onSelect={(selectedIndex) => onChangeIndex?.(selectedIndex)}
              interval={null}
              indicators={false}
              controls={safeFrames.length > 1}
              nextLabel=""
              prevLabel=""
              touch={true}
            >
              {safeFrames.map((frame, idx) => {
                const label = prettifyDetectedClass(frame?.className);
                const dimensions = imageDimensions[idx];
                const boxStyle = showBbox
                  ? buildBboxBoxStyle(frame?.bbox, dimensions)
                  : null;

                const bboxLabelStyle = boxStyle
                  ? getBboxLabelStyle(boxStyle, {
                      reservedTopPx:
                        showDates || (showCategoryTag && categoryTagText) ? 78 : 18,
                    })
                  : null;

                return (
                  <Carousel.Item key={frame?.id || `frame-${idx}`}>
                    {(showDates || (showCategoryTag && categoryTagText)) &&
                      loadedImages[idx] && (
                        <div className="frame-preview-overlay-top position-absolute top-0 start-0 d-flex flex-column w-100">
                          {showDates && frame?.date && (
                            <div className="frame-preview-date-top">
                              {renderDate(frame.date)}
                            </div>
                          )}

                          {showCategoryTag && categoryTagText && (
                            <div className="frame-preview-tag">
                              {categoryTagText}
                            </div>
                          )}
                        </div>
                      )}

                    <div className="frame-preview-image-stage">
                      <img
                        src={frame.url}
                        alt={`frame-preview-${idx}`}
                        className={`frame-preview-image transition-fade ${
                          loadedImages[idx] ? "loaded" : "hidden"
                        }`}
                        onLoad={(event) => handleLoad(idx, event)}
                      />

                      {loadedImages[idx] && boxStyle && (
                        <>
                          <div
                            className="frame-preview-bbox"
                            style={{
                              left: boxStyle.left,
                              top: boxStyle.top,
                              width: boxStyle.width,
                              height: boxStyle.height,
                            }}
                          />

                          <div
                            className="frame-preview-bbox-label"
                            style={bboxLabelStyle || {}}
                            title={label}
                          >
                            {label}
                          </div>
                        </>
                      )}
                    </div>
                  </Carousel.Item>
                );
              })}
            </Carousel>
          )}

          <button className="frame-preview-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/*
        {currentFrame?.className ? (
          <div className="frame-preview-footer">
            <span>{prettifyDetectedClass(currentFrame.className)}</span>
          </div>
        ) : null}
        */}
        
      </Modal.Body>
    </Modal>
  );
}