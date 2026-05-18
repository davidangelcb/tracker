import React from "react";

const InfoBox = () => {
  return (
    <div className="info-box mt-4">
      <i className="bi bi-info-circle-fill"></i>
      <div className="text-secondary">
        <p className="mb-2">
          We successfully received your before and after photos. If you need to make any changes, please contact us
        </p>
        <p className="mb-0">
          <strong>Text Only:</strong> <a href="tel:8439831466" className="fw-semibold">843-983-1466</a><br />
          <strong>Email:</strong> <a href="mailto:Ops@pinchjob.com" className="fw-semibold">Ops@pinchjob.com</a>
        </p>
      </div>
    </div>
  );
};

export default InfoBox;
