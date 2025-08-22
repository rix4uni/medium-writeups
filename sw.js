/**
 * Service Worker for Cybersecurity Dashboard
 * Provides offline support, caching, and performance optimization
 */

const CACHE_NAME = 'cybersec-dashboard-v4.0.0';
const DATA_CACHE_NAME = 'cybersec-data-v4.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
    NETWORK_ONLY: 'network-only',
    CACHE_ONLY: 'cache-only'
};

// Files to cache on install
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/src/js/app.js',
    '/src/js/cache.js',
    '/src/js/utils.js',
    '/src/js/analytics.js',
    '/slides/',
    '/slides/index.html',
    '/slides/slides.js',
    
    // External CDN resources (cache for offline use)
    'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/3.4.1/tailwind.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.min.js',
    'https://unpkg.com/alpinejs@3.13.5/dist/cdn.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.9/purify.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/reveal.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/theme/black.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.0.4/reveal.min.js'
];

// Data URLs that should use network-first strategy
const DATA_URLS = [
    '/data/posts.json',
    '/data/summary.json',
    '/data/feed.json',
    '/data/feed.rss'
];

// URLs that should always go to network
const NETWORK_ONLY_URLS = [
    '/api/',
    'https://medium.com/',
    'chrome-extension://'
];

// Cache configuration
const CACHE_CONFIG = {
    // Maximum age for different types of content
    maxAge: {
        static: 7 * 24 * 60 * 60 * 1000,    // 7 days
        data: 2 * 60 * 60 * 1000,           // 2 hours
        images: 30 * 24 * 60 * 60 * 1000,   // 30 days
        external: 24 * 60 * 60 * 1000       // 1 day
    },
    
    // Maximum number of items in each cache
    maxItems: {
        static: 50,
        data: 10,
        images: 100,
        external: 25
    }
};

// Performance monitoring
let performanceMetrics = {
    cacheHits: 0,
    networkRequests: 0,
    offlineRequests: 0,
    averageResponseTime: 0
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            cacheStaticResources(),
            self.skipWaiting()
        ])
    );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activated');
    
    event.waitUntil(
        Promise.all([
            cleanupOldCaches(),
            self.clients.claim()
        ])
    );
});

/**
 * Fetch Event Handler - Main request interception
 */
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-HTTP(S) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Determine cache strategy based on URL
    const strategy = getCacheStrategy(url, request);
    
    event.respondWith(
        handleRequest(request, strategy)
    );
});

/**
 * Background Sync for offline actions
 */
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'data-refresh') {
        event.waitUntil(refreshDataCache());
    }
});

/**
 * Push notifications (for future use)
 */
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/assets/icon-192x192.png',
            badge: '/assets/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: data.data || {},
            actions: [
                {
                    action: 'view',
                    title: 'View Details',
                    icon: '/assets/view-icon.png'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss',
                    icon: '/assets/dismiss-icon.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            self.clients.openWindow('/')
        );
    }
});

/**
 * Cache static resources on installation
 */
async function cacheStaticResources() {
    try {
        const cache = await caches.open(CACHE_NAME);
        console.log('📦 Caching static resources...');
        
        // Cache resources in batches to avoid overwhelming the network
        const batchSize = 5;
        for (let i = 0; i < STATIC_CACHE_URLS.length; i += batchSize) {
            const batch = STATIC_CACHE_URLS.slice(i, i + batchSize);
            await Promise.allSettled(
                batch.map(url => 
                    cache.add(url).catch(err => 
                        console.warn(`Failed to cache ${url}:`, err.message)
                    )
                )
            );
        }
        
        console.log('✅ Static resources cached');
    } catch (error) {
        console.error('❌ Failed to cache static resources:', error);
    }
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
    try {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name !== CACHE_NAME && name !== DATA_CACHE_NAME
        );
        
        await Promise.all(
            oldCaches.map(cacheName => {
                console.log('🗑️ Deleting old cache:', cacheName);
                return caches.delete(cacheName);
            })
        );
        
        // Also clean up oversized caches
        await cleanupOversizedCaches();
        
        console.log('✅ Cache cleanup completed');
    } catch (error) {
        console.error('❌ Cache cleanup failed:', error);
    }
}

/**
 * Clean up oversized caches
 */
async function cleanupOversizedCaches() {
    try {
        const staticCache = await caches.open(CACHE_NAME);
        const dataCache = await caches.open(DATA_CACHE_NAME);
        
        await cleanupCache(staticCache, CACHE_CONFIG.maxItems.static);
        await cleanupCache(dataCache, CACHE_CONFIG.maxItems.data);
        
    } catch (error) {
        console.error('❌ Cache size cleanup failed:', error);
    }
}

/**
 * Clean up a specific cache if it exceeds max items
 */
async function cleanupCache(cache, maxItems) {
    try {
        const requests = await cache.keys();
        
        if (requests.length > maxItems) {
            // Remove oldest entries first
            const toDelete = requests.slice(0, requests.length - maxItems);
            await Promise.all(
                toDelete.map(request => cache.delete(request))
            );
            console.log(`🗑️ Removed ${toDelete.length} old cache entries`);
        }
    } catch (error) {
        console.error('❌ Individual cache cleanup failed:', error);
    }
}

