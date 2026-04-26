// public/sw.js
// Service Worker for Web Push notifications and offline caching.
// Registered by components/PushInit.tsx on every page load.
// DO NOT import from node_modules here — service workers run in a separate context.

const CACHE_NAME = 'familycoins-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/kid',
  '/kid/day',
  '/kid/wallet',
  '/kid/achievements',
  '/icon-192x192.png',
  '/icon-512x512.png',
]

self.addEventListener('push', function (event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'KidsCoins', body: event.data.text() }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard',
    },
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'KidsCoins', options)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If app is open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Install: take control immediately and pre-cache the app shell
self.addEventListener('install', function (event) {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // addAll is best-effort — failures are caught so SW still installs
      return cache.addAll(STATIC_ASSETS).catch(function () {})
    })
  )
})

// Activate: take control of all clients and clean up old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key !== CACHE_NAME })
            .map(function (key) { return caches.delete(key) })
        )
      })
    ])
  )
})

// Fetch: three-strategy caching
self.addEventListener('fetch', function (event) {
  const url = event.request.url

  // Passthrough: API routes and Supabase (never cache)
  if (url.includes('/api/') || url.includes('supabase.co')) {
    return // let browser handle natively
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Static chunks: cache-first
  if (url.includes('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached
        return fetch(event.request).then(function (response) {
          if (response.ok) {
            var clone = response.clone()
            caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone) })
          }
          return response
        })
      })
    )
    return
  }

  // Page routes: network-first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (response.ok) {
          var clone = response.clone()
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone) })
        }
        return response
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('/')
        })
      })
  )
})
