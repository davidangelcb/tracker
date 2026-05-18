import React, { useEffect, useMemo, useState } from "react";
import { Accordion } from "react-bootstrap";
import { useGlobalStore } from "../../../../store/useGlobalStore";
import {
  getStoreConfig,
  saveStoreConfig,
  getVideoBySection,
} from "../../../../services/db";
import {
  createLocalVideoEvidence,
  uploadVideoEvidence,
  retryUploadVideoEvidence,
  reprocessVideoEvidence,
  removeVideoEvidence,
  removeVideoFrameEvidence,
} from "../../../../services/apiVideo";
import "../shared/EvidenceTabs.css";
import "../AccordionSection.css";

import VideoRecordCard from "./VideoRecordCard";
import "./VideoRecordCard.css";
import VideoRecorderModal from "./VideoRecorderModal";
import VideoResultCard from "./VideoResultCard";
import "./VideoResultCard.css";
import VideoPreviewModal from "./VideoPreviewModal";

function sectionRequiresAfter(section) {
  return !(section?.min?.after == 0 && section?.max?.after == 0);
}

function isSectionVideoComplete(section, sectionState = {}) {
  const beforeItem = sectionState?.before || null;
  const afterItem = sectionState?.after || null;

  const hasBefore = !!beforeItem;
  const hasAfter = !!afterItem;

  if (!sectionRequiresAfter(section)) {
    return hasBefore;
  }

  return hasBefore && hasAfter;
}

function getSectionVideoCompletionState(section, sectionState = {}) {
  const beforeItem = sectionState?.before || null;
  const afterItem = sectionState?.after || null;

  const hasBefore = !!beforeItem;
  const hasAfter = !!afterItem;
  const hasAnyVideo = hasBefore || hasAfter;

  const done = isSectionVideoComplete(section, {
    before: beforeItem,
    after: afterItem,
  });

  const required = section?.required ?? false;

  const isPending = (required && !done) || (!required && hasAnyVideo && !done);

  return {
    hasBefore,
    hasAfter,
    hasAnyVideo,
    done,
    required,
    isPending,
  };
}

function normalizeVideoStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getEffectiveVideoStatus(item) {
  const remoteStatus = normalizeVideoStatus(
    item?.videoStatus || item?.remoteResponse?.videoStatus
  );

  if (remoteStatus) return remoteStatus;

  const localStatus = normalizeVideoStatus(item?.status);

  if (localStatus === "completed") return "completed";
  if (localStatus === "saving" || localStatus === "uploading") return "processing";
  if (localStatus === "uploaded") return "uploaded";
  if (localStatus === "failed" || localStatus === "error") return "failed";
  if (localStatus === "local") return "local";

  return localStatus;
}

function isAllowedVideoStatusForFinish(item) {
  if (!item) return true;

  const status = getEffectiveVideoStatus(item);

  return (
    status === "processing" ||
    status === "inprogress" ||
    status === "completed"
  );
}

function hasBlockingVideoIssue(item) {
  if (!item) return false;
  return !isAllowedVideoStatusForFinish(item);
}

function getSectionVideoIssueState(sectionState = {}) {
  const beforeItem = sectionState?.before || null;
  const afterItem = sectionState?.after || null;

  const beforeHasIssue = hasBlockingVideoIssue(beforeItem);
  const afterHasIssue = hasBlockingVideoIssue(afterItem);

  return {
    beforeHasIssue,
    afterHasIssue,
    hasIssue: beforeHasIssue || afterHasIssue,
  };
}

function computeVideoSummaryEnabled(
  sections = [],
  videoStates = {},
  backendActiveSummary = false
) {
  if (!Array.isArray(sections) || sections.length === 0) return false;

  const relevantSections = sections.filter((section) => {
    const completionState = getSectionVideoCompletionState(
      section,
      videoStates?.[section.id] || {}
    );

    return completionState.required || completionState.hasAnyVideo;
  });

  if (relevantSections.length === 0) return false;

  const allSectionsValid = relevantSections.every((section) => {
    const completionState = getSectionVideoCompletionState(
      section,
      videoStates?.[section.id] || {}
    );

    const issueState = getSectionVideoIssueState(
      videoStates?.[section.id] || {}
    );

    return completionState.done && !issueState.hasIssue;
  });

  // Si localmente hay aunque sea una persiana pendiente o con video inválido,
  // Finish Job debe quedar bloqueado siempre.
  if (!allSectionsValid) return false;

  // Si todo está válido localmente, habilitamos.
  // backendActiveSummary puede venir o no venir, pero no debe sobreescribir
  // una invalidez local.
  return true;
}

function extractFramesFromItem(item) {
  if (Array.isArray(item?.images)) return item.images;
  if (Array.isArray(item?.remoteResponse?.images)) return item.remoteResponse.images;
  return [];
}

