import React, { useState } from "react";
import { useGlobalStore } from "../store/useGlobalStore";
import { setNotiOff as apiSetNotiOff } from "../services/api"; 
import "./WelcomeModal.css";

export default function WelcomeModal() {
  const initialConfig = useGlobalStore((state) => state.initialConfig);
  const notiOffStoreValue = useGlobalStore((state) => state.notiOff);
  const setNotiOffStore = useGlobalStore((state) => state.setNotiOff);

  const [checked, setChecked] = useState(false);
  const [visible, setVisible] = useState(!notiOffStoreValue);

  const handleCloseX = () => {
    setVisible(false);
  };

  const handleOk = () => {
    const uuid = useGlobalStore.getState().uuid;

    if (checked) {
      setNotiOffStore(true);

      apiSetNotiOff(uuid)
        .then(() => {})
        .catch((err) => {
          console.error("Background notiOff error:", err);
        });
    }

    setVisible(false);
  };

  if (!visible || initialConfig.tab == 'evidence') return null;

  return (
    <div className="welcome-backdrop d-flex justify-content-center align-items-center px-2">
      <div className="welcome-modal bg-white p-4 rounded-0 shadow position-relative">

        <button
          className="btn-close position-absolute top-0 end-0 m-3"
          onClick={handleCloseX}
        ></button>

        <h4 className="text-center mb-3 fw-400 mt-4 fs-3">PINCH</h4>

        <h6 className="text-center fw-bold mb-3 pt-3">
          Welcome to PINCH Job Tracker!
        </h6>

        <p className="text-center mb-2">
          Submitting your photos is key to ensuring service quality and releasing your final payment.
        </p>

        <ol className="mt-4">
          <li>
            First, review the job details and <strong>share your location</strong> before starting.
          </li>
          <li>
            Then, click <strong>Start Job</strong> to begin.
          </li>
        </ol>

        <p className="text-center mt-4">
          We're glad to have you on board—let’s get the job done right!
        </p>

        <hr className="my-3" />

        <div className="d-flex justify-content-between align-items-center">

          <div className="form-check m-0 d-flex align-items-center gap-2">
            <input
              className="form-check-input m-0 rounded-0 custom-check"
              type="checkbox"
              id="dontShowCheckbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <label className="form-check-label dont-show" htmlFor="dontShowCheckbox">
              Don't show this again
            </label>
          </div>

          <button
            className={`btn btn-ok text-blue rounded-0 px-4 fw-600 ${!checked ? "btn-disabled" : ""}`}
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
