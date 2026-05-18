import { DateTime } from "luxon";

const DEFAULT_TIMEZONE = "America/New_York";

const FORMATS = {
  default: "MM/dd/yyyy - hh:mm a",
  long: "MMM dd, yyyy, hh:mm a",
};

/**
 * Abreviaturas US-only (UI)
 * Esta tabla NO define zonas, solo etiquetas
 */
const US_TZ_ABBR_BY_OFFSET = {
  "America/New_York": { "-300": "EST", "-240": "EDT" },
  "America/Chicago": { "-360": "CST", "-300": "CDT" },
  "America/Denver": { "-420": "MST", "-360": "MDT" },
  "America/Los_Angeles": { "-480": "PST", "-420": "PDT" },
  "America/Phoenix": { "-420": "MST" }, // sin DST
  "America/Anchorage": { "-540": "AKST", "-480": "AKDT" },
  "Pacific/Honolulu": { "-600": "HST" }, // sin DST
};

/**
 * Normaliza timezones incorrectos o no estándar
 * (Estados, aliases, errores de backend)
 */
function normalizeTimezone(input) {
  if (!input) return DEFAULT_TIMEZONE;

  const key = String(input).toLowerCase().trim();

  // Ya es IANA válido (y no es alias conocido)
  if (key.includes("/") && !INVALID_TZ_ALIASES[key]) {
    return input;
  }

  return INVALID_TZ_ALIASES[key] || DEFAULT_TIMEZONE;
}

/**
 * Aliases inválidos → IANA real
 */
const INVALID_TZ_ALIASES = {
  // Estados (Eastern)
  virginia: "America/New_York",
  va: "America/New_York",
  "new york": "America/New_York",
  ny: "America/New_York",
  florida: "America/New_York",
  fl: "America/New_York",
  georgia: "America/New_York",
  ga: "America/New_York",
  pennsylvania: "America/New_York",
  pa: "America/New_York",

  // Central
  texas: "America/Chicago",
  tx: "America/Chicago",
  illinois: "America/Chicago",
  il: "America/Chicago",

  // Mountain
  colorado: "America/Denver",
  co: "America/Denver",

  // Pacific
  california: "America/Los_Angeles",
  ca: "America/Los_Angeles",
  washington: "America/Los_Angeles",
  wa: "America/Los_Angeles",

  // Especiales
  arizona: "America/Phoenix",
  az: "America/Phoenix",
  alaska: "America/Anchorage",
  ak: "America/Anchorage",
  hawaii: "Pacific/Honolulu",
  hi: "Pacific/Honolulu",

  // Errores comunes
  "america/virgin": "America/Denver", // asumir Virginia (estado)
};

/**
 * Convierte una fecha UTC (ISO string) a fecha/hora local US
 * - default → NO cambia
 * - long → incluye abreviatura (EST / EDT / PST / etc.)
 */
export const convertUtcToTimezone = (
  isoDate,
  timezone = DEFAULT_TIMEZONE,
  formatKey = "default"
) => {
  if (!isoDate) return "";

  // Normalizar timezone antes de usar Luxon
  const safeTimezone = normalizeTimezone(timezone);

  const dt = DateTime
    .fromISO(String(isoDate), { zone: "utc" })
    .setZone(safeTimezone);

  // Formato largo con abreviatura
  if (formatKey === "long") {
    const offset = String(dt.offset);
    const abbr =
      US_TZ_ABBR_BY_OFFSET[safeTimezone]?.[offset] ||
      `GMT${dt.offset / 60}`;

    return `${dt.toFormat(FORMATS.long)} - ${abbr}`;
  }

  // Formato default (NO se rompe)
  return dt.toFormat(FORMATS.default);
};
