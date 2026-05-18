export default function GeoStatus({ status, onRequest, disabled }) {

  // --- Geolocalización activa ---
  if (status === "granted") {
    const enabledStyle = {
      border: "1px solid #23A756",
      color: "#23A756",
      background: "#EDFFF2",
      padding: "12px 0",
    };

    const disabledStyle = {
      border: "1px solid #bcbcbcff",
      color: "#fff",
      background: "#bcbcbcff",
      padding: "12px 0",
    };

    return (
      <button
        className="btn w-50 fw-semibold rounded-0 fs-14"
        style={disabled ? disabledStyle : enabledStyle}
        disabled={disabled}
      >
        Location Shared
      </button>
    );
  }

  // NO activa (denied o prompt)
  const enabledStyle = {
    border: "1px solid #E68600",
    color: "#E68600",
    background: "transparent",
    padding: "12px 0",
  };

  const disabledStyle = {
    border: "1px solid #bcbcbcff",
    color: "#fff",
    background: "#bcbcbcff",
    padding: "12px 0",
  };

  return (
    <button
        className="btn w-50 fw-semibold rounded-0 fs-14"
        style={disabled ? disabledStyle : enabledStyle}
        disabled={disabled}
        onClick={disabled ? undefined : onRequest}
      >
        Share My Location
      </button>
  );
}
