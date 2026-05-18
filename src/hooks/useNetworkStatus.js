import { useState, useEffect } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      const alreadyReloaded = sessionStorage.getItem("auto_reload_done");

      if (!alreadyReloaded) {
        sessionStorage.setItem("auto_reload_done", "true");
        sessionStorage.setItem("from_auto_reload", "true");
        
        // Si queremos recargar después de reconectar auto a internet.
        // window.location.reload();
      }
    }
  }, [isOnline]);

  return isOnline;
}
