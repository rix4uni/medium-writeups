/**
 * Analytics and data visualization utilities
 * Provides charts, heatmaps, and statistical analysis
 */

export class Analytics {
    constructor() {
        this.charts = new Map();
        this.defaultColors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#fa709a', '#fee140', '#a8edea', '#fed6e3'
        ];
    }

    /**
     * Create a category distribution chart
     */
    createCategoryChart(ctx, data, options = {}) {
        const config = {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.name),
                datasets: [{
                    data: data.map(item => item.total),
                    backgroundColor: data.map((item, index) => 
                        options.colors?.[index] || this.defaultColors[index % this.defaultColors.length]
                    ),
                    borderWidth: 2,
                    borderColor: options.borderColor || '#ffffff',
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            color: options.textColor || '#374151',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
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
                    animateScale: true
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(ctx.id, chart);
        return chart;
    }

    /**
     * Create a timeline chart showing posts over time
     */
    createTimelineChart(ctx, posts, options = {}) {
        const timelineData = this.generateTimelineData(posts, options.days || 7);
        
        const config = {
            type: 'line',
            data: {
                labels: timelineData.labels,
                datasets: [{
                    label: 'Posts',
                    data: timelineData.values,
                    borderColor: options.primaryColor || '#667eea',
                    backgroundColor: options.backgroundColor || 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: options.primaryColor || '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: options.primaryColor || '#667eea',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: options.textColor || '#6b7280',
                            stepSize: 1
                        },
                        grid: {
                            color: options.gridColor || 'rgba(107, 114, 128, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: options.textColor || '#6b7280'
                        },
                        grid: {
                            color: options.gridColor || 'rgba(107, 114, 128, 0.1)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        };

        const chart = new Chart(ctx, config);
        this.charts.set(ctx.id, chart);
        return chart;
    }

    /**
     * Create a heatmap showing activity patterns
     */
    createHeatmap(container, posts, options = {}) {
        const heatmapData = this.generateHeatmapData(posts, options);
        
        // Create heatmap structure
        container.innerHTML = '';
        container.className = 'heatmap-container';
        
        const weeks = Math.ceil(heatmapData.length / 7);
        const cellSize = options.cellSize || 12;
        const cellGap = options.cellGap || 2;
        
        for (let week = 0; week < weeks; week++) {
            const weekDiv = document.createElement('div');
            weekDiv.className = 'heatmap-week';
            weekDiv.style.display = 'flex';
            weekDiv.style.flexDirection = 'column';
            weekDiv.style.marginRight = `${cellGap}px`;
            
            for (let day = 0; day < 7; day++) {
                const dataIndex = week * 7 + day;
                if (dataIndex >= heatmapData.length) break;
                
                const cellData = heatmapData[dataIndex];
                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.marginBottom = `${cellGap}px`;
                cell.style.borderRadius = '2px';
                cell.style.cursor = 'pointer';
                
                // Set intensity based on post count
                const intensity = Math.min(cellData.count / 10, 1); // Max 10 posts for full intensity
                const color = this.getHeatmapColor(intensity, options.colorScheme);
                cell.style.backgroundColor = color;
                
                // Add tooltip
                cell.title = `${cellData.date}: ${cellData.count} posts`;
                
                weekDiv.appendChild(cell);
            }
            
            container.appendChild(weekDiv);
        }
    }

    /**
     * Generate timeline data for charts
     */
    generateTimelineData(posts, days = 7) {
        const labels = [];
        const values = [];
        
        for (let i = days - 1; i >= 0; i--) {
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

    /**
     * Generate heatmap data for the past year
     */
    generateHeatmapData(posts, options = {}) {
        const data = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 1);
        
        // Start from the beginning of the week
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);
        
        const currentDate = new Date(startDate);
        
        while (currentDate <= today) {
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const count = posts.filter(post => {
                const postDate = new Date(post.publishedTime);
                return postDate >= currentDate && postDate < nextDate;
            }).length;
            
            data.push({
                date: currentDate.toLocaleDateString(),
                count: count,
                day: currentDate.getDay(),
                week: Math.floor((currentDate - startDate) / (7 * 24 * 60 * 60 * 1000))
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return data;
    }

    /**
     * Get color for heatmap cell based on intensity
     */
    getHeatmapColor(intensity, colorScheme = 'green') {
        const schemes = {
            green: {
                low: '#ebedf0',
                medium: '#9be9a8',
                high: '#40c463',
                max: '#30a14e'
            },
            blue: {
                low: '#f0f9ff',
                medium: '#7dd3fc',
                high: '#0ea5e9',
                max: '#0284c7'
            },
            purple: {
                low: '#faf5ff',
                medium: '#c4b5fd',
                high: '#8b5cf6',
                max: '#7c3aed'
            }
        };
        
        const colors = schemes[colorScheme] || schemes.green;
        
        if (intensity === 0) return colors.low;
        if (intensity < 0.3) return colors.medium;
        if (intensity < 0.7) return colors.high;
        return colors.max;
    }

    /**
     * Calculate statistical insights from posts data
     */
    calculateInsights(posts) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        const insights = {
            total: posts.length,
            today: posts.filter(p => new Date(p.publishedTime) >= today).length,
            yesterday: posts.filter(p => {
                const date = new Date(p.publishedTime);
                return date >= yesterday && date < today;
            }).length,
            thisWeek: posts.filter(p => new Date(p.publishedTime) >= weekAgo).length,
            thisMonth: posts.filter(p => new Date(p.publishedTime) >= monthAgo).length,
            
            // Category distribution
            categories: this.getCategoryDistribution(posts),
            
            // Top authors
            topAuthors: this.getTopAuthors(posts, 10),
            
            // CVE mentions
            cveCount: this.getCVECount(posts),
            
            // Peak hours
            peakHours: this.getPeakHours(posts),
            
            // Growth trends
            trends: this.calculateTrends(posts)
        };
        
        return insights;
    }

    /**
     * Get category distribution
     */
    getCategoryDistribution(posts) {
        const distribution = {};
        
        posts.forEach(post => {
            const category = post.sourceCategory || 'Uncategorized';
            distribution[category] = (distribution[category] || 0) + 1;
        });
        
        return Object.entries(distribution)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get top authors
     */
    getTopAuthors(posts, limit = 10) {
        const authors = {};
        
        posts.forEach(post => {
            if (post.author) {
                authors[post.author] = (authors[post.author] || 0) + 1;
            }
        });
        
        return Object.entries(authors)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Count CVE mentions
     */
    getCVECount(posts) {
        const cves = new Set();
        
        posts.forEach(post => {
            if (post.cveIds) {
                post.cveIds.forEach(cve => cves.add(cve));
            }
        });
        
        return cves.size;
    }

    /**
     * Get peak posting hours
     */
    getPeakHours(posts) {
        const hours = new Array(24).fill(0);
        
        posts.forEach(post => {
            const hour = new Date(post.publishedTime).getHours();
            hours[hour]++;
        });
        
        const maxCount = Math.max(...hours);
        const peakHour = hours.indexOf(maxCount);
        
        return {
            peakHour,
            peakCount: maxCount,
            distribution: hours
        };
    }

    /**
     * Calculate growth trends
     */
    calculateTrends(posts) {
        const now = new Date();
        const periods = [
            { name: 'today', days: 1 },
            { name: 'week', days: 7 },
            { name: 'month', days: 30 }
        ];
        
        const trends = {};
        
        periods.forEach(period => {
            const currentPeriod = new Date(now);
            currentPeriod.setDate(currentPeriod.getDate() - period.days);
            
            const previousPeriod = new Date(currentPeriod);
            previousPeriod.setDate(previousPeriod.getDate() - period.days);
            
            const currentCount = posts.filter(p => 
                new Date(p.publishedTime) >= currentPeriod
            ).length;
            
            const previousCount = posts.filter(p => {
                const date = new Date(p.publishedTime);
                return date >= previousPeriod && date < currentPeriod;
            }).length;
            
            const change = previousCount > 0 ? 
                ((currentCount - previousCount) / previousCount) * 100 : 0;
            
            trends[period.name] = {
                current: currentCount,
                previous: previousCount,
                change: Math.round(change * 10) / 10
            };
        });
        
        return trends;
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        this.charts.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts.clear();
    }

    /**
     * Destroy specific chart
     */
    destroyChart(id) {
        const chart = this.charts.get(id);
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
            this.charts.delete(id);
        }
    }

    /**
     * Update chart theme (for dark/light mode)
     */
    updateChartTheme(isDark) {
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? '#374151' : 'rgba(107, 114, 128, 0.1)';
        
        this.charts.forEach(chart => {
            if (chart.options.plugins?.legend?.labels) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            
            if (chart.options.scales) {
                Object.keys(chart.options.scales).forEach(scaleKey => {
                    const scale = chart.options.scales[scaleKey];
                    if (scale.ticks) scale.ticks.color = textColor;
                    if (scale.grid) scale.grid.color = gridColor;
                });
            }
            
            chart.update();
        });
    }
}