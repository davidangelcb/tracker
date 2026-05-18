import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import IconShare from "../assets/images/icon-share.svg";
import IconWhatsApp from "../assets/images/icon-whatsapp.svg";
import IconSms from "../assets/images/icon-sms.svg";
import IconEmail from "../assets/images/icon-email.svg";
import "./ShareModal.css";

export default function ShareModal({ show, onClose, shareUrl }) {
  const fullUrl = window.location.href;

  const [copied, setCopied] = useState(false);

  // --- SMS ---
  const handleSMS = () => {
    navigator.clipboard.writeText(fullUrl);
    const message = encodeURIComponent(`Hi! Here is your Job Tracker link.\nPlease make sure to complete all required steps and upload your before and after photos:\n${fullUrl}`);
    const smsURL = `sms:?&body=${message}`;
    window.location.href = smsURL;
  };

  // --- WhatsApp ---
  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Hi! Here is your Job Tracker link.\nPlease make sure to complete all required steps and upload your before and after photos:\n${fullUrl}`);
    const waURL = `https://wa.me/?text=${message}`;
    window.open(waURL, "_blank");
  };

  // --- Email ---
  const handleEmail = () => {
    const subject = encodeURIComponent("Job Link");
    const body = encodeURIComponent(`Hi! Here is your Job Tracker link.\nPlease make sure to complete all required steps and upload your before and after photos:\n\n${fullUrl}`);
    const mailtoURL = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoURL;
  };

  // --- COPY BUTTON ---
  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);

    // vibración suave en móviles
    if (navigator.vibrate) navigator.vibrate(25);

    // estado visual
    setCopied(true);

    // revertir ícono
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      contentClassName="m-3"
    >
      <div className="share-modal-container p-4 text-center">

        <button className="share-close-btn" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>

        <img src={IconShare} alt="share" style={{ height: 49 }} className="mb-4 mt-4" />

        <p className="share-subtitle">
          Share this URL to allow other team members to complete the job.
        </p>

        <div className="share-social-row">

          {/* SMS */}
          <button className="share-social-btn sms" onClick={handleSMS}>
            <img src={IconSms} alt="sms" />
          </button>

          {/* WhatsApp */}
          <button className="share-social-btn whatsapp" onClick={handleWhatsApp}>
            <img src={IconWhatsApp} alt="whatsapp" />
          </button>

          {/* Email */}
          <button className="share-social-btn email" onClick={handleEmail}>
            <img src={IconEmail} alt="email" />
          </button>

        </div>

        {/* URL Box */}
        <div className="share-url-box rounded-0">
          <input
            type="text"
            className="share-url-input rounded-0 fs-16"
            value={fullUrl}
            readOnly
          />

          <button className="btn copy-btn" onClick={handleCopy}>
            {copied ? (
              <i className="bi bi-check-circle-fill fs-5" style={{ color: "#2F80ED" }}></i>
            ) : (
              <i className="bi bi-copy fs-5"></i>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
