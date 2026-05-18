import React from "react";
import { Modal, Button } from "react-bootstrap";
import "./RemoveFrameConfirmModal.css";

export default function RemoveFrameConfirmModal({
  show,
  onClose,
  onConfirm,
  isRemoving = false,
}) {
  return (
    <Modal
      show={show}
      onHide={isRemoving ? undefined : onClose}
      centered
      backdrop="static"
      keyboard={!isRemoving}
      contentClassName="m-4 mx-4"
    >
      <div className="remove-frame-modal-body text-center">
        <div className="remove-frame-modal-icon-wrap">
          <i className="bi bi-trash remove-frame-modal-icon" />
        </div>

        <h4 className="remove-frame-modal-title fs-16 fw-semibold">Remove frame?</h4>

        <p className="remove-frame-modal-text">
          This image was generated from the video.
          <br />
          Removing it will not affect the
          <br />
          original video.
        </p>

        <div className="remove-frame-modal-actions">
          <Button
            type="button"
            onClick={onClose}
            disabled={isRemoving}
            className="remove-frame-btn-cancel"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isRemoving}
            className="remove-frame-btn-confirm"
          >
            {isRemoving ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Removing
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}