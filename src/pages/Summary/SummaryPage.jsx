// src/pages/Summary/SummaryPage.jsx
import React, { useEffect, useState } from "react";
import PhotoSection from "./components/PhotoSection";
import InfoBox from "./components/InfoBox";
import PdfButton from "./components/PdfButton";
import { useGlobalStore } from "../../store/useGlobalStore";
import { toApiGetPhotosByCategory } from "../../services/api";
// import { adaptPhotoForRender } from "../../services/photoRenderAdapter";
import { useDotsLoader } from "../../hooks/useDotsLoader";
import { convertUtcToTimezone } from "../../utils/dateTime";
import "./SummaryPage.css";

export default function SummaryPage() {
  const initialConfig = useGlobalStore((state) => state.initialConfig);
  const cachedPhotos = useGlobalStore((state) => state.cachedPhotosByCategory);
  const setCachedPhotos = useGlobalStore((state) => state.setCachedPhotos);

  const trackerId = useGlobalStore((state) => state.uuid);

  // Estado por categoría con loaders independientes
  const [categoryStates, setCategoryStates] = useState({});

  const dots = useDotsLoader();
  const loadingDate = !initialConfig?.evidence?.date;

  const timezone = initialConfig?.timezone || "America/New_York";

  const jobStatus = useGlobalStore((state) => state.jobStatus);

  const isCompleted = jobStatus === "completed";
  const isNormalCompleted =
    isCompleted && initialConfig?.tab === "summary";
  const isManualCompleted =
    isCompleted && initialConfig?.tab !== "summary";
  const isCanceled = initialConfig?.statusTracker === "canceled";

  const getTitle = () => {
    if (isManualCompleted) {
      return "This job was completed manually by PINCH operators.";
    }

    if (isCanceled) {
      return "Job Canceled";
    }

    if (isNormalCompleted) {
      return "Job Completed";
    }

    return "Job Completed";
  };

  const isSpecialStatus = isManualCompleted || isCanceled;

  const renderDate = () => {
    if (isManualCompleted) {
      const manualDate =
        initialConfig?.statusTrackerDate ||
        initialConfig?.evidence?.date;

      return manualDate
        ? convertUtcToTimezone(manualDate, timezone, "long")
        : "";
    }

    if (isCanceled) {
      const canceledDate =
        initialConfig?.statusTrackerDate ||
        initialConfig?.evidence?.date;

      return canceledDate
        ? convertUtcToTimezone(canceledDate, timezone, "long")
        : "";
    }

    return loadingDate
      ? `.${dots}`
      : convertUtcToTimezone(initialConfig?.evidence?.date, timezone, "long");
  };

  const hasRenderablePhotos = Object.values(categoryStates).some(
    ({ tag, before, after, loading }) => {
      if (loading || !tag) return false;

      const hasBefore = Array.isArray(before) && before.length > 0;
      const hasAfter = Array.isArray(after) && after.length > 0;

      const isCase1 = tag.min.after == 0 && tag.max.after == 0;

      // Si es case1, solo importa before
      if (isCase1) return hasBefore;

      // Caso general: necesita al menos una foto en before o after
      return hasBefore || hasAfter;
    }
  );
  
  useEffect(() => {
    if (!initialConfig?.tags || initialConfig.tags.length === 0) return;

    // Inicializar loaders por categoría
    const initialBlocks = {};
    initialConfig.tags.forEach((tag) => {
      initialBlocks[tag.id] = {
        loading: !isSpecialStatus,
        before: [],
        after: [],
        tag: tag,
      };
    });

    setCategoryStates(initialBlocks);

    // Llamanos al API por categoría
    initialConfig.tags.forEach(async (tag) => {
      const categoryId = tag.id;

      // Cache
      if (cachedPhotos[categoryId]) {
        setCategoryStates((prev) => ({
          ...prev,
          [categoryId]: {
            loading: false,
            tag,
            before: cachedPhotos[categoryId].before,
            after: cachedPhotos[categoryId].after,
          },
        }));
        return;
      }

      // API
      try {
        const apiRes = await toApiGetPhotosByCategory(trackerId, categoryId);
        const photos = apiRes.photos || [];

        const before = photos
          .filter((p) => p.tab === "before")
          .map((photo) => ({
            url: photo.downloadUrl,
            date: photo.date || "", // ISO CRUDO
            description: photo.comment || "",
          }));

        const after = photos
          .filter((p) => p.tab === "after")
          .map((photo) => ({
            url: photo.downloadUrl,
            date: photo.date || "", // ISO CRUDO
            description: photo.comment || "",
          }));

        setCachedPhotos(categoryId, { before, after });

        setCategoryStates((prev) => ({
          ...prev,
          [categoryId]: {
            loading: false,
            tag,
            before,
            after,
          },
        }));
      } catch (e) {
        console.error("Error fetching photos", e);

        setCategoryStates((prev) => ({
          ...prev,
          [categoryId]: {
            loading: false,
            tag,
            before: [],
            after: [],
            error: true,
          },
        }));
      }
    });
  }, []);

  const renderedDate = renderDate();

  return (
    <div className="p-3 pt-4">
      <h1 className="fw-600 mb-2 fs-16">{getTitle()}</h1>

      {renderedDate && (
        <div className="date-rage mb-3 fs-14">
          <p className="mb-1">{renderedDate}</p>
        </div>
      )}

      {/* Info adicional solo si el job está cancelado */}
      {isCanceled && (
        <div className="mb-3 contact-info">
          <p className="fw-normal">If you need support, please contact us</p>

          <p className="pb-0 mb-0 fs-14">
            Text Only: <span>843-983-1466</span>
          </p>

          <p className="fs-14 mb-0">
            Email: <span>Ops@pinchjob.com</span>
          </p>
        </div>
      )}

      <hr />

      {/* Mostrar PDF solo si hay al menos una foto renderizable */}
      {hasRenderablePhotos && (
        <div className="mb-3">
          <PdfButton text="PDF Summary" />
        </div>
      )}

      {/* Render dinámico por categoría */}
      {/* Si no hay tags, no renderizamos fotos */}
      {initialConfig?.tags?.length === 0 ? null : (
        <>
          {Object.values(categoryStates)
            .filter(({ tag, before, after, loading }) => {
              // mostrar loaders igual
              if (loading) return true;

              const hasBefore = Array.isArray(before) && before.length > 0;
              const hasAfter = Array.isArray(after) && after.length > 0;

              const isCase1 = tag.min.after == 0 && tag.max.after == 0;

              // Si es case1, solo importa before
              if (isCase1) return hasBefore;

              // Caso general: necesita al menos una foto en before o after
              return hasBefore || hasAfter;
            })
            .map(({ tag, before, after, loading }) => {
              const isCase1 = tag.min.after == 0 && tag.max.after == 0;

              return (
                <div key={tag.id} className="mb-2">
                  {/* Mostramos el título */}
                  <h5
                    className="fw-600 mb-2 px-2 py-2 fs-14 section-category-title"
                    style={{ backgroundColor: "#4F4F4F", color: "#FFF" }}
                  >
                    {tag.title}
                  </h5>

                  {/* Loader */}
                  {loading && (
                    <div className="py-2">
                      {Array(isCase1 ? 1 : 2)
                        .fill(null)
                        .map((_, idx) => (
                          <div key={idx} className="placeholder-glow mb-3">
                            {/* Para caso 1 no se muestra el placeholder del título */}
                            {!isCase1 && (
                              <div
                                className="placeholder col-6 mb-2"
                                style={{ height: "14px" }}
                              ></div>
                            )}

                            <div
                              className="placeholder col-8 w-100"
                              style={{ height: "120px" }}
                            ></div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Contenido real */}
                  {!loading && (
                    <>
                      {isCase1 && (
                        <PhotoSection title="" photos={before} tagTitle={tag.title} timezone={timezone} />
                      )}

                      {!isCase1 && (
                        <>
                          <PhotoSection title="Before" photos={before} tagTitle={tag.title} timezone={timezone} />
                          <PhotoSection title="After" photos={after} tagTitle={tag.title} timezone={timezone} />
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
        </>
      )}

      <InfoBox />
    </div>
  );
}