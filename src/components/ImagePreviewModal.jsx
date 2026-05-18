import { Modal, Carousel } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import { useState } from 'react';
import { useGlobalStore } from "../store/useGlobalStore";
import { convertUtcToTimezone } from "../utils/dateTime";
import './ImagePreviewModal.css';

const ImagePreviewModal = ({
  show,
  photos = [],
  currentIndex = 0,
  onClose,
  onChangeIndex,
  sectionTitle,
  showDates = false,
  showDescription = false,

  // NUEVOS (opcionales)
  showCategoryTag = false,
  categoryTagText = "",
}) => {
  const [loadedImages, setLoadedImages] = useState({});
  const currentPhoto = photos[currentIndex] || {};

  const initialConfig = useGlobalStore((state) => state.initialConfig);

  const handleLoad = (idx) => {
    setLoadedImages((prev) => ({ ...prev, [idx]: true }));
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      size="lg"
      className="image-preview-modal"
      backdropClassName="custom-backdrop"
    >
      <Modal.Body className="p-0 position-relative">

        {/* Fotos con barrido */}
        <div className="image-container">
          {photos.length > 0 && (
            <Carousel
              activeIndex={currentIndex}
              onSelect={(selectedIndex) => onChangeIndex(selectedIndex)}
              interval={null}
              indicators={false}
              controls={photos.length > 1 ? true : false}
              nextLabel=""
              prevLabel=""
              touch={true}
            >
              {photos.map((p, idx) => (
                <Carousel.Item key={idx}>

                  {(showDates || (showCategoryTag && categoryTagText)) && loadedImages[idx] && (
                    <div className="preview-overlay position-absolute top-0 start-0 d-flex flex-column w-100">
                      {/* FECHA */}
                      {showDates && p.date && (
                        <div className="preview-date-top">
                          {convertUtcToTimezone(p.date, initialConfig.timezone, "long")}
                        </div>
                      )}

                      {/* TAG CATEGORÍA */}
                      {showCategoryTag && categoryTagText && (
                        <div className="preview-tag">
                          {categoryTagText}
                        </div>
                      )}

                    </div>
                  )}

                  <img
                    src={p.url}
                    alt={`preview-${idx}`}
                    className={`img-fluid transition-fade ${loadedImages[idx] ? 'loaded' : 'hidden'}`}
                    onLoad={() => handleLoad(idx)}
                  />
                </Carousel.Item>
              ))}
            </Carousel>
          )}

          <button className="close-overlay-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Sección de descripción opcional */}
        {showDescription && (
          <div className="image-description">
            <span className="image-title fs-6 fw-100">{sectionTitle || 'Image Title'}</span>
            <p className="image-text mt-2 rounded-0">
              {currentPhoto.description || 'This is a sample description.'}
            </p>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ImagePreviewModal;
