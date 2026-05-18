import React from "react";
import IconVideo from "../../../../assets/images/icon-video2.svg";

export default function VideoRecordCard({ onClick }) {
  return (
    <div
      className="video-record-card"
      onClick={onClick}
    >
      <img src={IconVideo} alt="Record video" className="video-record-icon" />

      <span className="video-record-text">
        Record Video
      </span>
    </div>
  );
}