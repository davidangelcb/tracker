import React from "react";
import { Modal, Button } from "react-bootstrap";
import Loading from "../../assets/images/loading2.gif";
import IconRefresh from "../../assets/images/icon-refresh.svg";
import IconVideo from "../../assets/images/icon-video2.svg";
import "./VideoReviewModal.css";

export default function VideoReviewModal({ show, onClose }) {
  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      backdropClassName="video-review-backdrop"
      contentClassName="m-4"
    >
      <div className="p-4 text-center">
        <div>
          {/*<img src={Loading} alt="" style={{ height: 120 }} />*/}
          <i className="bi bi-search fs-2"></i>
        </div>

        <h4 className="fw-600 text-primary fs-6 mt-4">Review Required</h4>

        <p className="mt-3 mb-2 fs-14">
          Some videos couldn’t be processed successfully.
        </p>

        <div className="text-start text-muted fs-14 mb-4 mt-3">
          <p className="mb-2">
            Please review the affected sections and choose an action:
          </p>

          <ul className="mb-0 ps-3">
            <li className="mb-1">
              Tap <img src={IconRefresh} alt="" height="15px" /> <strong>Process video again</strong> to retry processing.
            </li>
            <li>
              Tap <img src={IconVideo} alt="" height="15px" /> <strong>Re-take video</strong> to record and upload a new video.
            </li>
          </ul>
        </div>

        <Button
          className="rounded-0 btn-custom py-2 px-5"
          style={{ backgroundColor: "#2D72FF", border: "none" }}
          onClick={onClose}
        >
          OK
        </Button>
      </div>
    </Modal>
  );
}