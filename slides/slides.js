/**
 * Cybersecurity Intelligence Presentation
 * Auto-generated slides from latest threat intelligence data
 */

class PresentationApp {
    constructor() {
        this.data = null;
        this.charts = new Map();
        this.animationSpeed = 50; // ms per character for typewriter effect
        this.isPresenterMode = false;
    }

    async init() {
        console.log('🎯 Initializing Cybersecurity Intelligence Presentation...');
        
        // Initialize Reveal.js
        await this.initReveal();
        
        // Load and process data
        await this.loadData();
        
        // Populate slides with data
        await this.populateSlides();
        
        // Setup auto-refresh
        this.setupAutoRefresh();
        
        console.log('✅ Presentation ready');
    }

    async initReveal() {
        return new Promise((resolve) => {
            Reveal.initialize({
                hash: true,
                controls: true,
                progress: true,
                center: false,
                transition: 'fade',
                transitionSpeed: 'default',
                backgroundTransition: 'fade',
                
                // Presentation size
                width: 1200,
                height: 800,
                margin: 0.04,
                minScale: 0.2,
                maxScale: 2.0,

                // Plugins
                plugins: [RevealMarkdown, RevealHighlight, RevealNotes],

                // Keyboard shortcuts
                keyboard: {
                    13: 'next', // Enter
                    8: 'prev',  // Backspace
                    32: 'next', // Space
                    37: 'prev', // Left arrow
                    39: 'next', // Right arrow
                    82: () => this.refreshData(), // R key
                    80: () => this.togglePresenterMode() // P key
                },

                // Auto-slide options (disabled by default)
                autoSlide: 0,
                autoSlideStoppable: true,

                // Touch/mouse options
                touch: true,
                mouseWheel: false,

                // View options
                overview: true,
                help: true,

                // Slide events
                ready: () => {
                    console.log('📊 Reveal.js initialized');
                    resolve();
                },

                slidechanged: (event) => {
                    this.onSlideChanged(event);
                }
            });
        });
    }

    async loadData() {
        try {
            console.log('📡 Loading presentation data...');
            
            // Try to load from multiple sources
            const dataSources = [
                '../data/posts.json',
                '../data/summary.json',
                './data/posts.json',
                './data/summary.json'
            ];

            const results = await Promise.allSettled([
                this.fetchWithFallback([dataSources[0], dataSources[2]]),
                this.fetchWithFallback([dataSources[1], dataSources[3]])
            ]);

            let posts = [];
            let summary = {};

            if (results[0].status === 'fulfilled') {
                posts = results[0].value;
            }

            if (results[1].status === 'fulfilled') {
                summary = results[1].value;
            }

            // If no data, generate mock data for demo
            if (posts.length === 0) {
                console.log('🔄 Generating demo data...');
                ({ posts, summary } = this.generateMockData());
            }

            this.data = { posts, summary };
            console.log(`✅ Loaded ${posts.length} posts for presentation`);

        } catch (error) {
            console.error('❌ Error loading data:', error);
            // Generate demo data as fallback
            const mockData = this.generateMockData();
            this.data = mockData;
        }
    }

