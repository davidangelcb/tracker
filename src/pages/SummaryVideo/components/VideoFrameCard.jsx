import React, { useMemo, useState } from "react";
import { convertUtcToTimezone } from "../../../utils/dateTime";

function clampPercent(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export default function VideoFrameCard({ frame, timezone }) {
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const overlayBox = useMemo(() => {
    const bbox = frame?.bbox || {};
    const naturalWidth = naturalSize.width;
    const naturalHeight = naturalSize.height;

    if (!naturalWidth || !naturalHeight) {
      return null;
    }

    const x1 = Number(bbox?.x1 ?? 0);
    const y1 = Number(bbox?.y1 ?? 0);
    const x2 = Number(bbox?.x2 ?? 0);
    const y2 = Number(bbox?.y2 ?? 0);

    const width = Math.max(0, x2 - x1);
    const height = Math.max(0, y2 - y1);

    return {
      left: clampPercent((x1 / naturalWidth) * 100),
      top: clampPercent((y1 / naturalHeight) * 100),
      width: clampPercent((width / naturalWidth) * 100),
      height: clampPercent((height / naturalHeight) * 100),
    };
  }, [frame?.bbox, naturalSize]);

  const labelText = frame?.className || "";

  return (
    <div className="video-frame-card position-relative">
      {frame?.date && (
        <div className="video-frame-date">
          {convertUtcToTimezone(frame.date, timezone, "long")}
        </div>
      )}

      <div className="video-frame-image-wrapper position-relative">
        <img
          src={frame?.url}
          alt=""
          className="video-frame-image"
          onLoad={(e) => {
            setNaturalSize({
              width: e.target.naturalWidth || 0,
              height: e.target.naturalHeight || 0,
            });
          }}
        />

        {overlayBox && (
          <>
            <div
              className="video-frame-bbox"
              style={{
                left: `${overlayBox.left}%`,
                top: `${overlayBox.top}%`,
                width: `${overlayBox.width}%`,
                height: `${overlayBox.height}%`,
              }}
            />

            {labelText && (
              <div
                className="video-frame-label"
                style={{
                  left: `${overlayBox.left}%`,
                  top:
                    overlayBox.top < 12
                      ? `calc(${overlayBox.top + overlayBox.height}% + 4px)`
                      : `calc(${overlayBox.top}% - 26px)`,
                }}
                title={labelText}
              >
                {labelText}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
