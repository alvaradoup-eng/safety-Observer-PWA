// Service Worker - Safety Observer (versión corregida)
const CACHE_NAME = 'safety-observer-v16'; // ← versión nueva para forzar actualización
const BASE = '/safety-Observer-PWA/'; // ← OJO: GitHub Pages distingue mayúsculas
const ASSETS_TO_CACHE = [
    BASE,
    BASE + 'index.html',
    BASE + 'css/styles.css',
    BASE + 'js/app.js',
    BASE + 'js/auth.js',
    BASE + 'js/config.js',
    BASE + 'js/db.js',
    BASE + 'manifest.json'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker: Instalando versión', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
            .catch(err => console.error('Error en instalación:', err))
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activando...');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    // No guardar en caché las respuestas de la API (Supabase): deben ser siempre frescas
    const esApi = event.request.url.includes('supabase.co');
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (!esApi && response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') return caches.match(BASE + 'index.html');
                    return new Response('Sin conexión', { status: 503 });
                })
            )
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