function getTabConfigKey(sectionId) {
  return `last_active_tab_${sectionId}`;
}

export default function VideoEvidence({
  onVideoDoneStart,
  onVideoDoneEnd,
}) {
  const initialConfig = useGlobalStore((s) => s.initialConfig);
  const videosRevision = useGlobalStore((s) => s.videosRevision);
  const setVideoSummaryEnabled = useGlobalStore((s) => s.setVideoSummaryEnabled);

  const sections = initialConfig?.tags || [];

  const [activeKey, setActiveKey] = useState(null);
  const [activeTabs, setActiveTabs] = useState({});
  const [showRecorder, setShowRecorder] = useState(false);
  const [retakeContext, setRetakeContext] = useState(null);
  const [recorderContext, setRecorderContext] = useState(null);

  const [videoStates, setVideoStates] = useState({});
  const [hydratingVideos, setHydratingVideos] = useState(true);

  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const activeSection = useMemo(() => {
    if (activeKey === null || activeKey === undefined) return null;
    return sections[parseInt(activeKey)];
  }, [activeKey, sections]);

  const getSectionTab = (sectionId) => {
    return activeTabs?.[sectionId] || "before";
  };

  const setSectionTab = async (
    sectionId,
    nextTab,
    { persist = true, force = false } = {}
  ) => {
    const normalized = nextTab === "after" ? "after" : "before";
    const hasBefore = !!videoStates?.[sectionId]?.before;

    const safeTab =
      normalized === "after" && !force && !hasBefore ? "before" : normalized;

    setActiveTabs((prev) => ({
      ...prev,
      [sectionId]: safeTab,
    }));

    if (persist && sectionId) {
      await saveStoreConfig(getTabConfigKey(sectionId), safeTab);
    }
  };

  useEffect(() => {
    const loadLastAccordionAndTabs = async () => {
      const nextTabs = {};

      for (const section of sections) {
        const storedTab = await getStoreConfig(getTabConfigKey(section.id));
        nextTabs[section.id] = storedTab === "after" ? "after" : "before";
      }

      setActiveTabs(nextTabs);

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

    if (sections.length > 0) {
      loadLastAccordionAndTabs();
    } else {
      setActiveTabs({});
      setActiveKey(null);
    }
  }, [sections]);

  useEffect(() => {
    const hydrateVideos = async () => {
      setHydratingVideos(true);

      const next = {};

      for (const section of sections) {
        next[section.id] = {};

        const beforeItem = await getVideoBySection(section.id, "before");
        const afterItem = await getVideoBySection(section.id, "after");

        if (beforeItem) next[section.id].before = beforeItem;
        if (afterItem) next[section.id].after = afterItem;
      }

      setVideoStates(next);
      setHydratingVideos(false);
    };

    if (sections.length > 0) {
      hydrateVideos();
    } else {
      setVideoStates({});
      setHydratingVideos(false);
    }
  }, [sections, videosRevision]);

  useEffect(() => {
    const enabled = computeVideoSummaryEnabled(
      sections,
      videoStates,
      initialConfig?.activeSummary === true
    );

    setVideoSummaryEnabled(enabled);
  }, [sections, videoStates, initialConfig?.activeSummary, setVideoSummaryEnabled]);

  useEffect(() => {
    if (hydratingVideos || !sections.length) return;

    const sectionsToReset = sections.filter((section) => {
      const currentTab = getSectionTab(section.id);
      const hasBefore = !!videoStates?.[section.id]?.before;
      return currentTab === "after" && !hasBefore;
    });

    if (!sectionsToReset.length) return;

    setActiveTabs((prev) => {
      const next = { ...prev };
      sectionsToReset.forEach((section) => {
        next[section.id] = "before";
      });
      return next;
    });

    sectionsToReset.forEach((section) => {
      saveStoreConfig(getTabConfigKey(section.id), "before");
    });
  }, [hydratingVideos, sections, videoStates]);

  const handleSelect = async (eventKey) => {
    setActiveKey(eventKey);
    const section = sections[parseInt(eventKey)];
    if (section) {
      await saveStoreConfig("last_accordion_active_key", section.id);
    }
  };

  const handleTabClick = async (sectionId, nextTab) => {
    await setSectionTab(sectionId, nextTab);
  };

  const getVideoItem = (sectionId, currentTab) => {
    return videoStates?.[sectionId]?.[currentTab] || null;
  };

  const patchVideoState = (sectionId, currentTab, patch) => {
    setVideoStates((prev) => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        [currentTab]: {
          ...(prev?.[sectionId]?.[currentTab] || {}),
          ...patch,
        },
      },
    }));
  };

  const replaceVideoState = (sectionId, currentTab, nextItem) => {
    setVideoStates((prev) => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        [currentTab]: nextItem,
      },
    }));
  };

  const openNewRecorder = (sectionId, currentTab) => {
    setRetakeContext(null);
    setRecorderContext({
      sectionId,
      tab: currentTab,
    });
    setShowRecorder(true);
  };

  const openRetakeRecorder = (context) => {
    setRetakeContext(context || null);
    setRecorderContext({
      sectionId: context?.sectionId || null,
      tab: context?.tab || "before",
    });
    setShowRecorder(true);
  };

  const getSectionStatus = (section) => {
    const state = getSectionVideoCompletionState(
      section,
      videoStates?.[section.id] || {}
    );

    const issueState = getSectionVideoIssueState(
      videoStates?.[section.id] || {}
    );

    const isWarning = issueState.hasIssue || state.isPending;

    return {
      done: state.done && !issueState.hasIssue,
      required: state.required,
      hasAnyVideo: state.hasAnyVideo,
      isWarning,
      hasIssue: issueState.hasIssue,
    };
  };

  const handleVideoDone = async ({ sectionId, tab, blob, retakeContext }) => {
    let workingLocalId = null;

    onVideoDoneStart?.();

    try {
      if (retakeContext?.isRetake) {
        const currentVideoId =
          retakeContext?.item?.idVideo || retakeContext?.item?.videoID;

        await removeVideoEvidence({
          localVideoId: retakeContext?.item?.id,
          trackerId: useGlobalStore.getState().uuid,
          sectionId,
          tab,
          videoId: currentVideoId,
        });

        replaceVideoState(sectionId, tab, null);

        const reusedLocal = await createLocalVideoEvidence({
          sectionId,
          tab,
          blob,
        });

        workingLocalId = reusedLocal.id;
        patchVideoState(sectionId, tab, reusedLocal);

        if (tab === "before") {
          await setSectionTab(sectionId, "after", { force: true });
        }
      } else {
        const localItem = await createLocalVideoEvidence({
          sectionId,
          tab,
          blob,
        });

        workingLocalId = localItem.id;
        patchVideoState(sectionId, tab, localItem);

        if (tab === "before") {
          await setSectionTab(sectionId, "after", { force: true });
        }
      }

      await uploadVideoEvidence(workingLocalId, {
        sectionId,
        tab,
        onProgress: (percent) => {
          patchVideoState(sectionId, tab, {
            status: "uploading",
            uploadProgress: percent,
          });
        },
      });

      const fresh = await getVideoBySection(sectionId, tab);
      if (fresh) {
        replaceVideoState(sectionId, tab, fresh);
      }
    } catch (err) {
      console.error("handleVideoDone upload failed:", err);

      const fresh = await getVideoBySection(sectionId, tab);
      if (fresh) {
        replaceVideoState(sectionId, tab, fresh);
      }
    } finally {
      onVideoDoneEnd?.();
      setRetakeContext(null);
      setRecorderContext(null);
    }
  };

  const handleRetry = async (sectionId, currentTab) => {
    const item = getVideoItem(sectionId, currentTab);
    if (!item?.id) return;

    const normalizedVideoStatus = String(item?.videoStatus || "")
      .trim()
      .toLowerCase();

    patchVideoState(sectionId, currentTab, {
      status: "uploading",
      uploadProgress: 0,
      errorMessage: "",
    });

    try {
      if (
        normalizedVideoStatus === "serviceinterrupted" ||
        normalizedVideoStatus === "interrupted"
      ) {
        await reprocessVideoEvidence(item.id);
      } else {
        await retryUploadVideoEvidence(item.id, {
          onProgress: (percent) => {
            patchVideoState(sectionId, currentTab, {
              status: "uploading",
              uploadProgress: percent,
            });
          },
        });
      }

      const fresh = await getVideoBySection(sectionId, currentTab);
      if (fresh) {
        replaceVideoState(sectionId, currentTab, fresh);
      }
    } catch (err) {
      console.error("retry video failed:", err);

      const fresh = await getVideoBySection(sectionId, currentTab);
      if (fresh) {
        replaceVideoState(sectionId, currentTab, fresh);
      }
    }
  };

  const handleRetake = (sectionId, currentTab) => {
    const item = getVideoItem(sectionId, currentTab);
    if (!item) return;

    openRetakeRecorder({
      isRetake: true,
      item,
      sectionId,
      tab: currentTab,
    });
  };

  const handleRemoveFrames = async (sectionId, currentTab, framesToRemove = []) => {
    const item = getVideoItem(sectionId, currentTab);
    if (!item?.id || !Array.isArray(framesToRemove) || !framesToRemove.length) {
      return;
    }

    const currentFrames = extractFramesFromItem(item);

    if (currentFrames.length - framesToRemove.length < 1) {
      patchVideoState(sectionId, currentTab, {
        removeFrameError: "At least one frame must remain.",
      });
      return;
    }

    patchVideoState(sectionId, currentTab, {
      removeFrameError: "",
      removingFrameId: "batch-removing",
    });

    try {
      for (const frame of framesToRemove) {
        await removeVideoFrameEvidence({
          localVideoId: item.id,
          videoId: item.idVideo || item.videoID,
          frame,
        });
      }

      const fresh = await getVideoBySection(sectionId, currentTab);
      if (fresh) {
        replaceVideoState(sectionId, currentTab, {
          ...fresh,
          removingFrameId: null,
          removeFrameError: "",
        });
      }
    } catch (err) {
      console.error("remove frames failed:", err);

      const fresh = await getVideoBySection(sectionId, currentTab);
      if (fresh) {
        replaceVideoState(sectionId, currentTab, {
          ...fresh,
          removingFrameId: null,
        });
      } else {
        patchVideoState(sectionId, currentTab, {
          removingFrameId: null,
          removeFrameError:
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Could not remove selected frames.",
        });
      }
    }
  };

  const handleOpenPreview = (videoUrl) => {
    if (!videoUrl) return;
    setPreviewVideoUrl(videoUrl);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewVideoUrl(null);
  };

  const activeSectionTab = activeSection?.id ? getSectionTab(activeSection.id) : "before";

  return (
    <>
      <Accordion
        activeKey={activeKey}
        onSelect={handleSelect}
        alwaysOpen={false}
        className="mb-70"
      >
        {sections.map((s, i) => {
          const currentTab = getSectionTab(s.id);
          const currentItem = getVideoItem(s.id, currentTab);
          const sectionStatus = getSectionStatus(s);
          const hasBefore = !!videoStates?.[s.id]?.before;

          return (
            <Accordion.Item
              eventKey={i.toString()}
              key={s.id}
              className={sectionStatus.isWarning ? "accordion-warning" : ""}
            >
              <Accordion.Header>
                <div className="d-flex align-items-center justify-content-between w-100">
                  <span>{s.title}</span>

                  <div className="d-flex align-items-center">
                    {hydratingVideos ? (
                      <span
                        className="spinner-border spinner-border-sm text-secondary spinner-thin me-2"
                        role="status"
                      />
                    ) : sectionStatus.done ? (
                      <i className="bi bi-check-circle text-success me-2" />
                    ) : sectionStatus.isWarning ? (
                      <i className="bi bi-exclamation-circle text-warning me-2" />
                    ) : null}
                  </div>
                </div>
              </Accordion.Header>

              <Accordion.Body>
                <div className="photo-section">
                  <div className="d-flex mb-2 border-bottom tabs">
                    {["before", "after"].map((t) => {
                      const isAfterDisabled = t === "after" && !hasBefore;
                      const isActive = currentTab === t;

                      return (
                        <div
                          key={t}
                          onClick={() => {
                            if (isAfterDisabled) return;
                            handleTabClick(s.id, t);
                          }}
                          className={`
                            text-center flex-fill py-2 fw-semibold
                            ${isActive ? "active" : ""}
                            ${isAfterDisabled ? "disabled" : ""}
                          `}
                          style={{
                            cursor: isAfterDisabled ? "not-allowed" : "pointer",
                            opacity: isAfterDisabled ? 0.5 : 1,
                          }}
                          aria-disabled={isAfterDisabled}
                        >
                          {t === "before" ? "Before" : "After"}
                        </div>
                      );
                    })}
                  </div>

                  <div className="py-3">
                    {!currentItem ? (
                      <div className="d-flex align-items-start gap-2">
                        <VideoRecordCard
                          onClick={() => openNewRecorder(s.id, currentTab)}
                        />
                      </div>
                    ) : (
                      <div className="d-flex align-items-start gap-2">
                        <VideoResultCard
                          item={currentItem}
                          sectionTitle={s.title}
                          onRetry={() => handleRetry(s.id, currentTab)}
                          onRetake={() => handleRetake(s.id, currentTab)}
                          onOpenPreview={() => handleOpenPreview(currentItem.videoUrl)}
                          onRemoveFrames={(frames) =>
                            handleRemoveFrames(s.id, currentTab, frames)
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>

      <VideoRecorderModal
        show={showRecorder}
        onClose={() => {
          setShowRecorder(false);
          setRetakeContext(null);
          setRecorderContext(null);
        }}
        sectionId={recorderContext?.sectionId || activeSection?.id}
        tab={recorderContext?.tab || activeSectionTab}
        retakeContext={retakeContext}
        onDoneVideo={handleVideoDone}
      />

      <VideoPreviewModal
        show={showPreviewModal}
        videoUrl={previewVideoUrl}
        onClose={handleClosePreview}
      />
    </>
  );
}
