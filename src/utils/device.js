export function detectOS() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;

  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "other";
}
