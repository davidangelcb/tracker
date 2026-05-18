import { useEffect, useState } from "react";
import { useGlobalStore } from "../store/useGlobalStore";

const getDeviceType = () => {
  const ua = navigator.userAgent;

  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";

  return null; // desktop
};

export default function useGeolocationPermission() {
  const {
    geoStatus,
    geoCoords,
    geoAddress,
    setGeoStatus,
    setGeoCoords,
    setGeoAddress,
  } = useGlobalStore();

  const initialConfig = useGlobalStore((state) => state.initialConfig);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const deviceType = getDeviceType();

  // -----------------------------
  // Leer permiso inicial al montar
  // -----------------------------
  useEffect(() => {
    if (initialConfig.tab === "evidence" || initialConfig.tab === "summary") return;
    
    if (!navigator.permissions) {
      setGeoStatus("prompt");
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        setGeoStatus(result.state);

        if (result.state === "granted") {
          captureCoords();
        }

        if (result.state === "denied") {
          setShowBlockedModal(true);
        }

        result.onchange = () => {
          setGeoStatus(result.state);

          if (result.state === "granted") captureCoords();
          if (result.state === "denied") setShowBlockedModal(true);
        };
      });
  }, []);

  // -----------------------------
  // Función para capturar coordenadas
  // -----------------------------
  const captureCoords = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setGeoCoords(coords);
      },
      (err) => {
        console.warn("Error reading geolocation", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  // -----------------------------
  // Si ya está granted, obtener ubicación automáticamente
  // -----------------------------
  useEffect(() => {
    if (geoStatus === "granted" && !geoCoords) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const normalized = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          setGeoCoords(normalized);
          reverseGeocode(normalized);
        },
        (err) => {
          console.error("Auto-location error:", err);
        }
      );
    }
  }, [geoStatus]);

  // -----------------------------
  // Solicitar permiso manualmente
  // -----------------------------
  const requestPermission = () => {
    captureCoords();

    const isMobile = deviceType === "android" || deviceType === "ios";

    if (!isMobile) {
      setGeoAddress("GPS only required for mobile devices");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const normalized = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setGeoStatus("granted");
        setGeoCoords(normalized);
        reverseGeocode(normalized);
      },

      (err) => {
        console.warn("Geolocation error:", err);

        // Cualquier error -> flujo manual
        setGeoStatus("denied");
        setShowBlockedModal(true);
      },
      { timeout: 8000 }
    );
  };

  // -----------------------------
  // Reverse Geocoding
  // -----------------------------
  const reverseGeocode = async ({ lat, lng }) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      setGeoAddress(data.display_name || "Unknown location");
    } catch (e) {
      console.error("Reverse geocode error:", e);
    }
  };

  return {
    status: geoStatus,
    coords: geoCoords,
    address: geoAddress,
    requestPermission,
    showBlockedModal,
    setShowBlockedModal,
    deviceType,
  };
}
