import React from "react";
import "./CameraPermissionHelpModal.css";

import BrowserAddressBar from "../../../assets/images/browser-address-bar-iphone.svg";
import IconCameraBlocked from "../../../assets/images/icon-camera-blocked.svg";


export default function CameraPermissionHelpModal({
  show,
  onClose,
  os = "other",
}) {
  if (!show) return null;

  const steps =
    os === "ios"
      ? [
          <>
            Tap the lock icon
            <br />
            <img
              src={BrowserAddressBar}
              alt="lock"
              style={{ height: 51, marginTop: 6 }}
            />
          </>,
          "Camera",
          "Allow",
          "Reload this page",
        ]
      : [
          "Click the lock icon",
          "Permissions",
          "Camera",
          "Allow",
          "Reload the page",
        ];

  return (
    <div className="cam-perm-backdrop d-flex justify-content-center align-items-center px-2">
      <div className="cam-perm-modal bg-white p-4 rounded-0 shadow position-relative">

        {/* cerrar */}
        <button
          className="btn-close position-absolute top-0 end-0 m-3"
          onClick={onClose}
        ></button>

        {/* icon */}
        <div className="text-center mb-3 mt-4">
          <img src={IconCameraBlocked} alt="lock" style={{ width: 32 }} />
        </div>

        <h5 className="text-center fw-bold mb-2">
          Camera permission is blocked
        </h5>

        <p className="text-center text-secondary my-3 fw-600">
          Enable it manually
        </p>

        <ul
          className="mt-3 mb-4 text-secondary px-5"
          style={{ lineHeight: "1.6", listStyle: "none" }}
        >
          {steps.map((text, index) => (
            <li key={index} className="fw-100">
              <i className={`bi bi-${index + 1}-circle me-2 fs-5`}></i>
              {text}
            </li>
          ))}
        </ul>

      </div>
    </div>
  );
}
