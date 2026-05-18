import React, { useState } from "react";
import { useInitializer } from "../hooks/useInitializer";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useGlobalStore } from "../store/useGlobalStore";
import Loader from "../assets/images/loading2.gif";
import IconInfo from "../assets/images/icon-info.svg";
import "./Initializer.css";

export default function Initializer({ children }) {
  const isOnline = useNetworkStatus();
  const { loading, error } = useInitializer();
  const showTooEarlyModal = useGlobalStore((s) => s.showTooEarlyModal);
  const initialConfig = useGlobalStore((s) => s.initialConfig);

  const [hideOfflineModal, setHideOfflineModal] = useState(false);
  // const fromAutoReload = sessionStorage.getItem("from_auto_reload");

  function formatDateTime(str) {
    if (!str) return "";
    const date = new Date(str);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const formattedDate = formatDateTime(initialConfig?.datetime);

  // VENTANA: No internet connection detected
  if (!isOnline && !hideOfflineModal) {
    return (
      <div
        className="offline-backdrop d-flex justify-content-center align-items-center px-2"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 99999,
        }}
      >
        <div
          className="modal-custom bg-white p-2 rounded-0 shadow text-center"
          style={{
            zIndex: 100001,
            position: "relative",
          }}
        >
          <button
            className="btn-close position-absolute"
            style={{
              top: "1rem",
              right: "1rem",
              zIndex: 200000,
            }}
            onClick={() => setHideOfflineModal(true)}
          ></button>

          <div className="p-4">
            <h4 className="mb-3 text-info">
              <img src={IconInfo} alt="info" style={{ width: 60 }} />
            </h4>

            <p className="text-orange fw-600 pt-2 pb-2">
              No internet connection detected
            </p>

            <p className="fs-14">Please check your connection and try again.</p>
          </div>
        </div>
      </div>
    );
  }

  /*
  if (fromAutoReload) {
    sessionStorage.removeItem("from_auto_reload");
    console.log("reconectando...");
    return (
      <div className="loader-wrapper">
        <img src={Loader} alt="Loading..." />
      </div>
    );
  }
  */

  // Todo ok
  if (loading) {
    return (
      <div className="loader-wrapper">
        <img src={Loader} alt="Loading..." />
      </div>
    );
  }

  // VENTANA: Invalid URL
  if (error) {
    return (
      <div className="modal-backdrop-custom d-flex justify-content-center align-items-center px-2">
        <div className="modal-custom bg-white p-5 rounded-0 shadow text-center">
          <h4 className="mb-3 text-info">
            <img src={IconInfo} alt="lock" style={{ width: 60 }} />
          </h4>

          <p className="text-orange fw-600 pt-2 pb-2">
            Invalid URL
          </p>

          <p>The link you're trying to access is not valid. Please check the URL and try again.</p>

          <button
            className="btn btn-custom btn-primary px-5 rounded-0 border-0 mt-4 fw-600"
            onClick={() => (window.location.href = "https://www.pinch.cleaning/")}
          >
            Close
          </button>
        </div>
      </div>
    );
  }
 
  // VENTANA: Unlock 24h before service
  if (showTooEarlyModal) {
    return (
      <div className="modal-backdrop-custom d-flex justify-content-center align-items-center px-2">
        <div className="modal-custom bg-white p-4 rounded-0 shadow text-center">
          <h4 className="mb-3 text-info">
            <img src={IconInfo} alt="lock" style={{ width: 60 }} />
          </h4>

          <p className="text-orange fw-600 pt-2 pb-2">
            Unable to Track This Job
          </p>

          <p>
            This cleaning is booked for <strong className="fw-600">{formattedDate}.</strong>
          </p>

          <p>The Job Tracker unlocks 24 hours before service—check back soon!</p>

          <button
            className="btn btn-custom btn-primary px-5 rounded-0 border-0 mt-4 fw-600"
            onClick={() => (window.location.href = "https://www.pinch.cleaning/")}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  sessionStorage.removeItem("auto_reload_done");
  
  return children;
}
