import React, { useEffect, useState } from "react";
import { useGlobalStore } from "../../store/useGlobalStore";
import { useDotsLoader } from "../../hooks/useDotsLoader";
import { convertUtcToTimezone } from "../../utils/dateTime";
import PdfButton from "../Summary/components/PdfButton";
import InfoBox from "../Summary/components/InfoBox";
import VideoFrameSection from "./components/VideoFrameSection";
import { toApiGetVideosByCategory } from "../../services/apiVideo";
import "./SummaryVideoPage.css";

function normalizeImageItem(image = {}, fallbackDate = "") {
  return {
    id: image?._id || `${image?.s3_url || ""}-${image?.class_name || ""}`,
    url: image?.s3_url || "",
    date: fallbackDate || "",
    className: image?.class_name || "",
    bbox: {
      x1: Number(image?.bbox?.x1 ?? 0),
      y1: Number(image?.bbox?.y1 ?? 0),
      x2: Number(image?.bbox?.x2 ?? 0),
      y2: Number(image?.bbox?.y2 ?? 0),
    },
  };
}

export default function SummaryVideoPage() {
  const initialConfig = useGlobalStore((state) => state.initialConfig);
  const trackerId = useGlobalStore((state) => state.uuid);
  const jobStatus = useGlobalStore((state) => state.jobStatus);

  const [categoryStates, setCategoryStates] = useState({});

  const dots = useDotsLoader();
  const loadingDate = !initialConfig?.evidence?.date;
  const timezone = initialConfig?.timezone || "America/New_York";

  const isCompleted = jobStatus === "completed";
  const isNormalCompleted = isCompleted;
  const isCanceled = initialConfig?.statusTracker === "canceled";

  const getTitle = () => {
    if (isCanceled) {
      return "Job Canceled";
    }

    if (isNormalCompleted) {
      return "Job Completed";
    }

    return "Job Completed";
  };

  const renderDate = () => {
    if (isCanceled) {
      const canceledDate =
        initialConfig?.statusTrackerDate || initialConfig?.evidence?.date;

      return canceledDate
        ? convertUtcToTimezone(canceledDate, timezone, "long")
        : "";
    }

    return loadingDate
      ? `.${dots}`
      : convertUtcToTimezone(initialConfig?.evidence?.date, timezone, "long");
  };

  const hasRenderableFrames = Object.values(categoryStates).some(
    ({ tag, before, after, loading }) => {
      if (loading || !tag) return false;

      const hasBefore = Array.isArray(before) && before.length > 0;
      const hasAfter = Array.isArray(after) && after.length > 0;

      const isCase1 = tag?.min?.after == 0 && tag?.max?.after == 0;

      if (isCase1) return hasBefore;

      return hasBefore || hasAfter;
    }
  );

  useEffect(() => {
    if (!initialConfig?.tags || initialConfig.tags.length === 0) return;

    const initialBlocks = {};
    initialConfig.tags.forEach((tag) => {
      initialBlocks[tag.id] = {
        loading: true,
        before: [],
        after: [],
        tag,
      };
    });

    setCategoryStates(initialBlocks);

    initialConfig.tags.forEach(async (tag) => {
      const categoryId = tag.id;

      try {
        const apiRes = await toApiGetVideosByCategory(trackerId, categoryId);
        const videos = Array.isArray(apiRes?.videos) ? apiRes.videos : [];

        const before = videos
          .filter((video) => video?.tab === "before")
          .flatMap((video) => {
            const images = Array.isArray(video?.images) ? video.images : [];
            return images
              .map((img) => normalizeImageItem(img, video?.date || ""))
              .filter((item) => item.url);
          });

        const after = videos
          .filter((video) => video?.tab === "after")
          .flatMap((video) => {
            const images = Array.isArray(video?.images) ? video.images : [];
            return images
              .map((img) => normalizeImageItem(img, video?.date || ""))
              .filter((item) => item.url);
          });

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
        console.error("Error fetching videos by category", e);

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
  }, [initialConfig?.tags, trackerId]);

  const renderedDate = renderDate();

  return (
    <div className="p-3 pt-4">
      <div className="summary-video-top mb-3">
        <div className="summary-video-top-left pe-3">
          <h1 className="fw-600 mb-2 fs-16">{getTitle()}</h1>

          {renderedDate && (
            <div className="date-rage fs-14">
              <p className="mb-0">{renderedDate}</p>
            </div>
          )}
        </div>

        {/*
        <div className="summary-video-top-right ps-3">
          <div className="summary-video-score-title">Job Score</div>

          <div className="summary-video-score-value">
            <i className="bi bi-star-fill"></i>
            <span>4.3</span>
          </div>
        </div>
        */}
      </div>

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

      {hasRenderableFrames && (
        <div className="mb-4 mt-4">
          <PdfButton text="PDF Summary" />
        </div>
      )}

      {initialConfig?.tags?.length === 0 ? null : (
        <>
          {Object.values(categoryStates)
            .filter(({ tag, before, after, loading }) => {
              if (loading) return true;

              const hasBefore = Array.isArray(before) && before.length > 0;
              const hasAfter = Array.isArray(after) && after.length > 0;

              const isCase1 = tag?.min?.after == 0 && tag?.max?.after == 0;

              if (isCase1) return hasBefore;

              return hasBefore || hasAfter;
            })
            .map(({ tag, before, after, loading }) => {
              const isCase1 = tag?.min?.after == 0 && tag?.max?.after == 0;

              return (
                <div key={tag.id} className="mb-4">
                  <h5
                    className="fw-600 mb-2 px-2 py-2 fs-14 section-category-title"
                    style={{ backgroundColor: "#4F4F4F", color: "#FFF" }}
                  >
                    {tag.title}
                  </h5>

                  {loading && (
                    <div className="py-2">
                      {Array(isCase1 ? 1 : 2)
                        .fill(null)
                        .map((_, idx) => (
                          <div key={idx} className="placeholder-glow mb-3">
                            {!isCase1 && (
                              <div
                                className="placeholder col-6 mb-2"
                                style={{ height: "14px" }}
                              ></div>
                            )}

                            <div
                              className="placeholder col-8 w-100"
                              style={{ height: "180px" }}
                            ></div>
                          </div>
                        ))}
                    </div>
                  )}

                  {!loading && (
                    <>
                      {isCase1 && (
                        <VideoFrameSection
                          title=""
                          categoryTitle={tag.title}
                          frames={before}
                          timezone={timezone}
                        />
                      )}

                      {!isCase1 && (
                        <>
                          <VideoFrameSection
                            title="Before"
                            categoryTitle={tag.title}
                            frames={before}
                            timezone={timezone}
                          />

                          <VideoFrameSection
                            title="After"
                            categoryTitle={tag.title}
                            frames={after}
                            timezone={timezone}
                          />
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