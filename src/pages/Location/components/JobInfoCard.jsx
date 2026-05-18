import React from "react";

export default function JobInfoCard() {
  return (
    <div className="bg-light p-3 rounded mt-3">
      <div className="mb-2">
        <strong>Riverhood Apartaments</strong>
        <p className="mb-0 text-secondary small">
          4902 N Mac Dill Ave, Tampa, FL. 33612
          <br /> Unit 202
        </p>
      </div>

      <div className="d-flex justify-content-between align-items-center small mb-3">
        <span className="badge bg-success-subtle text-success">
          <i className="bi bi-geo-alt-fill me-1"></i> Location Shared
        </span>
        <span className="text-muted">02:41 PM-06/04/2025 - Florida</span>
      </div>

      <p className="mb-1 fw-semibold">Cleaning Type</p>
      <p className="text-secondary">Turnover</p>

      <p className="mb-1 fw-semibold">Scheduled</p>
      <p className="text-secondary">Thursday, May 8th, 2025</p>

      <p className="mb-1 fw-semibold">Special Instructions</p>
      <p className="text-secondary small">
        To review the specifications, please check the job in your account.
      </p>
    </div>
  );
}
