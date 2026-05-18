export default function GoogleMapsLink({
  lat,
  lng,
  address,
  children = "Open in Google Maps",
  className = "link-gps",
}) {
  let mapsUrl = "";

  if (lat && lng) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  } else if (address) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  } else {
    console.warn("GoogleMapsLink: missing lat/lng or address");
    return null;
  }

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
