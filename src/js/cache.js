/**
 * Data caching utilities using IndexedDB and localStorage
 * Provides fast, offline-capable data storage
 */

export class DataCache {
    constructor(dbName = 'CyberSecDashboard', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        if (!window.indexedDB) {
            console.warn('IndexedDB not supported, falling back to localStorage');
            return;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('cache')) {
                    const store = db.createObjectStore('cache', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async set(key, data, storeName = 'cache') {
        await this.initPromise;
        
        if (!this.db) {
            // Fallback to localStorage
            try {
                const item = {
                    data,
                    timestamp: Date.now()
                };
                localStorage.setItem(`${this.dbName}_${key}`, JSON.stringify(item));
                return true;
            } catch (error) {
                console.error('localStorage write failed:', error);
                return false;
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const item = {
                key,
                data,
                timestamp: Date.now()
            };
            
            const request = store.put(item);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => {
                console.error('Failed to store data:', request.error);
                reject(request.error);
            };
        });
    }

    async get(key, storeName = 'cache') {
        await this.initPromise;
        
        if (!this.db) {
            // Fallback to localStorage
            try {
                const item = localStorage.getItem(`${this.dbName}_${key}`);
                if (item) {
                    const parsed = JSON.parse(item);
                    return parsed.data;
                }
                return null;
            } catch (error) {
                console.error('localStorage read failed:', error);
                return null;
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.data : null);
            };
            
            request.onerror = () => {
                console.error('Failed to retrieve data:', request.error);
                reject(request.error);
            };
        });
    }

    async getWithMetadata(key, storeName = 'cache') {
        await this.initPromise;
        
        if (!this.db) {
            // Fallback to localStorage
            try {
                const item = localStorage.getItem(`${this.dbName}_${key}`);
                if (item) {
                    return JSON.parse(item);
                }
                return null;
            } catch (error) {
                console.error('localStorage read failed:', error);
                return null;
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                console.error('Failed to retrieve data:', request.error);
                reject(request.error);
            };
        });
    }

    async remove(key, storeName = 'cache') {
        await this.initPromise;
        
        if (!this.db) {
            // Fallback to localStorage
            try {
                localStorage.removeItem(`${this.dbName}_${key}`);
                return true;
            } catch (error) {
                console.error('localStorage remove failed:', error);
                return false;
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => {
                console.error('Failed to remove data:', request.error);
                reject(request.error);
            };
        });
    }

    async clear(storeName = 'cache') {
        await this.initPromise;
        
        if (!this.db) {
            // Fallback to localStorage
            try {
                const keys = Object.keys(localStorage).filter(key => 
                    key.startsWith(`${this.dbName}_`)
                );
                keys.forEach(key => localStorage.removeItem(key));
                return true;
            } catch (error) {
                console.error('localStorage clear failed:', error);
                return false;
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => {
                console.error('Failed to clear store:', request.error);
                reject(request.error);
            };
        });
    }

    async isExpired(key, maxAge, storeName = 'cache') {
        const item = await this.getWithMetadata(key, storeName);
        
        if (!item || !item.timestamp) {
            return true;
        }
        
        return (Date.now() - item.timestamp) > maxAge;
    }

    async cleanExpired(maxAge, storeName = 'cache') {
        await this.initPromise;
        
        if (!this.db) {
            // Fallback to localStorage
            try {
                const keys = Object.keys(localStorage).filter(key => 
                    key.startsWith(`${this.dbName}_`)
                );
                
                let cleaned = 0;
                keys.forEach(key => {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        if (item.timestamp && (Date.now() - item.timestamp) > maxAge) {
                            localStorage.removeItem(key);
                            cleaned++;
                        }
                    } catch (error) {
                        // Remove corrupted items
                        localStorage.removeItem(key);
                        cleaned++;
                    }
                });
                
                return cleaned;
            } catch (error) {
                console.error('localStorage cleanup failed:', error);
                return 0;
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const index = store.index('timestamp');
            
            let cleaned = 0;
            const cutoff = Date.now() - maxAge;
            
            const request = index.openCursor();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor) {
                    if (cursor.value.timestamp < cutoff) {
                        cursor.delete();
                        cleaned++;
                    }
                    cursor.continue();
                } else {
                    resolve(cleaned);
                }
            };
            
            request.onerror = () => {
                console.error('Failed to clean expired data:', request.error);
                reject(request.error);
            };
        });
    }

    async getSize(storeName = 'cache') {
        await this.initPromise;
        
        if (!this.db) {
            // Estimate localStorage size
            try {
                let size = 0;
                const keys = Object.keys(localStorage).filter(key => 
                    key.startsWith(`${this.dbName}_`)
                );
                
                keys.forEach(key => {
                    size += localStorage.getItem(key).length;
                });
                
                return size;
            } catch (error) {
                console.error('localStorage size calculation failed:', error);
                return 0;
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                console.error('Failed to get store size:', request.error);
                reject(request.error);
            };
        });
    }
}

/**
 * Simple memory cache for frequently accessed data
 */
export class MemoryCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    set(key, value, ttl = 300000) { // 5 minutes default TTL
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl
        });
    }

    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }
        
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }

    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

/**
 * Combined cache that uses memory cache for hot data and IndexedDB for persistent storage
 */
export class HybridCache {
    constructor(options = {}) {
        this.memoryCache = new MemoryCache(options.memorySize || 50);
        this.dataCache = new DataCache(options.dbName, options.version);
        this.memoryTTL = options.memoryTTL || 300000; // 5 minutes
        this.diskTTL = options.diskTTL || 3600000; // 1 hour
    }

    async get(key) {
        // Try memory cache first
        const memoryResult = this.memoryCache.get(key);
        if (memoryResult !== null) {
            return memoryResult;
        }

        // Try disk cache
        const diskResult = await this.dataCache.get(key);
        if (diskResult !== null) {
            // Check if expired
            const isExpired = await this.dataCache.isExpired(key, this.diskTTL);
            if (!isExpired) {
                // Store in memory cache for faster access
                this.memoryCache.set(key, diskResult, this.memoryTTL);
                return diskResult;
            } else {
                // Remove expired data
                await this.dataCache.remove(key);
            }
        }

        return null;
    }

    async set(key, value) {
        // Store in both caches
        this.memoryCache.set(key, value, this.memoryTTL);
        await this.dataCache.set(key, value);
    }

    async remove(key) {
        this.memoryCache.delete(key);
        await this.dataCache.remove(key);
    }

    async clear() {
        this.memoryCache.clear();
        await this.dataCache.clear();
    }

    async cleanup() {
        this.memoryCache.cleanup();
        await this.dataCache.cleanExpired(this.diskTTL);
    }
}