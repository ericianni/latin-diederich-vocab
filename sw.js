// Offline-first service worker: precache the whole app, serve from cache, refresh in background.
const CACHE = 'latin1400-v26';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'morph.js', 'lessons.js', 'identify.js', 'drillpick.js', 'sentences.html', 'sentences.js', 'sentences/engine.js', 'sentences/lexicon.js', 'sentences/lexicon_s1.js', 'sentences/lexicon_s2.js', 'sentences/lexicon_s3.js', 'sentences/lexicon_s4.js', 'sentences/lexicon_s5.js', 'sentences/lexicon_s7.js', 'sentences/lexicon_s8.js', 'data/words.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
