import React, { useState } from "react";
import { useGlobalStore } from "../../../store/useGlobalStore";
import { setNotiOffStartJob as apiSetNotiOffStartJob } from "../../../services/api"; 
import "./ShowWorkModal.css";

export default function ShowWorkModal() {
  const notiOffStoreValue = useGlobalStore((state) => state.notiOffStartJob);
  const setNotiOffStore = useGlobalStore((state) => state.setNotiOffStartJob);

  const [checked, setChecked] = useState(false);
  const [visible, setVisible] = useState(!notiOffStoreValue);

  const handleCloseX = () => {
    setVisible(false);
  };

  const handleOk = () => {
    const uuid = useGlobalStore.getState().uuid;

    if (checked) {
      setNotiOffStore(true);

      apiSetNotiOffStartJob(uuid)
        .then(() => {})
        .catch((err) => {
          console.error("Background error notiOffStartJob:", err);
        });
    }

    setVisible(false);
  };


  if (!visible) return null;

  return (
    <div className="welcome-backdrop d-flex justify-content-center align-items-center px-2">
      <div className="welcome-modal bg-white p-4 rounded-0 shadow position-relative">

        <button
          className="btn-close position-absolute top-0 end-0 m-3"
          onClick={handleCloseX}
        ></button>

        <div className="text-center mb-3 mt-3">
          <div
            className="mx-auto rounded-circle d-flex justify-content-center align-items-center"
            style={{
              width: 70,
              height: 70,
              backgroundColor: "#EDF7FF",
            }}
          >
            <i className="bi bi-camera-fill fs-1" style={{ color: "#0088FF" }}></i>
          </div>
        </div>

        <h4 className="text-center fw-bold mb-3 fs-6" style={{ color: "#2F2A56" }}>
          Show your great work!
        </h4>

        <p className="text-center text-secondary px-2 fs-14">
          Take <strong>before and after evidence</strong> of each space you clean - they help demonstrate the quality and effort you put into every job.
        </p>

        <p className="text-center fw-medium my-3 fs-14">Ready? Let’s begin!</p>

        <hr className="my-3" />

        <div className="d-flex justify-content-between align-items-center">
          <div className="form-check m-0 d-flex align-items-center gap-2">
            <input
              className="form-check-input m-0 rounded-0 custom-check"
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              id="dontShowCheckbox"
            />
            <label className="form-check-label dont-show" htmlFor="dontShowCheckbox">
              Don't show this again
            </label>
          </div>

          <button
            className={`btn btn-ok text-blue rounded-0 px-4 fw-600 ${
              !checked ? "btn-disabled" : ""
            }`}
            onClick={handleOk}
            disabled={!checked}
          >
            OK
          </button>
        </div>


      </div>
    </div>
  );
}
