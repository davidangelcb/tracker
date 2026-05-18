import React, { useEffect, useState } from 'react';
import './OrientationOverlay.css';

const OrientationOverlay = () => {
  const [isLandscape, setIsLandscape] = useState(window.matchMedia("(orientation: landscape)").matches);

  useEffect(() => {
    const handleOrientationChange = (e) => {
      setIsLandscape(e.matches);
    };

    const mediaQuery = window.matchMedia("(orientation: landscape)");
    mediaQuery.addEventListener("change", handleOrientationChange);

    return () => mediaQuery.removeEventListener("change", handleOrientationChange);
  }, []);

  if (!isLandscape) return null;

  return (
    <div className="orientation-overlay">
      <div className="orientation-content">
        <i className="bi bi-phone fs-1 mb-2"></i>
        <p className="mb-0">
          Please rotate your device to <strong>portrait mode</strong> for the best experience.
        </p>
      </div>
    </div>
  );
};

export default OrientationOverlay;
