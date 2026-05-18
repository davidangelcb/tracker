import React from "react";
import "./PermissionBlockedModal.css";
import IconGps from "../assets/images/icon-gps.svg";
import BrowserAddressBar from "../assets/images/browser-address-bar-iphone.svg";

export default function PermissionBlockedModal({ open, onClose, deviceType }) {
  if (!open) return null;

  // pasos dinámicos
  const steps =
    deviceType === "ios"
      ? [
          <>
            Tap the lock icon
            <br />
            <img src={BrowserAddressBar} alt="lock" style={{ height: 51 }} />
          </>,
          "Site Settings",
          "Location",
          "Allow",
        ]
      : [
          "Click the lock icon",
          "Permissions",
          "Location",
          "Allow",
        ];

  return (
    <div className="perm-backdrop d-flex justify-content-center align-items-center px-2">
      <div className="perm-modal bg-white p-4 rounded-0 shadow position-relative">

        <button
          className="btn-close position-absolute top-0 end-0 m-3"
          onClick={onClose}
        ></button>

        <div className="text-center mb-3 mt-4">
          <img src={IconGps} alt="lock" style={{ width: 22 }} />
        </div>

        <h5 className="text-center fw-bold mb-2">
          Location permission is blocked
        </h5>

        <p className="text-center text-secondary my-3 fw-600">
          Enable it manually
        </p>

        <ul className="mt-3 mb-4 text-secondary px-5" style={{ lineHeight: "1.6", listStyle: "none" }}>
          {steps.map((text, index) => (
            <li key={index} className="fw-100">
              <i className={`bi bi-${index + 1}-circle me-2 fs-5`}></i>
              {text}
            </li>
          ))}
        </ul>

        <button
          className="btn btn-custom btn-primary w-75 rounded-0 fw-semibold py-2 d-block mx-auto mt-5"
          onClick={onClose}
        >
          Close
        </button>

      </div>
    </div>
  );
}
