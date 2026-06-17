// Detect whether the app is running as an installed/home-screen web app
// (standalone display mode) rather than inside a normal browser tab.
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)");
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mql?.matches) || iosStandalone;
}
