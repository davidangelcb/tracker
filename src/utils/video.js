function parseVideo(url) {
  if (!url) return null;

  // ---------- YOUTUBE ----------
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    let videoId = null;
    let isShort = false;

    let match = url.match(/v=([^&]+)/);
    if (match) videoId = match[1];

    match = url.match(/youtu\.be\/([^?&]+)/);
    if (match) videoId = match[1];

    match = url.match(/shorts\/([^?&]+)/);
    if (match) {
      videoId = match[1];
      isShort = true;
    }

    if (!videoId) return null;

    return {
      platform: "youtube",
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
      isVertical: isShort,
    };
  }

  // ---------- VIMEO ----------
  if (url.includes("vimeo.com")) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (!match) return null;

    return {
      platform: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${match[1]}?autoplay=1`,
      isVertical: false,
    };
  }

  return null;
}

export { parseVideo };
