// Self-destroying ("kill-switch") service worker.
//
// Earlier versions cached the app shell cache-first, which caused stale code to
// persist across deployments. Browsers fetch this sw.js bypassing the SW cache,
// so shipping this version makes existing clients install it, clear every cache,
// unregister the worker, and fall back to the network for fresh content.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
      // Reload open tabs once so they pick up fresh network assets.
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        try {
          client.navigate(client.url);
        } catch {
          /* ignore */
        }
      }
    })()
  );
});

// No fetch handler: all requests go straight to the network.
