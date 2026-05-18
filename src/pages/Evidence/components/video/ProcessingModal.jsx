import React from "react";
import { Modal, Button } from "react-bootstrap";
import Loading from "../../../../assets/images/loading2.gif";
import "./ProcessingModal.css";

export default function ProcessingModal({ show, onClose }) {
  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      contentClassName="m-4"
    >
      <div className="p-4 text-center">
        <div>
          <img src={Loading} alt="" style={{ height: 120 }} />
        </div>

        <h4 className="fw-600 text-primary fs-6 mt-4">Processing Video</h4>

        <p className="mt-3 mb-1 fs-14">
          We’re extracting key frames and identifying spaces and objects.
        </p>

        <p className="text-muted mb-4 mt-3 fs-14">
          No need to wait here. You can close this window and continue your work while we extract the frames for you.
        </p>

        <Button
          className="rounded-0 btn-custom py-2 px-5"
          style={{ backgroundColor: "#2D72FF", border: "none" }}
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </Modal>
  );
}