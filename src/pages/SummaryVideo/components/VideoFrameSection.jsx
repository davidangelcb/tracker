import React, { useState } from "react";
import VideoFrameCard from "./VideoFrameCard";
import FramePreviewCarouselModal from "../../../components/FramePreviewCarouselModal";

export default function VideoFrameSection({
  title,
  categoryTitle,
  frames,
  timezone,
}) {
  const [preview, setPreview] = useState({
    show: false,
    currentIndex: 0,
  });

  if (!Array.isArray(frames) || frames.length === 0) return null;

  const openPreview = (index) => {
    setPreview({
      show: true,
      currentIndex: index,
    });
  };

  const closePreview = () => {
    setPreview({
      show: false,
      currentIndex: 0,
    });
  };

  return (
    <div className="video-frame-section pt-1 mb-3">
      {title && <h6 className="mb-2 p-2 section-title">{title}</h6>}

      <div className="video-frame-grid">
        {frames.map((frame, index) => (
          <div
            key={frame.id || `${title}-${index}`}
            onClick={() => openPreview(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openPreview(index);
              }
            }}
            role="button"
            tabIndex={0}
            style={{ cursor: "zoom-in" }}
          >
            <VideoFrameCard frame={frame} timezone={timezone} />
          </div>
        ))}
      </div>

      <FramePreviewCarouselModal
        show={preview.show}
        frames={frames}
        currentIndex={preview.currentIndex}
        onClose={closePreview}
        onChangeIndex={(idx) =>
          setPreview((prev) => ({
            ...prev,
            currentIndex: idx,
          }))
        }
        showDates={true}
        showCategoryTag={!!categoryTitle}
        categoryTagText={categoryTitle || ""}
        showBbox={true}
      />
    </div>
  );
}