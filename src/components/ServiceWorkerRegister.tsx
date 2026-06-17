"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // We no longer use a service worker (it caused stale code to persist across
    // deploys). Unregister any existing worker and clear its caches so clients
    // always load fresh content from the network.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});

    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith("spacefinder"))
              .map((k) => caches.delete(k))
          )
        )
        .catch(() => {});
    }
  }, []);

  return null;
}
