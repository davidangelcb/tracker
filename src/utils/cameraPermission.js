export async function checkCameraPermission() {
  // iOS Safari: permissions API no es fiable
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (!isIOS && navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "camera" });
      return status.state; // granted | prompt | denied
    } catch {
      return "prompt";
    }
  }

  // Preflight REAL (única forma fiable en iOS)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(t => t.stop());
    return "granted";
  } catch (err) {
    return "denied";
  }
}
