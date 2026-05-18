export function prettifyDetectedClass(value) {
  if (!value) return "Detected object";

  return String(value)
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildBboxBoxStyle(bbox, dimensions) {
  if (
    !bbox ||
    !dimensions?.width ||
    !dimensions?.height ||
    Number(bbox?.x2) <= Number(bbox?.x1) ||
    Number(bbox?.y2) <= Number(bbox?.y1)
  ) {
    return null;
  }

  const left = (Number(bbox.x1) / dimensions.width) * 100;
  const top = (Number(bbox.y1) / dimensions.height) * 100;
  const width = ((Number(bbox.x2) - Number(bbox.x1)) / dimensions.width) * 100;
  const height = ((Number(bbox.y2) - Number(bbox.y1)) / dimensions.height) * 100;

  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    topPct: top,
    heightPct: height,
  };
}

export function getBboxLabelStyle(
  boxStyle,
  { reservedTopPx = 34, preferAboveThreshold = 18 } = {}
) {
  if (!boxStyle) return null;

  const canRenderAbove = boxStyle.topPct > preferAboveThreshold;

  if (canRenderAbove) {
    return {
      left: boxStyle.left,
      top: `max(${reservedTopPx}px, calc(${boxStyle.top} - 34px))`,
    };
  }

  return {
    left: boxStyle.left,
    top: `calc(${boxStyle.top} + ${boxStyle.height} + 6px)`,
  };
}