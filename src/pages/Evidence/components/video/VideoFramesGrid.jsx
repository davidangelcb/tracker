import React from "react";
import "./VideoFramesGrid.css";

function formatScore(score) {
  if (typeof score !== "number") return "";
  return score.toFixed(2);
}

export default function VideoFramesGrid({ frames = [] }) {
  if (!frames.length) return null;

  return (
    <div className="video-frames-grid">
      {frames.map((frame) => (
        <div key={frame.id} className="video-frame-card">
          <img
            src={frame.imageUrl}
            alt="Extracted frame"
            className="video-frame-image"
          />

          {(frame.tags || []).map((tag) => (
            <div
              key={tag.id}
              className="video-frame-box"
              style={{
                left: `${tag.x * 100}%`,
                top: `${tag.y * 100}%`,
                width: `${tag.w * 100}%`,
                height: `${tag.h * 100}%`,
              }}
            >
              <div className="video-frame-label">
                {tag.label} ({formatScore(tag.score)})
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}