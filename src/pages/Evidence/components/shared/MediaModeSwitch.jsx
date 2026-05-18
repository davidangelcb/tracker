import React from "react";
import "./MediaModeSwitch.css";

import IconCamera from "../../../../assets/images/icon-camera2.svg";
import IconVideo from "../../../../assets/images/icon-video.svg";

export default function MediaModeSwitch({
  mode = "video",
  onChange,
  disabled = false,
}) {
  const isVideo = mode === "video";

  return (
    <div className="media-mode-switch-wrap">
      <div
        className={`media-pill ${isVideo ? "is-video" : "is-photos"} ${disabled ? "is-disabled" : ""}`}
        aria-disabled={disabled}
      >
        <div className="media-pill__active" />

        <button
          type="button"
          className={`media-pill__btn ${!isVideo ? "active" : ""}`}
          onClick={() => !disabled && onChange?.("photos")}
          aria-pressed={!isVideo}
          disabled={disabled}
        >
          {/*<img src={IconCamera} alt="Photos" />*/}
          <i className="bi bi-camera"></i>
        </button>

        <button
          type="button"
          className={`media-pill__btn ${isVideo ? "active" : ""}`}
          onClick={() => !disabled && onChange?.("video")}
          aria-pressed={isVideo}
          disabled={disabled}
        >
          {/*<img src={IconVideo} alt="Video" />*/}
          <i className="bi bi-camera-video"></i>
        </button>
      </div>
    </div>
  );
}