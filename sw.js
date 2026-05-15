// Agenda PWA — Service Worker
const CACHE = 'agenda-v1';
const SHELL = ['./','./index.html','./manifest.json','./icon.svg','./sw.js'];

// ── Install: cache app shell ──────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches ────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, network fallback ─────────────────────────────────
self.addEventListener('fetch', e => {
  // Only handle GET requests for our own origin
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache fresh responses for our shell files
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// ── Notifications: called from app via postMessage ────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'NOTIFY') {
    const { title, body } = e.data;
    self.registration.showNotification(title, {
      body,
      icon: './icon.svg',
      badge: './icon.svg',
      tag: title, // prevent duplicate banners for same item
      requireInteraction: false,
    });
  }
  // App can also trigger a full notification check
  if (e.data?.type === 'CHECK_DONE') {
    // Acknowledge — actual check logic lives in the app
  }
});

// ── Push (future-proofing for server-push if you ever add it) ─────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  const { title, body } = e.data.json();
  e.waitUntil(
    self.registration.showNotification(title, { body, icon: './icon.svg' })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(wins => {
      if (wins.length) return wins[0].focus();
      return clients.openWindow('./');
    })
  );
});
