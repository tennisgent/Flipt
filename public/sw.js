/* eslint-disable no-restricted-globals */
const CACHE_VERSION = "__BUILD_TIME__";
const CACHE_NAME = `flipt-v${CACHE_VERSION}`;

// Assets that should never be cached by the SW
const IGNORE_PATTERNS = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "apis.google.com",
  "__/auth/",
];

self.addEventListener("install", () => {
  // Don't skipWaiting — wait for client to trigger update
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("flipt-v") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip Firebase / auth / external API requests
  if (IGNORE_PATTERNS.some((p) => url.includes(p))) return;

  // Skip chrome-extension and non-http(s) requests
  if (!url.startsWith("http")) return;

  // Navigation requests (HTML) — network-first
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Hashed assets (JS/CSS with content hashes) — cache-first
  if (url.match(/\/assets\/.*\.[a-f0-9]+\.(js|css)$/)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else (images, icons, etc.) — stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    }),
  );
});

// Listen for skip-waiting message from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
