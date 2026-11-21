// Service Worker - Safety Observer (versión corregida para datos móviles)
// Cambios vs. v16:
// 1. Cache-first para la app: si el archivo ya está guardado en el teléfono,
//    la app abre DE INMEDIATO desde el caché, sin esperar a la red.
//    Antes era network-first sin tiempo límite: si la red móvil se quedaba
//    "colgada" intentando conectar, la app no abría nunca.
// 2. La red solo actualiza el caché en segundo plano.
// 3. Si un archivo NO está en caché, la red tiene máximo 5 segundos;
//    si no responde, se muestra la página guardada.
// 4. Se agregaron a la caché los scripts de jsdelivr y los iconos,
//    para que la app no dependa del CDN al abrir.
// 5. Las llamadas a Supabase siguen yendo directo a la red (datos frescos),
//    pero ya no bloquean que la app ABRA.
const CACHE_NAME = 'safety-observer-v17'; // versión nueva para forzar actualización
const BASE = '/safety-Observer-PWA/'; // GitHub Pages distingue mayúsculas
const ASSETS_TO_CACHE = [
    BASE,
    BASE + 'index.html',
    BASE + 'css/styles.css',
    BASE + 'js/app.js',
    BASE + 'js/auth.js',
    BASE + 'js/config.js',
    BASE + 'js/db.js',
    BASE + 'manifest.json',
    BASE + 'icons/icon-192.png',
    BASE + 'icons/icon-512.png',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/chart.js'
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
    if (esApi) {
        event.respondWith(fetch(event.request));
        return;
    }
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cached => {
            const network = fetch(event.request)
                .then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => cached || Promise.reject(new Error('sin-red')));
            // Si ya está en caché, abre de inmediato y la red actualiza en segundo plano
            if (cached) return cached;
            // Si no está en caché, espera la red máximo 5 segundos
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout-red')), 5000)
            );
            return Promise.race([network, timeout]).catch(() =>
                caches.match(BASE + 'index.html').then(page =>
                    page || new Response('Sin conexión', { status: 503 })
                )
            );
        })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
