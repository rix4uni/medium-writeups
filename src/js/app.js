/**
 * Modern Cybersecurity Dashboard Application
 * Built with Alpine.js for reactive UI and Chart.js for analytics
 */

import { DataCache } from './cache.js';
import { Analytics } from './analytics.js';
import { Utils } from './utils.js';
import { initPerformanceMonitoring, CodeSplitter } from './performance.js';

// Global dashboard application
function dashboardApp() {
    return {
        // Data state
        allPosts: [],
        filteredPosts: [],
        paginatedPosts: [],
        categories: [],
        trendingTopics: [],
        recentCVEs: [],
        stats: {
            totalPosts: 0,
            newPosts: 0,
            todayPosts: 0,
            successRate: 0
        },

        // UI state
        isLoading: true,
        darkMode: false,
        showAnalytics: false,
        showSettings: false,
        showScrollTop: false,
        viewMode: 'grid',

        // Filter state
        searchQuery: '',
        selectedCategory: '',
        timeFilter: '',
        priorityFilter: '',
        searchTimeout: null,

        // Pagination
        currentPage: 1,
        postsPerPage: 12,

        // Settings
        autoRefresh: true,
        lastUpdated: 'Loading...',

        // Charts
        categoryChart: null,
        timelineChart: null,

        // Color palette for categories
        categoryColors: {
            'Core Security': '#FF6B6B',
            'Bug Bounty': '#4ECDC4',
            'Penetration Testing': '#45B7D1',
            'Web Security': '#96CEB4',
            'API & Mobile': '#FFEAA7',
            'Cloud Security': '#DDA0DD',
            'Tools & OSINT': '#74B9FF',
            'Malware & Threats': '#FD79A8',
            'Forensics & IR': '#FDCB6E',
            'Network Security': '#00B894',
            'Vuln Research': '#6C5CE7',
            'Blue Team & SOC': '#00CEC9',
            'Crypto & Privacy': '#E17055'
        },

        async init() {
            // Start performance monitoring
            const perfMonitor = initPerformanceMonitoring();
            Utils.performance.mark('app-init-start');
            
            console.log('🚀 Initializing Cybersecurity Dashboard...');
            
            // Initialize theme
            this.initTheme();
            
            // Initialize scroll tracking
            this.initScrollTracking();
            
            // Load data with performance tracking
            await this.loadData();
            
            Utils.performance.mark('app-init-end');
            const initTime = Utils.performance.measure('app-init', 'app-init-start', 'app-init-end');
            console.log(`⚡ App initialized in ${initTime.toFixed(2)}ms`);
            
            // Log performance report
            setTimeout(() => {
                const report = perfMonitor.getPerformanceReport();
                console.log('📊 Performance Report:', report);
            }, 1000);
            
            // Setup auto-refresh
            this.setupAutoRefresh();
            
            // Initialize analytics
            this.initAnalytics();
            
            console.log('✅ Dashboard initialized successfully');
        },

        initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            this.setTheme(savedTheme);
        },

        initScrollTracking() {
            window.addEventListener('scroll', () => {
                this.showScrollTop = window.pageYOffset > 300;
            });
        },

        async loadData() {
            try {
                this.isLoading = true;
                
                // Try to load from cache first
                const cache = new DataCache();
                let data = await cache.get('dashboard-data');
                
                if (!data || cache.isExpired('dashboard-data', 30 * 60 * 1000)) { // 30 minutes
                    console.log('📡 Loading fresh data...');
                    data = await this.fetchFreshData();
                    await cache.set('dashboard-data', data);
                } else {
                    console.log('💾 Loading from cache...');
                }
                
                await this.processData(data);
                this.lastUpdated = new Date().toLocaleTimeString();
                
            } catch (error) {
                console.error('❌ Error loading data:', error);
                await this.loadFallbackData();
            } finally {
                this.isLoading = false;
            }
        },

        async fetchFreshData() {
            const endpoints = [
                './data/posts.json',
                './data/summary.json'
            ];
            
            const responses = await Promise.allSettled(
                endpoints.map(url => fetch(url).then(r => r.json()))
            );
            
            const [postsResult, summaryResult] = responses;
            
            if (postsResult.status === 'fulfilled' && summaryResult.status === 'fulfilled') {
                return {
                    posts: postsResult.value,
                    summary: summaryResult.value
                };
            }
            
            // Fallback to posts only
            if (postsResult.status === 'fulfilled') {
                return {
                    posts: postsResult.value,
                    summary: this.generateSummaryFromPosts(postsResult.value)
                };
            }
            
            throw new Error('Failed to fetch data');
        },

        async loadFallbackData() {
            console.log('🔄 Loading fallback data...');
            
            // Generate mock data for demonstration
            const mockData = this.generateMockData();
            await this.processData(mockData);
            this.lastUpdated = 'Demo Data';
        },

        generateMockData() {
            const categories = Object.keys(this.categoryColors);
            const posts = [];
            
            for (let i = 0; i < 50; i++) {
                const category = categories[Math.floor(Math.random() * categories.length)];
                const publishedTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
                const ageHours = (Date.now() - new Date(publishedTime)) / (1000 * 60 * 60);
                
                posts.push({
                    guid: `mock-${i}`,
                    title: `Mock Cybersecurity Post ${i + 1}: ${this.generateMockTitle()}`,
                    link: '#',
                    description: this.generateMockDescription(),
                    publishedTime,
                    author: `Author ${Math.floor(Math.random() * 10) + 1}`,
                    categories: [this.generateMockCategory(), this.generateMockCategory()],
                    sourceCategory: category,
                    priority: Math.floor(Math.random() * 3) + 1,
                    ageHours,
                    isNew: ageHours <= 24,
                    isToday: ageHours <= 24,
                    isThisWeek: ageHours <= 168,
                    cveIds: Math.random() > 0.7 ? [`CVE-2024-${Math.floor(Math.random() * 9999)}`] : []
                });
            }
            
            return {
                posts,
                summary: this.generateSummaryFromPosts(posts)
            };
        },

        generateMockTitle() {
            const titles = [
                'Critical XSS Vulnerability Found in Popular Framework',
                'New SQL Injection Bypass Technique Discovered',
                'Advanced Persistent Threat Analysis',
                'Zero-Day Exploit in Enterprise Software',
                'Bug Bounty Writeup: From IDOR to Account Takeover',
                'Malware Analysis: Latest Ransomware Campaign',
                'Penetration Testing Methodology Update',
                'Cloud Security Misconfiguration Leads to Data Breach'
            ];
            return titles[Math.floor(Math.random() * titles.length)];
        },

        generateMockDescription() {
            const descriptions = [
                'This post details a comprehensive analysis of a newly discovered vulnerability and its potential impact on enterprise security.',
                'A detailed walkthrough of exploitation techniques and mitigation strategies for this critical security flaw.',
                'In-depth research into advanced attack vectors and defensive countermeasures in modern cybersecurity.',
                'Technical analysis of the vulnerability discovery process and responsible disclosure timeline.'
            ];
            return descriptions[Math.floor(Math.random() * descriptions.length)];
        },

        generateMockCategory() {
            const cats = ['XSS', 'SQLi', 'RCE', 'IDOR', 'SSRF', 'LFI', 'API Security', 'Mobile Security'];
            return cats[Math.floor(Math.random() * cats.length)];
        },

        generateSummaryFromPosts(posts) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            return {
                totalPosts: posts.length,
                newPosts: posts.filter(p => p.isNew).length,
                todayPosts: posts.filter(p => p.isToday).length,
                thisWeekPosts: posts.filter(p => p.isThisWeek).length,
                categories: this.generateCategoryStats(posts),
                trendingTopics: this.generateTrendingTopics(posts),
                recentCVEs: this.extractRecentCVEs(posts),
                stats: {
                    totalFeeds: 50,
                    successfulFeeds: 45,
                    successRate: 90
                }
            };
        },

        async processData(data) {
            const { posts, summary } = data;
            
            // Store data
            this.allPosts = posts.sort((a, b) => {
                // Sort by priority, then by new posts, then by date
                if (a.priority !== b.priority) return a.priority - b.priority;
                if (a.isNew !== b.isNew) return b.isNew - a.isNew;
                return new Date(b.publishedTime) - new Date(a.publishedTime);
            });
            
            // Process summary data
            this.categories = summary.categories || this.generateCategoryStats(posts);
            this.trendingTopics = summary.trendingTopics || this.generateTrendingTopics(posts);
            this.recentCVEs = summary.recentCVEs || this.extractRecentCVEs(posts);
            
            // Update stats
            this.stats = {
                totalPosts: summary.totalPosts || posts.length,
                newPosts: summary.newPosts || posts.filter(p => p.isNew).length,
                todayPosts: summary.todayPosts || posts.filter(p => p.isToday).length,
                successRate: summary.stats?.successRate || 90
            };
            
            // Apply initial filters
            this.filterPosts();
            
            // Initialize charts after DOM is ready
            this.$nextTick(() => {
                if (this.showAnalytics) {
                    this.initCharts();
                }
            });
        },

        generateCategoryStats(posts) {
            const stats = {};
            
            posts.forEach(post => {
                const category = post.sourceCategory;
                if (!stats[category]) {
                    stats[category] = { name: category, total: 0, new: 0, today: 0 };
                }
                
                stats[category].total++;
                if (post.isNew) stats[category].new++;
                if (post.isToday) stats[category].today++;
            });
            
            return Object.values(stats).sort((a, b) => b.total - a.total);
        },

        generateTrendingTopics(posts) {
            const topics = {};
            
            posts.forEach(post => {
                post.categories?.forEach(category => {
                    const key = category.toLowerCase();
                    topics[key] = (topics[key] || 0) + 1;
                });
            });
            
            return Object.entries(topics)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 20);
        },

        extractRecentCVEs(posts) {
            const cves = new Set();
            
            posts
                .filter(post => post.isThisWeek)
                .forEach(post => {
                    post.cveIds?.forEach(cve => cves.add(cve));
                });
            
            return Array.from(cves).sort();
        },

        filterPosts() {
            let filtered = [...this.allPosts];
            
            // Search filter
            if (this.searchQuery.trim()) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(post => 
                    post.title.toLowerCase().includes(query) ||
                    post.description.toLowerCase().includes(query) ||
                    post.categories?.some(cat => cat.toLowerCase().includes(query)) ||
                    post.cveIds?.some(cve => cve.toLowerCase().includes(query))
                );
            }
            
            // Category filter
            if (this.selectedCategory) {
                filtered = filtered.filter(post => 
                    post.sourceCategory === this.selectedCategory
                );
            }
            
            // Time filter
            if (this.timeFilter) {
                switch (this.timeFilter) {
                    case 'today':
                        filtered = filtered.filter(post => post.isToday);
                        break;
                    case 'week':
                        filtered = filtered.filter(post => post.isThisWeek);
                        break;
                    case 'new':
                        filtered = filtered.filter(post => post.isNew);
                        break;
                }
            }
            
            // Priority filter
            if (this.priorityFilter) {
                const priorityMap = { high: [1, 2], medium: [3, 4], low: [5, 6, 7, 8] };
                const priorities = priorityMap[this.priorityFilter] || [];
                filtered = filtered.filter(post => priorities.includes(post.priority));
            }
            
            this.filteredPosts = filtered;
            this.currentPage = 1;
            this.updatePagination();
        },

        updatePagination() {
            const start = (this.currentPage - 1) * this.postsPerPage;
            const end = start + parseInt(this.postsPerPage);
            this.paginatedPosts = this.filteredPosts.slice(0, end);
        },

        debounceSearch() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.filterPosts();
            }, 300);
        },

        loadMore() {
            this.currentPage++;
            this.updatePagination();
        },

        hasMorePosts() {
            return this.paginatedPosts.length < this.filteredPosts.length;
        },

        // Filter management
        hasActiveFilters() {
            return !!(this.searchQuery || this.selectedCategory || this.timeFilter || this.priorityFilter);
        },

        getActiveFilters() {
            const filters = [];
            
            if (this.searchQuery) {
                filters.push({ type: 'search', label: `Search: "${this.searchQuery}"` });
            }
            if (this.selectedCategory) {
                filters.push({ type: 'category', label: `Category: ${this.selectedCategory}` });
            }
            if (this.timeFilter) {
                const timeLabels = { today: 'Today', week: 'This Week', new: 'New Posts' };
                filters.push({ type: 'time', label: `Time: ${timeLabels[this.timeFilter]}` });
            }
            if (this.priorityFilter) {
                const priorityLabels = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };
                filters.push({ type: 'priority', label: `Priority: ${priorityLabels[this.priorityFilter]}` });
            }
            
            return filters;
        },

        clearFilter(type) {
            switch (type) {
                case 'search':
                    this.searchQuery = '';
                    break;
                case 'category':
                    this.selectedCategory = '';
                    break;
                case 'time':
                    this.timeFilter = '';
                    break;
                case 'priority':
                    this.priorityFilter = '';
                    break;
            }
            this.filterPosts();
        },

        clearAllFilters() {
            this.searchQuery = '';
            this.selectedCategory = '';
            this.timeFilter = '';
            this.priorityFilter = '';
            this.filterPosts();
        },

        // Theme management
        toggleTheme() {
            this.setTheme(this.darkMode ? 'light' : 'dark');
        },

        setTheme(theme) {
            this.darkMode = theme === 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            // Update charts if they exist
            if (this.categoryChart || this.timelineChart) {
                this.$nextTick(() => this.initCharts());
            }
        },

        // Auto-refresh
        setupAutoRefresh() {
            if (this.autoRefresh) {
                setInterval(() => {
                    this.loadData();
                }, 2 * 60 * 60 * 1000); // 2 hours
            }
        },

        toggleAutoRefresh() {
            localStorage.setItem('autoRefresh', this.autoRefresh);
            if (this.autoRefresh) {
                this.setupAutoRefresh();
            }
        },

        // Utility functions
        formatTimeAgo(dateString) {
            return Utils.formatTimeAgo(dateString);
        },

        highlightSearchTerm(text) {
            if (!this.searchQuery.trim() || !text) return text;
            
            const regex = new RegExp(`(${this.searchQuery})`, 'gi');
            return DOMPurify.sanitize(
                text.replace(regex, '<span class="search-highlight">$1</span>')
            );
        },

        getPriorityClass(priority) {
            if (priority <= 2) return 'priority-high';
            if (priority <= 4) return 'priority-medium';
            return 'priority-low';
        },

        getCategoryColor(category) {
            return this.categoryColors[category] || '#6B7280';
        },

        animateCard(element, index) {
            element.style.animationDelay = `${index * 0.1}s`;
            element.classList.add('animate-fade-in-up');
        },

        scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        // Analytics
        initAnalytics() {
            this.$watch('showAnalytics', (show) => {
                if (show) {
                    this.$nextTick(() => this.initCharts());
                }
            });
        },

        initCharts() {
            this.initCategoryChart();
            this.initTimelineChart();
        },

        initCategoryChart() {
            const ctx = document.getElementById('categoryChart');
            if (!ctx) return;
            
            if (this.categoryChart) {
                this.categoryChart.destroy();
            }
            
            const data = this.categories.slice(0, 8); // Top 8 categories
            
            this.categoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.map(c => c.name),
                    datasets: [{
                        data: data.map(c => c.total),
                        backgroundColor: data.map(c => this.getCategoryColor(c.name)),
                        borderWidth: 2,
                        borderColor: this.darkMode ? '#374151' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: this.darkMode ? '#e5e7eb' : '#374151',
                                padding: 15,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        },

        initTimelineChart() {
            const ctx = document.getElementById('timelineChart');
            if (!ctx) return;
            
            if (this.timelineChart) {
                this.timelineChart.destroy();
            }
            
            // Generate timeline data for the past 7 days
            const days = [];
            const counts = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
                
                const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
                
                const count = this.allPosts.filter(post => {
                    const postDate = new Date(post.publishedTime);
                    return postDate >= dayStart && postDate < dayEnd;
                }).length;
                
                days.push(dayStr);
                counts.push(count);
            }
            
            this.timelineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Posts',
                        data: counts,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: this.darkMode ? '#e5e7eb' : '#374151'
                            },
                            grid: {
                                color: this.darkMode ? '#374151' : '#e5e7eb'
                            }
                        },
                        x: {
                            ticks: {
                                color: this.darkMode ? '#e5e7eb' : '#374151'
                            },
                            grid: {
                                color: this.darkMode ? '#374151' : '#e5e7eb'
                            }
                        }
                    }
                }
            });
        }
    };
}

// Make dashboard app globally available
window.dashboardApp = dashboardApp;

// Export for module use
export { dashboardApp };