/**
 * Determine the appropriate cache strategy for a request
 */
function getCacheStrategy(url, request) {
    // Network-only URLs
    if (NETWORK_ONLY_URLS.some(pattern => url.href.includes(pattern))) {
        return CACHE_STRATEGIES.NETWORK_ONLY;
    }
    
    // Data URLs - network first for freshness
    if (DATA_URLS.some(pattern => url.pathname.includes(pattern))) {
        return CACHE_STRATEGIES.NETWORK_FIRST;
    }
    
    // External CDN resources - cache first for performance
    if (url.origin !== location.origin) {
        return CACHE_STRATEGIES.CACHE_FIRST;
    }
    
    // Images - cache first
    if (request.destination === 'image') {
        return CACHE_STRATEGIES.CACHE_FIRST;
    }
    
    // JavaScript and CSS - stale while revalidate for balance
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
    }
    
    // HTML pages - network first for freshness
    if (request.destination === 'document') {
        return CACHE_STRATEGIES.NETWORK_FIRST;
    }
    
    // Default strategy
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
}

/**
 * Handle request based on strategy
 */
async function handleRequest(request, strategy) {
    const startTime = performance.now();
    
    try {
        let response;
        
        switch (strategy) {
            case CACHE_STRATEGIES.CACHE_FIRST:
                response = await cacheFirst(request);
                break;
                
            case CACHE_STRATEGIES.NETWORK_FIRST:
                response = await networkFirst(request);
                break;
                
            case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
                response = await staleWhileRevalidate(request);
                break;
                
            case CACHE_STRATEGIES.NETWORK_ONLY:
                response = await networkOnly(request);
                break;
                
            case CACHE_STRATEGIES.CACHE_ONLY:
                response = await cacheOnly(request);
                break;
                
            default:
                response = await networkFirst(request);
        }
        
        // Update performance metrics
        updatePerformanceMetrics(startTime, response.headers.get('sw-cache') === 'hit');
        
        return response;
        
    } catch (error) {
        console.error('❌ Request handling failed:', error);
        return createErrorResponse(request);
    }
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
    const cachedResponse = await getCachedResponse(request);
    
    if (cachedResponse) {
        // Update in background if stale
        if (await isResponseStale(cachedResponse, request)) {
            fetchAndCache(request).catch(err => 
                console.warn('Background update failed:', err.message)
            );
        }
        
        cachedResponse.headers.append('sw-cache', 'hit');
        performanceMetrics.cacheHits++;
        return cachedResponse;
    }
    
    return await fetchAndCache(request);
}

/**
 * Network-first strategy
 */
