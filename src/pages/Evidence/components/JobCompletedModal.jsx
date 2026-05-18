import React from "react";
import { Modal, Button } from "react-bootstrap";
import { useGlobalStore } from "../../../store/useGlobalStore";
import CheckCircle from "../../../assets/images/icon-info4.svg";

export default function JobCompletedModal({ show, onClose }) {
  const initialConfig = useGlobalStore((state) => state.initialConfig);

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static"
    contentClassName="m-3"
    >
      <div className="p-4 text-center">

        {/* Ícono */}
        <div>
          <img src={CheckCircle} alt="" style={{ width: 60 }} />
        </div>

        {/* Título */}
        <h4 className="fw-600 text-primary fs-6 mt-4">Job Completed!</h4>

        {/* Mensaje */}
        <p className="mt-3 mb-1 fs-14">
          Thank you for completing the cleaning<br />
          service at <strong>{initialConfig?.propertyName}</strong>
          <br />
          {initialConfig?.unit && (
            <strong>Unit {initialConfig.unit}</strong>
          )}
        </p>

        <p className="text-muted mb-4 mt-3 fs-14">
          Before and after photos have been submitted.<br />
          No further action is needed.
        </p>

        {/* Botón */}
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
