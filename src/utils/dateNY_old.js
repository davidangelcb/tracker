import { DateTime } from "luxon";

/**
 * Convierte una fecha ISO UTC a fecha/hora de Nueva York.
 * @param {string} isoDate - Ej: "2025-12-10T00:15:05.603Z"
 * @returns {string} - Ej: "12/09/2025 - 07:15 PM"
 */
export const convertUtcToNY = (isoDate) => {
  if (!isoDate) return "";

  return DateTime.fromISO(isoDate, { zone: "utc" })
    .setZone("America/New_York")
    .toFormat("MM/dd/yyyy - hh:mm a");
};
