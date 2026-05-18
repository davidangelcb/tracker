import React from "react";
import { Modal, Button } from "react-bootstrap";
import { useGlobalStore } from "../store/useGlobalStore";
import { VideoModal } from "./VideoModal";
import IconHelp from "../assets/images/icon-help.svg";
import IconLink from "../assets/images/icon-link.svg";
import "./ContactInfoModal.css";

export default function ContactInfoModal({ show, onClose }) {

  const initialConfig = useGlobalStore((state) => state.initialConfig);
  const videoUrl = initialConfig?.video_url;
  const hasVideo = Boolean(videoUrl && videoUrl.trim());

  const [showVideo, setShowVideo] = React.useState(false);

  return (
    <>
    <Modal show={show} onHide={onClose} centered backdrop="static"
    contentClassName="m-3 mx-5"
    >
      <div className="contact-modal-container p-4 text-center">

        <button className="close-btn" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>

        {/* Ícono */}
        <div>
          <img src={IconHelp} alt="" style={{ width: 35 }} />
        </div>

        {/* SOLO SI EXISTE VIDEO */}
          {hasVideo && (
            <>
              <h4 className="fs-16 fs-6 mt-4 fw-bold">
                How you complete<br />your job correctly
              </h4>

              <Button
                className="rounded-0 btn-custom fw-500 py-2 mt-4 mb-4 px-5 fs-16 d-flex align-items-center justify-content-center gap-2 mx-auto"
                onClick={(e) => {
                  e.preventDefault();
                  setShowVideo(true);
                }}
              >
                <img src={IconLink} alt="" style={{ width: 16 }} />
                <span>Watch Here</span>
              </Button>

              <hr />
            </>
          )}

        <h4 className="fs-16 fs-6 mt-4 fw-bold">PINCH Contact Info</h4>

        {/* Mensaje */}
        <div className="mt-3 mb-1 fs-14">
          <p className="pb-0 mb-0">Text Only: <span>843-983-1466</span></p>
          <p>Email: <span>Ops@pinchjob.com</span></p>
        </div>
        
      </div>
    </Modal>

    <VideoModal
        show={showVideo}
        onClose={() => setShowVideo(false)}
        videoUrl={videoUrl}
      />
    </>
  );
}
