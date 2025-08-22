/**
 * Performance monitoring and optimization utilities
 */

export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.thresholds = {
            navigation: 100,  // 100ms target
            lcp: 2500,       // 2.5s for Largest Contentful Paint
            fid: 100,        // 100ms for First Input Delay
            cls: 0.1         // 0.1 for Cumulative Layout Shift
        };
        
        this.init();
    }

    init() {
        this.measureCoreWebVitals();
        this.setupResourceObserver();
        this.setupNavigationTiming();
        this.optimizeImages();
        this.preloadCriticalResources();
    }

    /**
     * Measure Core Web Vitals
     */
    measureCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.set('lcp', entry.startTime);
                    console.log(`LCP: ${entry.startTime.toFixed(2)}ms`);
                    
                    if (entry.startTime > this.thresholds.lcp) {
                        console.warn(`LCP threshold exceeded: ${entry.startTime}ms > ${this.thresholds.lcp}ms`);
                    }
                }
            });

            try {
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.set('lcp', lcpObserver);
            } catch (e) {
                console.log('LCP observation not supported');
            }
        }

        // First Input Delay (FID)
        if ('PerformanceObserver' in window) {
            const fidObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.set('fid', entry.processingStart - entry.startTime);
                    console.log(`FID: ${(entry.processingStart - entry.startTime).toFixed(2)}ms`);
                }
            });

            try {
                fidObserver.observe({ entryTypes: ['first-input'] });
                this.observers.set('fid', fidObserver);
            } catch (e) {
                console.log('FID observation not supported');
            }
        }

        // Cumulative Layout Shift (CLS)
        if ('PerformanceObserver' in window) {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                this.metrics.set('cls', clsValue);
                console.log(`CLS: ${clsValue.toFixed(4)}`);
            });

            try {
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.set('cls', clsObserver);
            } catch (e) {
                console.log('CLS observation not supported');
            }
        }
    }

    /**
     * Monitor resource loading performance
     */
    setupResourceObserver() {
        if ('PerformanceObserver' in window) {
            const resourceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.transferSize > 1000000) { // >1MB
                        console.warn(`Large resource detected: ${entry.name} (${(entry.transferSize / 1024 / 1024).toFixed(2)}MB)`);
                    }
                    
                    if (entry.duration > 1000) { // >1s
                        console.warn(`Slow resource: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
                    }
                }
            });

            try {
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.set('resource', resourceObserver);
            } catch (e) {
                console.log('Resource observation not supported');
            }
        }
    }

    /**
     * Monitor navigation timing
     */
    setupNavigationTiming() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    const metrics = {
                        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
                        tcp: navigation.connectEnd - navigation.connectStart,
                        ssl: navigation.requestStart - navigation.secureConnectionStart,
                        ttfb: navigation.responseStart - navigation.requestStart,
                        download: navigation.responseEnd - navigation.responseStart,
                        domParse: navigation.domContentLoadedEventStart - navigation.responseEnd,
                        domReady: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                        total: navigation.loadEventEnd - navigation.navigationStart
                    };

                    console.group('⚡ Navigation Timing');
                    Object.entries(metrics).forEach(([key, value]) => {
                        console.log(`${key}: ${value.toFixed(2)}ms`);
                    });
                    console.groupEnd();

                    // Check against thresholds
                    if (metrics.total > this.thresholds.navigation) {
                        console.warn(`Navigation threshold exceeded: ${metrics.total}ms > ${this.thresholds.navigation}ms`);
                        this.suggestOptimizations(metrics);
                    }

                    this.metrics.set('navigation', metrics);
                }
            }, 0);
        });
    }

    /**
     * Optimize images with intersection observer
     */
    optimizeImages() {
        // Lazy loading for images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px'
            });

            // Observe all images with data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Preload critical resources
     */
    preloadCriticalResources() {
        const criticalResources = [
            { href: './src/js/app.js', as: 'script' },
            { href: './src/js/cache.js', as: 'script' },
            { href: './assets/fonts/inter.woff2', as: 'font', type: 'font/woff2' }
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.href;
            link.as = resource.as;
            if (resource.type) link.type = resource.type;
            if (resource.as === 'font') link.crossOrigin = 'anonymous';
            
            document.head.appendChild(link);
        });
    }

    /**
     * Virtual scrolling for large lists
     */
    createVirtualScroller(container, items, itemHeight = 80, visibleItems = 10) {
        const totalHeight = items.length * itemHeight;
        const viewportHeight = visibleItems * itemHeight;
        
        container.style.height = `${viewportHeight}px`;
        container.style.overflow = 'auto';
        container.style.position = 'relative';

        const content = document.createElement('div');
        content.style.height = `${totalHeight}px`;
        content.style.position = 'relative';
        container.appendChild(content);

        let startIndex = 0;
        let endIndex = visibleItems;

        const renderItems = () => {
            content.innerHTML = '';
            
            for (let i = startIndex; i < Math.min(endIndex, items.length); i++) {
                const item = document.createElement('div');
                item.style.position = 'absolute';
                item.style.top = `${i * itemHeight}px`;
                item.style.height = `${itemHeight}px`;
                item.style.width = '100%';
                item.innerHTML = items[i];
                content.appendChild(item);
            }
        };

        container.addEventListener('scroll', () => {
            const scrollTop = container.scrollTop;
            const newStartIndex = Math.floor(scrollTop / itemHeight);
            const newEndIndex = newStartIndex + visibleItems;

            if (newStartIndex !== startIndex) {
                startIndex = newStartIndex;
                endIndex = newEndIndex;
                renderItems();
            }
        });

        renderItems();
        return { renderItems, updateItems: (newItems) => { items = newItems; renderItems(); } };
    }

    /**
     * Debounced resize handler
     */
    setupResponsiveOptimizations() {
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Update chart sizes efficiently
                if (window.dashboardApp && window.dashboardApp.analytics) {
                    window.dashboardApp.analytics.charts.forEach(chart => {
                        chart.resize();
                    });
                }
                
                // Recalculate virtual scroll dimensions
                this.optimizeLayoutShift();
            }, 250);
        };

        window.addEventListener('resize', handleResize);
    }

    /**
     * Prevent layout shift by reserving space
     */
    optimizeLayoutShift() {
        // Reserve space for dynamic content
        const placeholders = document.querySelectorAll('[data-dynamic-height]');
        placeholders.forEach(element => {
            const expectedHeight = element.dataset.dynamicHeight;
            if (expectedHeight && !element.style.minHeight) {
                element.style.minHeight = expectedHeight + 'px';
            }
        });
    }

    /**
     * Critical rendering path optimization
     */
    optimizeCriticalPath() {
        // Inline critical CSS for above-the-fold content
        const criticalCSS = `
            .header { display: block; }
            .nav { display: flex; }
            .loading { animation: spin 1s linear infinite; }
        `;
        
        const style = document.createElement('style');
        style.textContent = criticalCSS;
        document.head.insertBefore(style, document.head.firstChild);

        // Defer non-critical CSS
        const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
        nonCriticalCSS.forEach(link => {
            link.media = 'print';
            link.addEventListener('load', () => {
                link.media = 'all';
            });
        });
    }

    /**
     * Suggest optimizations based on metrics
     */
    suggestOptimizations(metrics) {
        const suggestions = [];

        if (metrics.dns > 100) {
            suggestions.push('Consider DNS prefetching: <link rel="dns-prefetch" href="//domain.com">');
        }

        if (metrics.ssl > 500) {
            suggestions.push('SSL handshake is slow. Consider HTTP/2 or connection reuse');
        }

        if (metrics.ttfb > 500) {
            suggestions.push('Server response time is slow. Optimize backend or use CDN');
        }

        if (metrics.download > 1000) {
            suggestions.push('Large download time. Consider compression or smaller resources');
        }

        if (metrics.domParse > 1000) {
            suggestions.push('DOM parsing is slow. Reduce HTML complexity or defer scripts');
        }

        if (suggestions.length > 0) {
            console.group('💡 Performance Suggestions');
            suggestions.forEach(suggestion => console.log(suggestion));
            console.groupEnd();
        }
    }

    /**
     * Memory usage monitoring
     */
    monitorMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            console.log('Memory Usage:', {
                used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
            });

            // Warn if memory usage is high
            if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
                console.warn('High memory usage detected. Consider implementing cleanup strategies.');
            }
        }
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: Object.fromEntries(this.metrics),
            userAgent: navigator.userAgent,
            connection: this.getConnectionInfo(),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * Get connection information
     */
    getConnectionInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            return {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
        }
        return null;
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const connection = this.getConnectionInfo();

        // Slow connection adaptations
        if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
            recommendations.push('Reduce image quality and defer non-critical resources');
            recommendations.push('Enable data saver mode');
        }

        // High RTT optimizations
        if (connection && connection.rtt > 300) {
            recommendations.push('Minimize HTTP requests and use connection pooling');
        }

        // Memory constraints
        if (navigator.deviceMemory && navigator.deviceMemory < 4) {
            recommendations.push('Implement memory-efficient strategies for large datasets');
        }

        return recommendations;
    }

    /**
     * Cleanup observers
     */
    destroy() {
        this.observers.forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });
        this.observers.clear();
        this.metrics.clear();
    }
}

/**
 * Code splitting and dynamic imports
 */
export class CodeSplitter {
    static async loadModule(modulePath) {
        const startTime = performance.now();
        
        try {
            const module = await import(modulePath);
            const loadTime = performance.now() - startTime;
            
            console.log(`Module ${modulePath} loaded in ${loadTime.toFixed(2)}ms`);
            return module;
        } catch (error) {
            console.error(`Failed to load module ${modulePath}:`, error);
            throw error;
        }
    }

    static async loadChartLibrary() {
        if (!window.Chart) {
            return this.loadModule('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.min.js');
        }
        return Promise.resolve();
    }

    static async loadAnalytics() {
        return this.loadModule('./analytics.js');
    }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
    const monitor = new PerformanceMonitor();
    
    // Expose globally for debugging
    if (typeof window !== 'undefined') {
        window.performanceMonitor = monitor;
    }
    
    return monitor;
}