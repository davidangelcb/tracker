import React, { useState } from "react";
import axios from "axios";
import { useGlobalStore } from "../../../store/useGlobalStore";
import "./PdfButton.css";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:3000/"
  : "/";

const PdfButton = ({ text }) => {
  const uuid = useGlobalStore((state) => state.uuid);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!uuid || isLoading) return;

    setIsLoading(true); // Deshabilitar botón

    try {
      const requestUrl = `${API_BASE}api/job?action=pdf&uuid=${uuid}`;

      // Llamamos al puente (JSON)
      const { data } = await axios.get(requestUrl);

      if (!data?.pdfUrl) {
        alert("PDF not found");
        return;
      }

      const pdfUrl = data.pdfUrl;

      // Descargar PDF usando la URL directa
      const response = await axios.get(pdfUrl, {
        responseType: "blob"
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const fileUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `summary_${uuid}.pdf`;
      link.click();

      window.URL.revokeObjectURL(fileUrl);

    } catch (error) {
      console.error("PDF download error:", error);
      alert("Error downloading the PDF");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className="pdf-btn d-inline-flex justify-content-center align-items-center w-100 rounded-0"
      onClick={handleDownload}
      disabled={isLoading}
      style={{
        opacity: isLoading ? 0.6 : 1,
        pointerEvents: isLoading ? "none" : "auto"
      }}
    >
      {isLoading ? (
        <>
          <i className="bi bi-hourglass-split me-2 spin"></i> Generating...
        </>
      ) : (
        <>
          <i className="bi bi-download me-2"></i> {text}
        </>
      )}
    </button>
  );
};

export default PdfButton;