async function networkFirst(request) {
    try {
        const response = await fetchAndCache(request);
        performanceMetrics.networkRequests++;
        return response;
    } catch (error) {
        const cachedResponse = await getCachedResponse(request);
        
        if (cachedResponse) {
            cachedResponse.headers.append('sw-cache', 'hit');
            cachedResponse.headers.append('sw-fallback', 'offline');
            performanceMetrics.offlineRequests++;
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
    const cachedResponse = await getCachedResponse(request);
    
    // Start network request in background
    const networkResponsePromise = fetchAndCache(request).catch(err => {
        console.warn('Background fetch failed:', err.message);
    });
    
    if (cachedResponse) {
        // Return cached response immediately
        cachedResponse.headers.append('sw-cache', 'hit');
        performanceMetrics.cacheHits++;
        
        // Don't await the network request
        networkResponsePromise.then(response => {
            if (response) {
                performanceMetrics.networkRequests++;
            }
        });
        
        return cachedResponse;
    }
    
    // No cached response, wait for network
    const networkResponse = await networkResponsePromise;
    if (networkResponse) {
        performanceMetrics.networkRequests++;
        return networkResponse;
    }
    
    throw new Error('No cached response and network failed');
}

/**
 * Network-only strategy
 */
async function networkOnly(request) {
    const response = await fetch(request);
    performanceMetrics.networkRequests++;
    return response;
}

/**
 * Cache-only strategy
 */
async function cacheOnly(request) {
    const cachedResponse = await getCachedResponse(request);
    
    if (cachedResponse) {
        cachedResponse.headers.append('sw-cache', 'hit');
        performanceMetrics.cacheHits++;
        return cachedResponse;
    }
    
    throw new Error('No cached response available');
}

/**
 * Get cached response for a request
 */
async function getCachedResponse(request) {
    const staticCache = await caches.open(CACHE_NAME);
    const dataCache = await caches.open(DATA_CACHE_NAME);
    
    // Try data cache first for data URLs
    if (DATA_URLS.some(pattern => request.url.includes(pattern))) {
        const response = await dataCache.match(request);
        if (response) return response;
    }
    
    // Try static cache
    return await staticCache.match(request);
}

/**
 * Fetch and cache a request
 */
async function fetchAndCache(request) {
    const response = await fetch(request);
    
    if (response.ok) {
        await cacheResponse(request, response.clone());
    }
    
    return response;
}

/**
 * Cache a response
 */
async function cacheResponse(request, response) {
    try {
        const url = new URL(request.url);
        let cache;
        
        // Determine which cache to use
        if (DATA_URLS.some(pattern => url.pathname.includes(pattern))) {
            cache = await caches.open(DATA_CACHE_NAME);
        } else {
            cache = await caches.open(CACHE_NAME);
        }
        
        await cache.put(request, response);
    } catch (error) {
        console.warn('Failed to cache response:', error.message);
    }
}

/**
 * Check if a cached response is stale
 */
async function isResponseStale(response, request) {
    const url = new URL(request.url);
    const dateHeader = response.headers.get('date');
    
    if (!dateHeader) return true;
    
    const responseDate = new Date(dateHeader);
    const now = new Date();
    const age = now.getTime() - responseDate.getTime();
    
    // Determine max age based on content type
    let maxAge = CACHE_CONFIG.maxAge.static;
    
    if (DATA_URLS.some(pattern => url.pathname.includes(pattern))) {
        maxAge = CACHE_CONFIG.maxAge.data;
    } else if (request.destination === 'image') {
        maxAge = CACHE_CONFIG.maxAge.images;
    } else if (url.origin !== location.origin) {
        maxAge = CACHE_CONFIG.maxAge.external;
    }
    
    return age > maxAge;
}

/**
 * Create an error response for offline scenarios
 */
function createErrorResponse(request) {
    const url = new URL(request.url);
    
    // Return a meaningful offline page for HTML requests
    if (request.destination === 'document') {
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Offline - Cybersecurity Dashboard</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        text-align: center;
                    }
                    .container {
                        background: rgba(255,255,255,0.1);
                        padding: 2rem;
                        border-radius: 1rem;
                        backdrop-filter: blur(10px);
                    }
                    h1 { font-size: 2rem; margin-bottom: 1rem; }
                    p { font-size: 1.1rem; margin-bottom: 1.5rem; }
                    .retry-btn {
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 0.75rem 1.5rem;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        font-size: 1rem;
                    }
                    .retry-btn:hover { background: rgba(255,255,255,0.3); }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🛡️ You're Offline</h1>
                    <p>The cybersecurity dashboard is not available offline, but your cached data is still accessible.</p>
                    <button class="retry-btn" onclick="window.location.reload()">🔄 Try Again</button>
                </div>
            </body>
            </html>
        `, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
                'sw-offline': 'true'
            }
        });
    }
    
    // Return a JSON error for API requests
    if (url.pathname.includes('/api/') || url.pathname.includes('.json')) {
        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'This content is not available offline',
            timestamp: new Date().toISOString()
        }), {
            status: 503,
            headers: {
                'Content-Type': 'application/json',
                'sw-offline': 'true'
            }
        });
    }
    
    // Generic network error
    return new Response('Network Error', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

/**
 * Refresh data cache in background
 */
async function refreshDataCache() {
    console.log('🔄 Refreshing data cache...');
    
    try {
        const refreshPromises = DATA_URLS.map(async (url) => {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const cache = await caches.open(DATA_CACHE_NAME);
                    await cache.put(url, response);
                    console.log(`✅ Refreshed cache for ${url}`);
                }
            } catch (error) {
                console.warn(`Failed to refresh ${url}:`, error.message);
            }
        });
        
        await Promise.all(refreshPromises);
        console.log('✅ Data cache refresh completed');
    } catch (error) {
        console.error('❌ Data cache refresh failed:', error);
    }
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics(startTime, cacheHit) {
    const duration = performance.now() - startTime;
    
    // Update rolling average
    const alpha = 0.1; // Smoothing factor
    performanceMetrics.averageResponseTime = 
        (1 - alpha) * performanceMetrics.averageResponseTime + alpha * duration;
    
    // Send metrics to main thread periodically
    if (Math.random() < 0.01) { // 1% sample rate
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'PERFORMANCE_METRICS',
                    data: performanceMetrics
                });
            });
        });
    }
}

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_URLS':
            event.waitUntil(cacheUrls(data.urls));
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(clearCache(data.cacheName));
            break;
            
        case 'GET_CACHE_SIZE':
            event.waitUntil(getCacheSize().then(size => {
                event.ports[0].postMessage({ size });
            }));
            break;
            
        case 'REFRESH_DATA':
            event.waitUntil(refreshDataCache());
            break;
            
        default:
            console.warn('Unknown message type:', type);
    }
});

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
        urls.map(url => 
            cache.add(url).catch(err => 
                console.warn(`Failed to cache ${url}:`, err.message)
            )
        )
    );
}

/**
 * Clear specific cache
 */
async function clearCache(cacheName) {
    await caches.delete(cacheName || CACHE_NAME);
}

/**
 * Get total cache size
 */
async function getCacheSize() {
    try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return estimate.usage || 0;
        }
        return 0;
    } catch (error) {
        console.warn('Could not estimate storage:', error);
        return 0;
    }
}

console.log('🔧 Service Worker registered successfully');
console.log(`📦 Cache: ${CACHE_NAME}`);
console.log(`📊 Data Cache: ${DATA_CACHE_NAME}`);