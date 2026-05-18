import { DateTime } from "luxon";

const DEFAULT_TIMEZONE = "America/New_York";

const FORMATS = {
  default: "MM/dd/yyyy - hh:mm a",
  long: "MMM dd, yyyy, hh:mm a",
};

const TZ_ABBR_BY_IANA = {
  "America/New_York": "ET",
  "America/Chicago": "CT",
  "America/Denver": "MT",
  "America/Los_Angeles": "PT",
  "America/Anchorage": "AKT",
  "Pacific/Honolulu": "HAT",
};

export const convertUtcToTimezone = (
  value,
  timezone = DEFAULT_TIMEZONE,
  formatKey = "default"
) => {
  if (!value) return "";

  // Soporta string ISO o Date
  const iso =
    value instanceof Date
      ? value.toISOString()
      : String(value);

  // Fallback fuerte por seguridad
  const safeTimezone =
    TZ_ABBR_BY_IANA[timezone] ? timezone : DEFAULT_TIMEZONE;

  const dt = DateTime
    .fromISO(iso, { zone: "utc" })
    .setZone(safeTimezone);

  if (formatKey === "long") {
    const abbr = TZ_ABBR_BY_IANA[safeTimezone];
    return `${dt.toFormat(FORMATS.long)} - ${abbr}`;
  }

  // Default NO se rompe
  return dt.toFormat(FORMATS.default);
};
