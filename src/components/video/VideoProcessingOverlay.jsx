import React from "react";
import Loader from "../../assets/images/loading2.gif";

export default function VideoProcessingOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(9, 16, 29, .65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "255px",
          background: "#fff",
          borderRadius: "5px",
          padding: "28px 22px 30px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        }}
      >
        <div className="mb-3 d-flex justify-content-center">
          <img
            src={Loader}
            alt="Processing..."
            style={{
              width: "auto",
              height: 100,
              objectFit: "contain",
            }}
          />
        </div>

        <h3
          style={{
            fontSize: "16px",
            lineHeight: "22px",
            fontWeight: 600,
            color: "#241D5D",
            marginBottom: "10px",
          }}
        >
          Job Completed
        </h3>

        <p
          style={{
            fontSize: "14px",
            fontWeight: "lighter",
            lineHeight: "18px",
            color: "#4F4F4F",
            margin: 0,
          }}
        >
          You’ve finished your part! We are currently processing the remaining frames and videos to generate your final summary. Please check back in a few minutes to view the completed report.
        </p>
      </div>
    </div>
  );
}