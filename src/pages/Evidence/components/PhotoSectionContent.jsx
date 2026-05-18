import React, { useState, useEffect, useMemo } from "react";
import { Button } from "react-bootstrap";
import CameraModal from "./CameraModal";
import { addPhoto, getPhotosBySection, deletePhoto } from "../../../services/db";
import ImagePreviewModal from "../../../components/ImagePreviewModal";
import "./PhotoSectionContent.css";
import "./shared/EvidenceTabs.css";
import { useGlobalStore } from "../../../store/useGlobalStore";
import { getStoreConfig, saveStoreConfig } from "../../../services/db";

import { checkCameraPermission } from "../../../utils/cameraPermission";
import { detectOS } from "../../../utils/device";
import CameraPermissionHelpModal from "./CameraPermissionHelpModal";

function PhotoSectionContent({
  sectionKey,
  onStatusChange,
  min = { before: 0, after: 0 },
  max = { before: 5, after: 5 },
  isFirstSection = false,
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [tab, setTab] = useState("before");
  const [photos, setPhotos] = useState({ before: [], after: [] });
  const [preview, setPreview] = useState({ show: false, currentIndex: 0 });

  const setSyncingPhotos = useGlobalStore((s) => s.setSyncingPhotos);
  const photosRevision = useGlobalStore((s) => s.photosRevision);

  const showTabs = !(min.after === 0 && max.after === 0);

  // Loader por sección
  const sectionLoading = useGlobalStore((s) => s.sectionPhotoLoading?.[sectionKey]);
  const sectionReady = useGlobalStore((s) => s.sectionPhotosReady?.[sectionKey]);

  const isSectionBlocked = sectionLoading || !sectionReady;

  const isAfterBlocked =
    showTabs && photos.before.length === 0 && photos.after.length === 0;

  // Device OS
  const [showHelp, setShowHelp] = useState(false);
  const [deviceOS, setDeviceOS] = useState("other");

  const [cameraCooldown, setCameraCooldown] = useState(false);

  /* --------------------------------------------------
   * CORE: cargar fotos desde IndexedDB
   * -------------------------------------------------- */
  const loadPhotos = async () => {
    let before = await getPhotosBySection(sectionKey, "before");
    let after = await getPhotosBySection(sectionKey, "after");

    before = before.filter((p) => !p.deleted);
    after = after.filter((p) => !p.deleted);

    // setPhotos({ before, after });

    before = trimOverflow(before, max.before);
    after  = trimOverflow(after, max.after);

    setPhotos({ before, after });

    const done =
      before.length >= min.before && after.length >= min.after;
    
    const hasAnyPhoto = before.length > 0 || after.length > 0;
    
    onStatusChange({
      done,
      hasAnyPhoto,
    });
  };

  /* --------------------------------------------------
   * EFECTO ÚNICO DE SINCRONIZACIÓN (CLAVE)
   * -------------------------------------------------- */
  useEffect(() => {
    if (!isSectionBlocked) {
      loadPhotos();
    }
  }, [photosRevision, isSectionBlocked, sectionKey]);

  /* --------------------------------------------------
   * TABS
   * -------------------------------------------------- */
  useEffect(() => {
    if (isAfterBlocked && tab === "after") setTab("before");
  }, [isAfterBlocked, tab]);

  useEffect(() => {
    if (!showTabs) setTab("before");
  }, [showTabs]);

  useEffect(() => {
    const loadLastTab = async () => {
      const saved = await getStoreConfig(`last_active_tab_${sectionKey}`);

      if (saved && (saved === "before" || saved === "after")) {
        if (saved === "after" && isAfterBlocked) return;
        if (!showTabs && saved === "after") return;
        setTab(saved);
      }
    };

    if (!isSectionBlocked) loadLastTab();
  }, [sectionKey, showTabs, isAfterBlocked, isSectionBlocked]);

  //----
  useEffect(() => {
    const handler = () => {
      setShowCamera(false);
      setShowHelp(true);
    };

    window.addEventListener("camera-permission-denied", handler);
    return () =>
      window.removeEventListener("camera-permission-denied", handler);
  }, []);

  /* --------------------------------------------------
   * ACTIONS
   * -------------------------------------------------- */
  const handleCapture = async (newBlobs) => {
    for (const blob of newBlobs) {
      await addPhoto(sectionKey, blob, tab, true, "");
    }

    // AUTO: pasar a AFTER si corresponde
    if (showTabs && tab === "before") {
      setTab("after");
      await saveStoreConfig(`last_active_tab_${sectionKey}`, "after");
    }
  };

  const handleDelete = async (id) => {
    setCameraCooldown(true);

    await deletePhoto(id);
    setSyncingPhotos(true);

    // espera antes de habilitar nuevamente el botón
    setTimeout(() => {
      setCameraCooldown(false);
    }, 700);
  };

  /* --------------------------------------------------
   * PREVIEW
   * -------------------------------------------------- */
  const openPreview = (index) =>
    setPreview({ show: true, currentIndex: index });
  const closePreview = () =>
    setPreview({ show: false, currentIndex: 0 });

  const previewPhotos = useMemo(() => {
    return photos[tab].map((p) => ({
      url: p.url,
      description: p.description || "",
      date: p.date || "",
    }));
  }, [photos, tab]);

  /* --------------------------------------------------
   * LOADING STATE
   * -------------------------------------------------- */
  if (isSectionBlocked) {
    return (
      <div className="py-3 d-flex align-items-center gap-2 text-muted">
        <span>Loading...</span>
      </div>
    );
  }

  /* --------------------------------------------------
   * UI
   * -------------------------------------------------- */
  const TabSelector = () => {
    const availableTabs = ["before"];
    if (showTabs) availableTabs.push("after");

    return (
      <div className="d-flex mb-2 border-bottom tabs">
        {availableTabs.map((t) => {
          const blocked = t === "after" && isAfterBlocked;

          return (
            <div
              key={t}
              onClick={async () => {
                if (blocked) return;
                setTab(t);
                await saveStoreConfig(`last_active_tab_${sectionKey}`, t);
              }}
              className={`
                text-center flex-fill py-2 fw-semibold
                ${tab === t ? "active" : ""}
                ${blocked ? "text-muted" : ""}
              `}
              style={{
                cursor: blocked ? "not-allowed" : "pointer",
                opacity: blocked ? 0.5 : 1,
              }}
            >
              {t === "before" ? "Before" : "After"}
            </div>
          );
        })}
      </div>
    );
  };

  const CameraButton = () => {
    const shouldLockByPhoto =
      isFirstSection && photos[tab].length >= 1;

    const disabled = shouldLockByPhoto || cameraCooldown;

    const color = disabled ? "#C7C7CC" : "#0088FF";

    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center camera-card flex-shrink-0"
        style={{
          width: 70,
          height: 120,
          cursor: disabled ? "not-allowed" : "pointer",
          backgroundColor: disabled ? "#F5F5F5" : "#EDF7FF",
          border: `1px solid ${color}`,
          pointerEvents: disabled ? "none" : "auto",
          opacity: disabled ? 0.7 : 1,
        }}
        onClick={() => !disabled && handleOpenCamera()}
      >
        <i className="bi bi-camera fs-1" style={{ color }} />
      </div>
    );
  };

  const PhotoList = () => (
    <div className="d-flex gap-2 overflow-auto flex-grow-1 pb-2">
      {photos[tab].map((p, idx) => (
        <div key={p.id} className="position-relative">
          <img
            src={p.url}
            alt="photo"
            className="thumb-img"
            onClick={() => openPreview(idx)}
          />
          <Button
            variant="dark"
            size="sm"
            className="position-absolute top-0 end-0 mt-1 me-1 rounded-circle border-0"
            onClick={() => handleDelete(p.id)}
          >
            <i className="bi bi-x-lg text-white" />
          </Button>
        </div>
      ))}
    </div>
  );

  function trimOverflow(photos, max) {
    if (photos.length <= max) return photos;

    // prioridad: fotos ya aceptadas por backend
    const confirmed = photos.filter(p => !p.local);
    const localPending = photos.filter(p => p.local);

    const allowedLocal = Math.max(0, max - confirmed.length);

    return [
      ...confirmed,
      ...localPending.slice(0, allowedLocal),
    ];
  }

  const handleOpenCamera = async () => {
    const permission = await checkCameraPermission();
    const os = detectOS();
    setDeviceOS(os);

    if (permission === "granted" || permission === "prompt") {
      setShowCamera(true);
    } else {
      // denied
      setShowHelp(true);
    }
  };


  const cameraModalMaxPhotos = isFirstSection
    ? Math.max(0, 1 - photos[tab].length)
    : photos[tab].length < max[tab]
    ? max[tab] - photos[tab].length
    : 0;
    

  return (
    <div className="photo-section">
      {showTabs && <TabSelector />}

      <div className="d-flex align-items-start gap-2 py-2">
        <CameraButton />
        <PhotoList />
      </div>

      <CameraModal
        show={showCamera}
        onHide={() => setShowCamera(false)}
        onCapture={handleCapture}
        minPhotos={min[tab]}
        maxPhotos={cameraModalMaxPhotos}
      />

      <CameraPermissionHelpModal
        show={showHelp}
        os={deviceOS}
        onClose={() => setShowHelp(false)}
      />

      <ImagePreviewModal
        show={preview.show}
        photos={previewPhotos}
        currentIndex={preview.currentIndex}
        onClose={closePreview}
        onChangeIndex={(idx) =>
          setPreview({ ...preview, currentIndex: idx })
        }
        sectionTitle={null}
        showDates={false}
        showDescription={false}
      />
    </div>
  );
}

export default React.memo(PhotoSectionContent, (prev, next) => {
  if (prev.sectionKey !== next.sectionKey) return false;

  const sameMin =
    prev.min?.before === next.min?.before &&
    prev.min?.after === next.min?.after;

  const sameMax =
    prev.max?.before === next.max?.before &&
    prev.max?.after === next.max?.after;

  return sameMin && sameMax;
});
