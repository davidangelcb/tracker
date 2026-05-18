// src/pages/Evidence/components/AccordionSection.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Accordion } from "react-bootstrap";
import PhotoSectionContent from "./PhotoSectionContent";
import { useGlobalStore } from "../../../store/useGlobalStore";
import { getStoreConfig, saveStoreConfig } from "../../../services/db";
import "./AccordionSection.css";

export default function AccordionSection() {
  const { initialConfig, setAllSectionsComplete } = useGlobalStore();
  const sections = initialConfig?.tags || [];

  const [status, setStatus] = useState({});
  const [activeKey, setActiveKey] = useState(null);

  // Estados globales de loading por sección
  const sectionPhotoLoading = useGlobalStore((s) => s.sectionPhotoLoading || {});
  const sectionPhotosReady = useGlobalStore((s) => s.sectionPhotosReady || {});

  const isSectionLoading = (sectionId) =>
    sectionPhotoLoading?.[sectionId] === true || sectionPhotosReady?.[sectionId] !== true;

  // LEER ULTIMO ACORDEÓN USADO AL INICIAR
  useEffect(() => {
    const loadLastAccordion = async () => {
      const lastKey = await getStoreConfig("last_accordion_active_key");

      if (lastKey) {
        const idx = sections.findIndex((s) => s.id === lastKey);
        if (idx !== -1) {
          setActiveKey(idx.toString());
          return;
        }
      }

      if (sections.length > 0) {
        setActiveKey("0");
        await saveStoreConfig("last_accordion_active_key", sections[0].id);
      }
    };

    if (sections.length > 0) loadLastAccordion();
  }, [sections]);

  // GUARDAR CUANDO CAMBIA LA PERSIANA ABIERTA
  const handleSelect = async (eventKey) => {
    setActiveKey(eventKey);

    const section = sections[parseInt(eventKey)];
    if (section) {
      await saveStoreConfig("last_accordion_active_key", section.id);
    }
  };

  // Inicializar status SIN asumir "done" por initialConfig (evita checks falsos mientras carga)
  useEffect(() => {
    if (!sections.length) return;

    const initialStatus = {};
    sections.forEach((s) => {
      initialStatus[s.id] = {
        done: false, // se setea luego por reglas min/max desde PhotoSectionContent
        required: s.required ?? false,
      };
    });

    setStatus(initialStatus);
  }, [sections]);

  // validar si todas las secciones están completas:
  // - requerida e incompleta → bloquea
  // - opcional, iniciada parcialmente → bloquea
  // - opcional, no iniciada → NO bloquea
  useEffect(() => {
    if (!sections.length || !Object.keys(status).length) return;

    const isSectionBlocking = (s) => {
      // Caso 1: requerida e incompleta → bloquea
      if (s.required === true && s.done === false) {
        return true;
      }

      // Caso 2: opcional, iniciada parcialmente → bloquea
      if (
        s.required === false &&
        s.done === false &&
        s.hasAnyPhoto === true
      ) {
        return true;
      }

      return false;
    };

    const hasBlockingSection = Object.values(status).some(isSectionBlocking);

    setAllSectionsComplete(!hasBlockingSection);
  }, [status, sections.length, setAllSectionsComplete]);


  const handleStatusChange = (sectionId, payload) => {
    setStatus((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        done: payload.done,
        hasAnyPhoto: payload.hasAnyPhoto,
      },
    }));
  };

  return (
    <Accordion activeKey={activeKey} onSelect={handleSelect} alwaysOpen={false} className="mb-5">
      {sections.map((s, i) => {
        const loading = isSectionLoading(s.id);

        const st = status[s.id];

        const isWarning =
          !loading &&
          (
            // Caso 1: requerida y no completada (como antes)
            (st?.required === true && st?.done === false) ||

            // Caso 2: opcional, NO completada, pero con fotos parciales
            (
              st?.required === false &&
              st?.done === false &&
              st?.hasAnyPhoto === true
            )
          );


        return (
          <Accordion.Item 
          eventKey={i.toString()} 
          key={s.id}
          className={isWarning ? "accordion-warning" : ""}
          >
            <Accordion.Header>
              <div className="d-flex align-items-center justify-content-between w-100">
                <span>{s.title}</span>

                {/* --- ICONOS --- */}
                <div className="d-flex align-items-center">
                  {/* 1) Loading por sección -> spinner (NO check / NO warning) */}
                  {loading ? (
                    <span className="spinner-border spinner-border-sm text-secondary spinner-thin me-2" role="status" />
                  ) : (
                    <>
                      {/* 2) Ya listo -> lógica normal */}
                      {status[s.id] && (
                        <>
                          {status[s.id].done ? (
                            <i className="bi bi-check-circle text-success me-2" />
                          ) : isWarning ? (
                            <i className="bi bi-exclamation-circle text-warning me-2" />
                          ) : null}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Accordion.Header>

            <Accordion.Body>
              <PhotoSectionContent
                sectionKey={s.id}
                onStatusChange={(done) => handleStatusChange(s.id, done)}
                min={s.min}
                max={s.max}
                isFirstSection={i === 0}
              />
            </Accordion.Body>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
