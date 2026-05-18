import { useEffect, useState } from "react";
import { useGlobalStore } from "../store/useGlobalStore";
import { getInitialConfig as apiGetInitialConfig } from "../services/api";
import { validateUuid } from "../utils/validateUuid";
import { initDB } from "../services/db";
import { getUuidFromUrl } from "../utils/getUuidFromUrl";
import { syncRemotePhotosFromConfig } from "../services/syncRemotePhotos";

import { startRemotePhotoDownloader } from "../services/remotePhotoDownloader";
import { dbEvents, DB_EVENTS } from "../services/dbEvents";
import { syncRemoteVideosFromConfig } from "../services/apiVideo";

export function useInitializer() {
  const setUuid = useGlobalStore((s) => s.setUuid);
  const setInitialConfig = useGlobalStore((s) => s.setInitialConfig);
  const setDbInitialized = useGlobalStore((s) => s.setDbInitialized);
  const setDbName = useGlobalStore((s) => s.setDbName);
  const setNotiOff = useGlobalStore((s) => s.setNotiOff);
  const setNotiOffStartJob = useGlobalStore((s) => s.setNotiOffStartJob);
  const setShowTooEarlyModal = useGlobalStore((s) => s.setShowTooEarlyModal);
  const setStartJobInfo = useGlobalStore((s) => s.setStartJobInfo);
  const setEvidenceCompleted = useGlobalStore((s) => s.setEvidenceCompleted);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const uuid = getUuidFromUrl();

    if (!validateUuid(uuid)) {
      setError(true);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setUuid(uuid);

        const initialConfig = await apiGetInitialConfig(uuid);

        if (initialConfig?.tab === "unable") {
          setShowTooEarlyModal(true);
          setInitialConfig(initialConfig);
          setLoading(false);
          return;
        }

        const dbName = "photosdb-" + uuid;

        await initDB(dbName);
        setDbName(dbName);
        setDbInitialized(true);

        setInitialConfig(initialConfig);

        // Rehidratar videos remotos desde initialConfig
        syncRemoteVideosFromConfig(initialConfig)
          .then(() => {
            useGlobalStore.getState().bumpVideosRevision();
          })
          .catch((err) => {
            console.error("Initial remote video sync failed:", err);
          });

        const shouldOpenSummaryOnInit = initialConfig?.jobStatus === "completed";
        const isVideoMode = initialConfig?.mode === "videos";

        useGlobalStore.setState({
          activeMenu: shouldOpenSummaryOnInit
            ? (isVideoMode ? "summary-video" : "summary")
            : initialConfig.tab,
        });

        // Inicializar loading/ready por sección
        useGlobalStore.getState().initSectionsLoadingState(initialConfig.tags);

        // Bloquear loader global solo hasta que existan placeholders
        useGlobalStore.getState().setInitialPhotosReady(false);

        // 1) placeholders en IndexedDB (si tu función ya los crea)
        syncRemotePhotosFromConfig(initialConfig).then(async () => {
          // Ya hay estructura: deja renderizar Evidence
          useGlobalStore.getState().setInitialPhotosReady(true);

          // avisar a UI si algo depende de esto
          dbEvents.postMessage({
            type: DB_EVENTS.PHOTO_ADDED,
            source: "initial-sync-complete",
          });

          // 2) descargar blobs reales por sección (y ocultar contenido hasta que listo)
          startRemotePhotoDownloader(initialConfig);
        });

        if (initialConfig?.jobStatus === "completed") {
          setEvidenceCompleted(true);
        }

        setNotiOff(!(initialConfig?.tab === "location" && initialConfig?.notiOff === false));

        if (initialConfig?.notiOffStartJob !== undefined) {
          setNotiOffStartJob(initialConfig.notiOffStartJob);
        }

        if (initialConfig?.startJobInfo !== undefined) {
          setStartJobInfo(initialConfig.startJobInfo);
        }
      } catch (err) {
        console.error("Initializer error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, error };
}

export async function runInitializerOnce() {
  const {
    setUuid,
    setInitialConfig,
    setDbInitialized,
    setDbName,
    setNotiOff,
    setNotiOffStartJob,
    setShowTooEarlyModal,
    setStartJobInfo,
    setEvidenceCompleted,
  } = useGlobalStore.getState();

  const uuid = getUuidFromUrl();

  if (!validateUuid(uuid)) {
    throw new Error("Invalid UUID");
  }

  setUuid(uuid);

  const initialConfig = await apiGetInitialConfig(uuid);

  if (initialConfig?.tab === "unable") {
    setShowTooEarlyModal(true);
    setInitialConfig(initialConfig);
    return;
  }

  const dbName = "photosdb-" + uuid;

  await initDB(dbName);
  setDbName(dbName);
  setDbInitialized(true);

  setInitialConfig(initialConfig);

  await syncRemoteVideosFromConfig(initialConfig);
  // useGlobalStore.getState().bumpPhotosRevision(); //verificar si esto ya existia para fotos
  useGlobalStore.getState().bumpVideosRevision();

  const shouldOpenSummaryOnInit = initialConfig?.jobStatus === "completed";
  const isVideoMode = initialConfig?.mode === "videos";

  useGlobalStore.setState({
    activeMenu: shouldOpenSummaryOnInit
      ? (isVideoMode ? "summary-video" : "summary")
      : initialConfig.tab,
  });

  // Inicializar loading/ready por sección
  useGlobalStore
    .getState()
    .initSectionsLoadingState(initialConfig.tags);

  // placeholders + sync
  useGlobalStore.getState().setInitialPhotosReady(false);

  await syncRemotePhotosFromConfig(initialConfig);

  useGlobalStore.getState().setInitialPhotosReady(true);

  startRemotePhotoDownloader(initialConfig);

  if (initialConfig?.jobStatus === "completed") {
    setEvidenceCompleted(true);
  }

  setNotiOff(
    !(initialConfig?.tab === "location" && initialConfig?.notiOff === false)
  );

  if (initialConfig?.notiOffStartJob !== undefined) {
    setNotiOffStartJob(initialConfig.notiOffStartJob);
  }

  if (initialConfig?.startJobInfo !== undefined) {
    setStartJobInfo(initialConfig.startJobInfo);
  }
}
