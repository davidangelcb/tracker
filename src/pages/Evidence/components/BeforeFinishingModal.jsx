import React from "react";
import { Modal, Button } from "react-bootstrap";
import IconBeforeFinishing from "../../../assets/images/icon-before-finishing.svg";
import "./BeforeFinishingModal.css";

export default function BeforeFinishingModal({ show, onFinishJob, onClose }) {

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      contentClassName="m-3"
    >
      <div className="p-4 text-center">

        <div>
          <img src={IconBeforeFinishing} alt="" style={{ width: 60 }} />
        </div>

        <h4 className="fw-600 text-primary fs-16 mt-4">
          Before finishing, please make sure your photos
        </h4>

        <ul className="list-unstyled mt-4 mb-4 text-start mx-auto list">
          <li className="d-flex align-items-center mb-2">
            <i className="bi bi-check-circle-fill me-1 bg-blue fs-12"></i>
            <span className="fs-14">Show the same area</span>
          </li>

          <li className="d-flex align-items-center mb-2">
            <i className="bi bi-check-circle-fill me-1 bg-blue fs-12"></i>
            <span className="fs-14">Look clear</span>
          </li>

          <li className="d-flex align-items-center">
            <i className="bi bi-check-circle-fill me-1 bg-blue fs-12"></i>
            <span className="fs-14">Belong to this job only</span>
          </li>
        </ul>

        <Button
          className="rounded-0 btn-custom py-2 w-75 fw-600"
          style={{ backgroundColor: "#2D72FF", border: "none" }}
          onClick={onFinishJob}
        >
          Yes, finish job
        </Button>

        <Button
          className="rounded-0 btn-custom btn-go-back py-2 w-75 fw-600 mt-2"
          onClick={onClose}
        >
          Go back and review
        </Button>

      </div>
    </Modal>
  );
}
