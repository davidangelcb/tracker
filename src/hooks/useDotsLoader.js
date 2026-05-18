import { useState, useEffect } from "react";

export function useDotsLoader(interval = 400) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      setDots((prev) => (prev.length === 4 ? "" : prev + "."));
    }, interval);

    return () => clearInterval(id);
  }, [interval]);

  return dots;
}
