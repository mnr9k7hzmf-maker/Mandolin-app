const CACHE = "mandolin-v1";
const FILES = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/pitch.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES))
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});