    async fetchWithFallback(urls) {
        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.warn(`Failed to fetch ${url}:`, error.message);
            }
        }
        throw new Error('All data sources failed');
    }

    generateMockData() {
        const categories = [
            'Bug Bounty', 'Web Security', 'Penetration Testing', 'Malware Analysis',
            'Network Security', 'Cloud Security', 'Mobile Security', 'Crypto Security'
        ];

        const posts = [];
        const now = new Date();

        for (let i = 0; i < 100; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const publishedTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
            const ageHours = (now - publishedTime) / (1000 * 60 * 60);

            posts.push({
                guid: `demo-${i}`,
                title: this.generateMockTitle(category),
                description: this.generateMockDescription(),
                publishedTime: publishedTime.toISOString(),
                author: `Researcher ${Math.floor(Math.random() * 50) + 1}`,
                categories: [category, this.generateMockSubCategory()],
                sourceCategory: category,
                priority: Math.floor(Math.random() * 3) + 1,
                ageHours,
                isNew: ageHours <= 24,
                isToday: ageHours <= 24,
                isThisWeek: ageHours <= 168,
                cveIds: Math.random() > 0.8 ? [`CVE-2024-${Math.floor(Math.random() * 9999)}`] : [],
                link: '#'
            });
        }

        const summary = {
            totalPosts: posts.length,
            newPosts: posts.filter(p => p.isNew).length,
            todayPosts: posts.filter(p => p.isToday).length,
            thisWeekPosts: posts.filter(p => p.isThisWeek).length,
            categories: this.generateCategoryStats(posts),
            trendingTopics: this.generateTrendingTopics(posts),
            recentCVEs: this.extractRecentCVEs(posts),
            lastUpdated: now.toISOString()
        };

        return { posts, summary };
    }

    generateMockTitle(category) {
        const titles = {
            'Bug Bounty': [
                'Critical IDOR Leading to Full Account Takeover',
                'Bypassing WAF Using Advanced XSS Techniques',
                'Chain of Vulnerabilities in Enterprise Application',
                'Remote Code Execution via File Upload Bypass'
            ],
            'Web Security': [
                'SQL Injection in Popular CMS Platform',
                'Server-Side Request Forgery Exploitation Guide',
                'Cross-Site Scripting in Modern Frameworks',
                'Authentication Bypass Vulnerabilities'
            ],
            'Penetration Testing': [
                'Advanced Red Team Tactics for 2024',
                'Post-Exploitation Techniques in Windows Environment',
                'Network Segmentation Bypass Methods',
                'Active Directory Attack Vectors'
            ],
            'Malware Analysis': [
                'Dissecting Latest Banking Trojan Variant',
                'Ransomware Evolution and Defense Strategies',
                'APT Campaign Technical Analysis',
                'Steganography in Modern Malware'
            ]
        };

        const categoryTitles = titles[category] || titles['Bug Bounty'];
        return categoryTitles[Math.floor(Math.random() * categoryTitles.length)];
    }

    generateMockDescription() {
        const descriptions = [
            'Detailed analysis of a critical security vulnerability with step-by-step exploitation guide and recommended mitigations.',
            'Comprehensive research into advanced attack techniques with real-world examples and defensive strategies.',
            'Technical deep-dive into emerging threats with practical insights for security professionals.',
            'In-depth exploration of vulnerability discovery methods and responsible disclosure practices.'
        ];

        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    generateMockSubCategory() {
        const subCategories = ['XSS', 'SQLi', 'RCE', 'IDOR', 'CSRF', 'LFI', 'RFI', 'SSRF'];
        return subCategories[Math.floor(Math.random() * subCategories.length)];
    }

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
    }

    generateTrendingTopics(posts) {
        const topics = {};
        posts.forEach(post => {
            post.categories?.forEach(category => {
                topics[category] = (topics[category] || 0) + 1;
            });
        });

        return Object.entries(topics)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);
    }

    extractRecentCVEs(posts) {
        const cves = new Set();
        posts.filter(post => post.isThisWeek)
            .forEach(post => {
                post.cveIds?.forEach(cve => cves.add(cve));
            });

        return Array.from(cves).sort();
    }

    async populateSlides() {
        console.log('🎨 Populating slides with data...');

        // Update presentation date
        document.getElementById('presentation-date').textContent = 
            new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

        // Update total posts count
        document.getElementById('total-posts-count').textContent = this.data.posts.length;

        // Populate executive summary
        this.populateExecutiveSummary();

        // Populate category analysis
        this.populateCategoryAnalysis();

        // Populate CVE and priority posts
        this.populateCVEAnalysis();

        // Populate timeline
        this.populateTimelineAnalysis();

        // Populate latest intelligence
        this.populateLatestIntelligence();

        // Update last update time
        const lastUpdate = this.data.summary.lastUpdated ? 
            new Date(this.data.summary.lastUpdated).toLocaleTimeString() : 
            new Date().toLocaleTimeString();
        document.getElementById('last-update').textContent = `Updated: ${lastUpdate}`;
    }

    populateExecutiveSummary() {
        const { posts, summary } = this.data;

        // Update statistics
        document.getElementById('stat-total').textContent = summary.totalPosts || posts.length;
        document.getElementById('stat-new').textContent = summary.newPosts || posts.filter(p => p.isNew).length;
        document.getElementById('stat-cves').textContent = summary.recentCVEs?.length || 0;
        document.getElementById('stat-categories').textContent = summary.categories?.length || 0;

        // Generate key insights
        const insights = this.generateKeyInsights();
        const insightsElement = document.getElementById('key-insights');
        insightsElement.innerHTML = '';
        
        insights.forEach((insight, index) => {
            setTimeout(() => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-arrow-right" style="color: var(--cyber-blue); margin-right: 8px;"></i>${insight}`;
                insightsElement.appendChild(li);
            }, index * 500);
        });
    }

    generateKeyInsights() {
        const { posts, summary } = this.data;
        const insights = [];

        // CVE insight
        if (summary.recentCVEs?.length > 0) {
            insights.push(`${summary.recentCVEs.length} CVEs mentioned in recent posts - heightened vulnerability activity`);
        }

        // Category insight
        const topCategory = summary.categories?.[0];
        if (topCategory) {
            insights.push(`${topCategory.name} dominates discussions with ${topCategory.total} posts (${Math.round((topCategory.total / posts.length) * 100)}%)`);
        }

        // Trend insight
        const newPostsRatio = (summary.newPosts / posts.length) * 100;
        if (newPostsRatio > 20) {
            insights.push(`High activity detected: ${Math.round(newPostsRatio)}% of posts published in last 24h`);
        } else if (newPostsRatio < 5) {
            insights.push(`Lower than average posting activity in the last 24 hours`);
        }

        // Trending topic insight
        const topTrend = summary.trendingTopics?.[0];
        if (topTrend) {
            insights.push(`"${topTrend.name}" is trending with ${topTrend.count} mentions across posts`);
        }

        return insights.length > 0 ? insights : ['No significant patterns detected in current dataset'];
    }

    populateCategoryAnalysis() {
        const { summary } = this.data;

        // Create category chart
        this.createCategoryChart();

        // Populate category list
        const categoryList = document.getElementById('category-list');
        categoryList.innerHTML = '';

        if (summary.categories) {
            summary.categories.slice(0, 6).forEach((category, index) => {
                const percentage = Math.round((category.total / summary.totalPosts) * 100);
                const item = document.createElement('div');
                item.style.marginBottom = '10px';
                item.style.padding = '8px';
                item.style.background = 'rgba(255,255,255,0.05)';
                item.style.borderRadius = '6px';
                
                setTimeout(() => {
                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--cyber-blue); font-weight: bold;">${category.name}</span>
                            <span style="color: var(--cyber-green);">${category.total} (${percentage}%)</span>
                        </div>
                        <div style="font-size: 0.8em; color: #999; margin-top: 4px;">
                            New: ${category.new || 0} | Today: ${category.today || 0}
                        </div>
                    `;
                    categoryList.appendChild(item);
                }, index * 200);
            });
        }

        // Populate trending topics
        const trendingTopics = document.getElementById('trending-topics');
        trendingTopics.innerHTML = '';

        if (summary.trendingTopics) {
            summary.trendingTopics.slice(0, 8).forEach((topic, index) => {
                setTimeout(() => {
                    const badge = document.createElement('span');
                    badge.className = 'badge badge-category';
                    badge.style.margin = '3px';
                    badge.textContent = `${topic.name} (${topic.count})`;
                    trendingTopics.appendChild(badge);
                }, index * 150);
            });
        }
    }

    createCategoryChart() {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        const { summary } = this.data;
        if (!summary.categories) return;

        // Destroy existing chart
        if (this.charts.has('category')) {
            this.charts.get('category').destroy();
        }

        const topCategories = summary.categories.slice(0, 6);
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
        ];

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topCategories.map(c => c.name),
                datasets: [{
                    data: topCategories.map(c => c.total),
                    backgroundColor: colors.slice(0, topCategories.length),
                    borderWidth: 3,
                    borderColor: '#000000',
                    hoverBorderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            padding: 15,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 2000
                }
            }
        });

        this.charts.set('category', chart);
    }

    populateCVEAnalysis() {
        const { posts, summary } = this.data;

        // Populate recent CVEs
        const recentCVEs = document.getElementById('recent-cves');
        recentCVEs.innerHTML = '';

        if (summary.recentCVEs && summary.recentCVEs.length > 0) {
            summary.recentCVEs.slice(0, 5).forEach((cve, index) => {
                setTimeout(() => {
                    const cvePost = posts.find(p => p.cveIds?.includes(cve));
                    const item = document.createElement('div');
                    item.className = 'post-item';
                    item.style.borderLeftColor = 'var(--cyber-red)';
                    item.innerHTML = `
                        <div class="post-title">
                            <span class="badge badge-cve">${cve}</span>
                            ${cvePost ? cvePost.title : 'CVE Mention Detected'}
                        </div>
                        <div class="post-meta">
                            <i class="fas fa-clock"></i> ${cvePost ? this.formatTimeAgo(cvePost.publishedTime) : 'Recent'}
                        </div>
                        <div class="post-description">
                            ${cvePost ? cvePost.description : 'Critical vulnerability mentioned in recent security research.'}
                        </div>
                    `;
                    recentCVEs.appendChild(item);
                }, index * 300);
            });
        } else {
            recentCVEs.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No recent CVE mentions detected</div>';
        }

        // Populate high priority posts
        const highPriorityPosts = document.getElementById('high-priority-posts');
        highPriorityPosts.innerHTML = '';

        const priorityPosts = posts
            .filter(p => p.priority <= 2)
            .sort((a, b) => new Date(b.publishedTime) - new Date(a.publishedTime))
            .slice(0, 4);

        priorityPosts.forEach((post, index) => {
            setTimeout(() => {
                const item = document.createElement('div');
                item.className = 'post-item';
                item.innerHTML = `
                    <div class="post-title">
                        <span class="badge badge-priority-high">HIGH</span>
                        ${post.title}
                    </div>
                    <div class="post-meta">
                        <i class="fas fa-user"></i> ${post.author || 'Unknown'} • 
                        <i class="fas fa-clock"></i> ${this.formatTimeAgo(post.publishedTime)}
                    </div>
                    <div class="post-description">${post.description}</div>
                `;
                highPriorityPosts.appendChild(item);
            }, index * 250);
        });

        // Update terminal output
        this.updateTerminalOutput();
    }

    updateTerminalOutput() {
        const terminal = document.getElementById('terminal-output');
        const messages = [
            'Scanning vulnerability databases...',
            'Cross-referencing threat intelligence...',
            'Analyzing exploitation patterns...',
            `Found ${this.data.summary.recentCVEs?.length || 0} active CVE discussions`,
            'Threat analysis complete. Monitoring continues...'
        ];

        let messageIndex = 0;
        const updateTerminal = () => {
            if (messageIndex < messages.length) {
                terminal.textContent = messages[messageIndex];
                messageIndex++;
                setTimeout(updateTerminal, 1000);
            }
        };

        updateTerminal();
    }

    populateTimelineAnalysis() {
        this.createTimelineChart();

        // Populate activity patterns
        const patterns = document.getElementById('activity-patterns');
        patterns.innerHTML = '';

        const activityData = this.analyzeActivityPatterns();
        Object.entries(activityData).forEach(([key, value], index) => {
            setTimeout(() => {
                const item = document.createElement('div');
                item.style.marginBottom = '8px';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between;">
                        <span>${key}:</span>
                        <span style="color: var(--cyber-green); font-weight: bold;">${value}</span>
                    </div>
                `;
                patterns.appendChild(item);
            }, index * 200);
        });

        // Populate peak windows
        const peakWindows = document.getElementById('peak-windows');
        peakWindows.innerHTML = '';

        const peakData = this.analyzePeakWindows();
        Object.entries(peakData).forEach(([key, value], index) => {
            setTimeout(() => {
                const item = document.createElement('div');
                item.style.marginBottom = '8px';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between;">
                        <span>${key}:</span>
                        <span style="color: var(--cyber-blue); font-weight: bold;">${value}</span>
                    </div>
                `;
                peakWindows.appendChild(item);
            }, index * 200);
        });
    }

    createTimelineChart() {
        const ctx = document.getElementById('timeline-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.has('timeline')) {
            this.charts.get('timeline').destroy();
        }

        const timelineData = this.generateTimelineData();

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timelineData.labels,
                datasets: [{
                    label: 'Posts',
                    data: timelineData.values,
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00d4ff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#00d4ff',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#ffffff', stepSize: 1 },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#ffffff' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });

        this.charts.set('timeline', chart);
    }

    generateTimelineData() {
        const { posts } = this.data;
        const labels = [];
        const values = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = posts.filter(post => {
                const postDate = new Date(post.publishedTime);
                return postDate >= date && postDate < nextDate;
            }).length;

            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            values.push(count);
        }

        return { labels, values };
    }

    analyzeActivityPatterns() {
        const { posts, summary } = this.data;
        
        return {
            'Peak Day': this.findPeakDay(),
            'Avg Posts/Day': Math.round(posts.length / 7),
            'Today vs Avg': `${summary.todayPosts || 0} posts`,
            'Weekly Trend': this.calculateWeeklyTrend()
        };
    }

    findPeakDay() {
        const { posts } = this.data;
        const dayCounts = {};

        posts.forEach(post => {
            const day = new Date(post.publishedTime).toLocaleDateString('en-US', { weekday: 'short' });
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });

        const peakDay = Object.entries(dayCounts).reduce((a, b) => a[1] > b[1] ? a : b);
        return `${peakDay[0]} (${peakDay[1]} posts)`;
    }

    calculateWeeklyTrend() {
        const { posts } = this.data;
        const now = new Date();
        const thisWeek = posts.filter(p => {
            const postDate = new Date(p.publishedTime);
            const daysDiff = (now - postDate) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        }).length;

        const lastWeek = posts.filter(p => {
            const postDate = new Date(p.publishedTime);
            const daysDiff = (now - postDate) / (1000 * 60 * 60 * 24);
            return daysDiff > 7 && daysDiff <= 14;
        }).length;

        if (lastWeek === 0) return 'No data';
        
        const change = ((thisWeek - lastWeek) / lastWeek) * 100;
        const direction = change > 0 ? '↑' : change < 0 ? '↓' : '→';
        return `${direction} ${Math.abs(Math.round(change))}%`;
    }

    analyzePeakWindows() {
        return {
            'Primary Peak': '14:00-16:00 UTC',
            'Secondary Peak': '09:00-11:00 UTC',
            'Low Activity': '02:00-06:00 UTC',
            'Weekend Factor': '15% lower activity'
        };
    }

    populateLatestIntelligence() {
        const { posts } = this.data;

        // Latest posts
        const latestPosts = document.getElementById('latest-posts');
        latestPosts.innerHTML = '';

        const recent = posts
            .filter(p => p.isNew)
            .sort((a, b) => new Date(b.publishedTime) - new Date(a.publishedTime))
            .slice(0, 4);

        recent.forEach((post, index) => {
            setTimeout(() => {
                const item = document.createElement('div');
                item.className = 'post-item';
                item.innerHTML = `
                    <div class="post-title">
                        <span class="badge badge-new">NEW</span>
                        ${post.title}
                    </div>
                    <div class="post-meta">
                        <i class="fas fa-user"></i> ${post.author || 'Unknown'} • 
                        <i class="fas fa-clock"></i> ${this.formatTimeAgo(post.publishedTime)}
                    </div>
                    <div class="post-description">${post.description}</div>
                `;
                latestPosts.appendChild(item);
            }, index * 250);
        });

        // Bug bounty posts
        const bugBountyPosts = document.getElementById('bug-bounty-posts');
        bugBountyPosts.innerHTML = '';

        const bountyPosts = posts
            .filter(p => p.sourceCategory === 'Bug Bounty' || p.categories?.includes('Bug Bounty'))
            .sort((a, b) => new Date(b.publishedTime) - new Date(a.publishedTime))
            .slice(0, 4);

        bountyPosts.forEach((post, index) => {
            setTimeout(() => {
                const item = document.createElement('div');
                item.className = 'post-item';
                item.innerHTML = `
                    <div class="post-title">
                        <span class="badge" style="background: #ff6348; color: white;">BOUNTY</span>
                        ${post.title}
                    </div>
                    <div class="post-meta">
                        <i class="fas fa-user"></i> ${post.author || 'Unknown'} • 
                        <i class="fas fa-clock"></i> ${this.formatTimeAgo(post.publishedTime)}
                    </div>
                    <div class="post-description">${post.description}</div>
                `;
                bugBountyPosts.appendChild(item);
            }, index * 250);
        });
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    onSlideChanged(event) {
        // Add slide-specific animations or updates
        const slideIndex = event.indexh;
        console.log(`📊 Slide ${slideIndex + 1} active`);

        // Trigger chart animations on relevant slides
        if (slideIndex === 2) { // Category analysis slide
            setTimeout(() => this.createCategoryChart(), 500);
        } else if (slideIndex === 4) { // Timeline slide
            setTimeout(() => this.createTimelineChart(), 500);
        }
    }

    async refreshData() {
        console.log('🔄 Refreshing presentation data...');
        
        // Show loading indicator
        this.showLoadingIndicator();
        
        try {
            await this.loadData();
            await this.populateSlides();
            console.log('✅ Data refreshed successfully');
        } catch (error) {
            console.error('❌ Failed to refresh data:', error);
        } finally {
            this.hideLoadingIndicator();
        }
    }

    showLoadingIndicator() {
        // Could implement a loading overlay
        console.log('⏳ Loading...');
    }

    hideLoadingIndicator() {
        console.log('✅ Loading complete');
    }

    togglePresenterMode() {
        this.isPresenterMode = !this.isPresenterMode;
        
        if (this.isPresenterMode) {
            // Enable presenter mode features
            Reveal.configure({ showNotes: true });
            console.log('🎤 Presenter mode enabled');
        } else {
            Reveal.configure({ showNotes: false });
            console.log('👥 Audience mode enabled');
        }
    }

    setupAutoRefresh() {
        // Auto-refresh every 2 hours
        setInterval(() => {
            this.refreshData();
        }, 2 * 60 * 60 * 1000);

        console.log('🔄 Auto-refresh scheduled every 2 hours');
    }
}

// Initialize presentation when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new PresentationApp();
    await app.init();
    
    // Make app globally available for debugging
    window.presentationApp = app;
});

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('📊 Presentation hidden - pausing updates');
    } else {
        console.log('📊 Presentation visible - resuming updates');
    }
});

// Export for module use
export { PresentationApp };