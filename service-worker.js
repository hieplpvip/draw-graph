const CACHE_NAME = 'draw-graph';

const urlsToCache = [
  './',
  './index.html',
  './favicon.png',
  './bower_components/fabric.min.js',
  './bower_components/split.min.js',
  './bower_components/svg-pan-zoom.min.js',
  './bower_components/viz.js',
  './css/foundation.min.css',
  './js/ace.js',
  './js/mode-dot.js',
  './js/main.js',
  './worker.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    (async function () {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache);
    })()
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async function () {
      const response = await caches.match(event.request);
      return response || fetch(event.request);
    })()
  );
});
