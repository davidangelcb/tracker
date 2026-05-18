// src/hooks/useDBListener.js
import { useEffect, useRef } from "react";
import { dbEvents } from "../services/dbEvents";

export default function useDBListener(callback) {
  const cbRef = useRef(callback);

  // mantener siempre el callback más reciente sin re-suscribir
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  // suscribirse SOLO una vez
  useEffect(() => {
    const handler = (event) => {
      cbRef.current?.(event.data);
    };

    dbEvents.addEventListener("message", handler);
    return () => dbEvents.removeEventListener("message", handler);
  }, []);
}
