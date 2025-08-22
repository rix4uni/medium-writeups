/**
 * Utility functions for the Cybersecurity Dashboard
 */

export class Utils {
    /**
     * Format a date string into a human-readable "time ago" format
     */
    static formatTimeAgo(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);

            if (diffInSeconds < 60) {
                return 'Just now';
            }

            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) {
                return `${diffInMinutes}m ago`;
            }

            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) {
                return `${diffInHours}h ago`;
            }

            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 7) {
                return `${diffInDays}d ago`;
            }

            const diffInWeeks = Math.floor(diffInDays / 7);
            if (diffInWeeks < 4) {
                return `${diffInWeeks}w ago`;
            }

            const diffInMonths = Math.floor(diffInDays / 30);
            if (diffInMonths < 12) {
                return `${diffInMonths}mo ago`;
            }

            const diffInYears = Math.floor(diffInDays / 365);
            return `${diffInYears}y ago`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Unknown';
        }
    }

    /**
     * Format a date string into a readable format
     */
    static formatDate(dateString, options = {}) {
        try {
            const date = new Date(dateString);
            const defaultOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            
            return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    }

    /**
     * Sanitize HTML content using DOMPurify
     */
    static sanitizeHTML(html) {
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(html);
        }
        
        // Fallback basic sanitization
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Truncate text to a specified length
     */
    static truncateText(text, maxLength = 100, suffix = '...') {
        if (!text || text.length <= maxLength) {
            return text;
        }
        
        return text.substring(0, maxLength - suffix.length).trim() + suffix;
    }

    /**
     * Extract keywords from text
     */
    static extractKeywords(text, minLength = 3) {
        if (!text) return [];
        
        const words = text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length >= minLength);
        
        // Remove common stop words
        const stopWords = new Set([
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'among', 'within', 'without', 'against',
            'this', 'that', 'these', 'those', 'then', 'than', 'very', 'more', 'most',
            'such', 'some', 'any', 'many', 'much', 'few', 'little', 'all', 'every',
            'each', 'other', 'another', 'both', 'either', 'neither', 'one', 'two',
            'first', 'last', 'next', 'previous', 'same', 'different', 'new', 'old',
            'good', 'bad', 'best', 'worst', 'better', 'worse', 'high', 'low', 'big',
            'small', 'large', 'great', 'little', 'long', 'short', 'easy', 'hard'
        ]);
        
        return words.filter(word => !stopWords.has(word));
    }

    /**
     * Generate a random color
     */
    static randomColor(seed) {
        if (seed) {
            // Generate consistent color based on seed
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = seed.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            const hue = Math.abs(hash) % 360;
            return `hsl(${hue}, 70%, 60%)`;
        }
        
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 60%)`;
    }

    /**
     * Debounce function calls
     */
    static debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * Throttle function calls
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Deep clone an object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
    }

    /**
     * Generate a unique ID
     */
    static generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if a string is a valid URL
     */
    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Format file size in human readable format
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get device information
     */
    static getDeviceInfo() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        
        return {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
            isTablet: /iPad|Android(?!.*Mobile)/i.test(userAgent),
            isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
            platform: platform,
            userAgent: userAgent,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine
        };
    }

    /**
     * Local storage helpers with error handling
     */
    static storage = {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Error writing to localStorage:', error);
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Error removing from localStorage:', error);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Error clearing localStorage:', error);
                return false;
            }
        }
    };

    /**
     * URL parameter helpers
     */
    static url = {
        getParams() {
            return new URLSearchParams(window.location.search);
        },

        getParam(name, defaultValue = null) {
            const params = this.getParams();
            return params.get(name) || defaultValue;
        },

        setParam(name, value) {
            const url = new URL(window.location);
            url.searchParams.set(name, value);
            window.history.replaceState({}, '', url);
        },

        removeParam(name) {
            const url = new URL(window.location);
            url.searchParams.delete(name);
            window.history.replaceState({}, '', url);
        }
    };

    /**
     * Performance monitoring helpers
     */
    static performance = {
        mark(name) {
            if (window.performance && window.performance.mark) {
                window.performance.mark(name);
            }
        },

        measure(name, startMark, endMark) {
            if (window.performance && window.performance.measure) {
                try {
                    window.performance.measure(name, startMark, endMark);
                    const measures = window.performance.getEntriesByName(name);
                    return measures.length > 0 ? measures[0].duration : 0;
                } catch (error) {
                    console.warn('Performance measurement failed:', error);
                    return 0;
                }
            }
            return 0;
        },

        clearMarks(name) {
            if (window.performance && window.performance.clearMarks) {
                window.performance.clearMarks(name);
            }
        },

        clearMeasures(name) {
            if (window.performance && window.performance.clearMeasures) {
                window.performance.clearMeasures(name);
            }
        }
    };

    /**
     * Network status helpers
     */
    static network = {
        isOnline() {
            return navigator.onLine;
        },

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
    };

    /**
     * Error handling helpers
     */
    static error = {
        log(error, context = '') {
            const errorInfo = {
                message: error.message,
                stack: error.stack,
                context: context,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            console.error('Application Error:', errorInfo);
            
            // Could send to error tracking service
            // this.sendToErrorService(errorInfo);
        },

        async sendToErrorService(errorInfo) {
            // Placeholder for error tracking service integration
            // Could integrate with Sentry, LogRocket, etc.
            try {
                // await fetch('/api/errors', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(errorInfo)
                // });
            } catch (err) {
                console.warn('Failed to send error to tracking service:', err);
            }
        }
    };
}

/**
 * Color utilities
 */
export class ColorUtils {
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    static adjustBrightness(color, amount) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const adjust = (component) => {
            const adjusted = component + amount;
            return Math.max(0, Math.min(255, adjusted));
        };

        return this.rgbToHex(
            adjust(rgb.r),
            adjust(rgb.g),
            adjust(rgb.b)
        );
    }

    static getContrastColor(backgroundColor) {
        const rgb = this.hexToRgb(backgroundColor);
        if (!rgb) return '#000000';

        // Calculate luminance
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
}