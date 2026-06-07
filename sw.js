const CACHE_NAME = 'russky-map-v2';
const STATIC_CACHE = 'russky-static-v2';
const TILE_CACHE = 'russky-tiles-v2';

// Файлы, которые кэшируем сразу при установке
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// При установке — кэшируем основные файлы
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            console.log('Кэширование статических файлов');
            return cache.addAll(STATIC_FILES);
        })
    );
    self.skipWaiting();
});

// При активации — удаляем старые кэши
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== STATIC_CACHE && key !== TILE_CACHE)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Перехват запросов и кэширование тайлов карты
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Кэширование тайлов OpenStreetMap (картинки карты)
    if (url.hostname === 'tile.openstreetmap.org') {
        event.respondWith(
            caches.open(TILE_CACHE).then(cache => {
                return fetch(event.request).then(response => {
                    if (response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => {
                    return cache.match(event.request);
                });
            })
        );
        return;
    }
    
    // Кэширование тайлов CartoDB (подписи на карте)
    if (url.hostname.includes('basemaps.cartocdn.com')) {
        event.respondWith(
            caches.open(TILE_CACHE).then(cache => {
                return fetch(event.request).then(response => {
                    if (response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => {
                    return cache.match(event.request);
                });
            })
        );
        return;
    }
    
    // Для всех остальных запросов — стратегия "сначала кэш, потом сеть"
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(response => {
                if (response.status === 200 && event.request.method === 'GET') {
                    const responseClone = response.clone();
                    caches.open(STATIC_CACHE).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            });
        })
    );
});
