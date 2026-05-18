import React, { useState } from "react";
import ImagePreviewModal from "../../../components/ImagePreviewModal";
import { convertUtcToTimezone } from "../../../utils/dateTime";

const getShortTagText = (title = "") => {
  if (!title) return "";

  // trim + eliminar paréntesis y contenido
  const cleaned = title
    .trim()
    .replace(/\s*\(.*?\)\s*/g, "")
    .trim();

  const words = cleaned.split(/\s+/);

  if (words.length >= 2) {
    return `${words[0]} ${words[1]}`;
  }

  return words[0] || "";
};

const PhotoSection = ({ title, photos, tagTitle, timezone }) => {

  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleOpenPreview = (index) => {
    setPreviewIndex(index);
    setShowPreview(true);
  };

  const shortTag = getShortTagText(tagTitle);

  return (
    <div className="photo-section pt-1 mb-0">
      {title && <h6 className="mb-1 p-2 section-title">{title}</h6>}

      <div className="photo-scroll d-flex overflow-auto pb-2 gap-1">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="photo-card me-2 position-relative"
            style={{ flex: "0 0 auto" }}
            onClick={() => handleOpenPreview(index)}
          >
            {/* OVERLAY SUPERIOR (DATE + TAG) */}
            {(photo.date || shortTag) && (
              <div className="photo-overlay position-absolute top-0 start-0 d-flex flex-column">
                {photo.date && (
                  <div className="photo-date-top">
                    {convertUtcToTimezone(photo.date, timezone, "long")}
                  </div>
                )}

                {shortTag && (
                  <div className="photo-tag">
                    {shortTag}
                  </div>
                )}
              </div>
            )}

            <img
              src={photo.url}
              className="rounded-0"
              alt=""
              style={{
                width: "120px",
                height: "120px",
                objectFit: "cover",
                cursor: "pointer",
              }}
            />


          </div>
        ))}
      </div>

      <ImagePreviewModal
        show={showPreview}
        photos={photos}
        currentIndex={previewIndex}
        onClose={() => setShowPreview(false)}
        onChangeIndex={(idx) => setPreviewIndex(idx)}
        sectionTitle={title}
        showDates={true}
        
        showCategoryTag={true}
        categoryTagText={shortTag}
      />
    </div>
  );
};

export default PhotoSection;
