#!/usr/bin/env node

/**
 * RSS Feed Processor for Medium Cybersecurity Dashboard
 * Fetches, processes, and enriches RSS feeds with advanced analytics
 */

import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import { Feed } from 'feed';

// Configuration
const CONFIG = {
  rssFeeds: [
    // Core Security (Priority 1)
    { url: 'https://medium.com/feed/tag/cybersecurity', category: 'Core Security', priority: 1 },
    { url: 'https://medium.com/feed/tag/information-security', category: 'Core Security', priority: 1 },
    { url: 'https://medium.com/feed/tag/infosec', category: 'Core Security', priority: 1 },
    { url: 'https://medium.com/feed/tag/security', category: 'Core Security', priority: 1 },
    
    // Bug Bounty (Priority 2)
    { url: 'https://medium.com/feed/tag/bug-bounty', category: 'Bug Bounty', priority: 2 },
    { url: 'https://medium.com/feed/tag/bug-bounty-tips', category: 'Bug Bounty', priority: 2 },
    { url: 'https://medium.com/feed/tag/bug-bounty-writeup', category: 'Bug Bounty', priority: 2 },
    { url: 'https://medium.com/feed/tag/ethical-hacking', category: 'Bug Bounty', priority: 2 },
    
    // Web Security (Priority 3)
    { url: 'https://medium.com/feed/tag/web-security', category: 'Web Security', priority: 3 },
    { url: 'https://medium.com/feed/tag/application-security', category: 'Web Security', priority: 3 },
    { url: 'https://medium.com/feed/tag/xss', category: 'Web Security', priority: 3 },
    { url: 'https://medium.com/feed/tag/sql-injection', category: 'Web Security', priority: 3 },
    
    // Penetration Testing (Priority 4)
    { url: 'https://medium.com/feed/tag/penetration-testing', category: 'Penetration Testing', priority: 4 },
    { url: 'https://medium.com/feed/tag/pentesting', category: 'Penetration Testing', priority: 4 },
    { url: 'https://medium.com/feed/tag/red-team', category: 'Penetration Testing', priority: 4 },
    
    // Tools & OSINT (Priority 5)
    { url: 'https://medium.com/feed/tag/cybersecurity-tools', category: 'Tools & OSINT', priority: 5 },
    { url: 'https://medium.com/feed/tag/osint', category: 'Tools & OSINT', priority: 5 },
    { url: 'https://medium.com/feed/tag/reconnaissance', category: 'Tools & OSINT', priority: 5 },
    
    // Malware & Threats (Priority 6)
    { url: 'https://medium.com/feed/tag/malware-analysis', category: 'Malware & Threats', priority: 6 },
    { url: 'https://medium.com/feed/tag/threat-intelligence', category: 'Malware & Threats', priority: 6 },
    { url: 'https://medium.com/feed/tag/ransomware', category: 'Malware & Threats', priority: 6 },
  ],
  
  outputDir: './data',
  requestDelay: 3000, // 3 seconds between requests
  timeout: 30000, // 30 second timeout
  maxRetries: 3,
  userAgent: 'Mozilla/5.0 (compatible; MediumCyberBot/4.0; +https://github.com/kdairatchi/medium-writeups)',
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sanitizeTitle = (title) => {
  if (!title) return '';
  return title
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
};

const extractCVEs = (text) => {
  if (!text) return [];
  const cveRegex = /CVE-\d{4}-\d{4,}/gi;
  return [...new Set(text.match(cveRegex) || [])];
};

const calculateAgeHours = (pubDate) => {
  try {
    const postDate = new Date(pubDate);
    const now = new Date();
    return Math.floor((now - postDate) / (1000 * 60 * 60));
  } catch {
    return 0;
  }
};

const categorizeByContent = (title, description, tags) => {
  const content = `${title} ${description} ${tags?.join(' ') || ''}`.toLowerCase();
  
  const categories = [];
  
  // Vulnerability types
  if (/xss|cross.site.script/i.test(content)) categories.push('XSS');
  if (/sql.injection|sqli/i.test(content)) categories.push('SQLi');
  if (/rce|remote.code.execution/i.test(content)) categories.push('RCE');
  if (/lfi|local.file.inclusion/i.test(content)) categories.push('LFI');
  if (/ssrf|server.side.request.forgery/i.test(content)) categories.push('SSRF');
  if (/idor|insecure.direct.object/i.test(content)) categories.push('IDOR');
  
  // Security areas
  if (/api.security|rest.api|graphql/i.test(content)) categories.push('API Security');
  if (/mobile.security|android|ios/i.test(content)) categories.push('Mobile Security');
  if (/cloud.security|aws|azure|gcp/i.test(content)) categories.push('Cloud Security');
  if (/malware|threat.hunting|apt/i.test(content)) categories.push('Threat Analysis');
  
  return categories;
};

// Main RSS fetcher class
class RSSProcessor {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      ignoreNameSpace: false,
      parseAttributeValue: true,
      parseTagValue: true,
    });
    
    this.stats = {
      totalFeeds: 0,
      successfulFeeds: 0,
      failedFeeds: 0,
      totalPosts: 0,
      newPosts: 0,
      todayPosts: 0,
      thisWeekPosts: 0,
      processingTime: 0,
      errors: [],
    };
    
    this.allPosts = new Map(); // Use Map to deduplicate by GUID/link
  }

  async fetchFeed(feedConfig, retryCount = 0) {
    try {
      console.log(`📡 Fetching: ${feedConfig.category} (${feedConfig.url})`);
      
      const response = await fetch(feedConfig.url, {
        headers: {
          'User-Agent': CONFIG.userAgent,
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        timeout: CONFIG.timeout,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlData = await response.text();
      const parsed = this.parser.parse(xmlData);
      
      return this.processFeedData(parsed, feedConfig);
      
    } catch (error) {
      if (retryCount < CONFIG.maxRetries) {
        console.log(`⚠️  Retry ${retryCount + 1}/${CONFIG.maxRetries} for ${feedConfig.category}: ${error.message}`);
        await delay(CONFIG.requestDelay * (retryCount + 1));
        return this.fetchFeed(feedConfig, retryCount + 1);
      }
      
      console.error(`❌ Failed to fetch ${feedConfig.category}: ${error.message}`);
      this.stats.errors.push({
        feed: feedConfig.category,
        url: feedConfig.url,
        error: error.message,
      });
      this.stats.failedFeeds++;
      return [];
    }
  }

  processFeedData(parsed, feedConfig) {
    try {
      const channel = parsed.rss?.channel || parsed.feed || parsed;
      const items = channel.item || channel.entry || [];
      
      if (!Array.isArray(items)) {
        return items ? [items] : [];
      }

      const posts = items.map(item => this.processPost(item, feedConfig)).filter(Boolean);
      console.log(`✅ ${feedConfig.category}: ${posts.length} posts processed`);
      
      this.stats.successfulFeeds++;
      return posts;
      
    } catch (error) {
      console.error(`❌ Error processing feed data for ${feedConfig.category}:`, error.message);
      this.stats.failedFeeds++;
      return [];
    }
  }

  processPost(item, feedConfig) {
    try {
      const guid = item.guid || item.id || item.link;
      const link = item.link || item.guid || '';
      const title = sanitizeTitle(item.title || '');
      const description = item.description || item.summary || item.content || '';
      const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();
      const author = item.author || item['dc:creator'] || '';
      const categories = item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [];

      if (!title || !guid) {
        return null;
      }

      // Calculate enrichment data
      const ageHours = calculateAgeHours(pubDate);
      const isNew = ageHours <= 24;
      const isToday = ageHours <= 24;
      const isThisWeek = ageHours <= (7 * 24);
      
      const cveIds = extractCVEs(`${title} ${description}`);
      const autoCategories = categorizeByContent(title, description, categories);
      
      const post = {
        guid,
        title,
        link,
        description: description.substring(0, 500),
        pubDate,
        publishedTime: new Date(pubDate).toISOString(),
        author,
        categories: [...categories, ...autoCategories],
        sourceFeed: feedConfig.url,
        sourceCategory: feedConfig.category,
        priority: feedConfig.priority,
        
        // Enrichment data
        ageHours,
        isNew,
        isToday,
        isThisWeek,
        cveIds,
        
        // Metadata
        createdAt: new Date().toISOString(),
        language: 'en', // Could be enhanced with language detection
      };

      // Deduplicate by creating a unique key
      const uniqueKey = `${guid}-${link}`;
      
      if (!this.allPosts.has(uniqueKey)) {
        this.allPosts.set(uniqueKey, post);
        this.stats.totalPosts++;
        
        if (isNew) this.stats.newPosts++;
        if (isToday) this.stats.todayPosts++;
        if (isThisWeek) this.stats.thisWeekPosts++;
      }

      return post;
      
    } catch (error) {
      console.error('Error processing post:', error.message);
      return null;
    }
  }

  async processAllFeeds() {
    console.log('🚀 Starting RSS feed processing...');
    const startTime = Date.now();
    
    this.stats.totalFeeds = CONFIG.rssFeeds.length;
    
    // Process feeds with rate limiting
    for (const feedConfig of CONFIG.rssFeeds) {
      await this.fetchFeed(feedConfig);
      await delay(CONFIG.requestDelay);
    }
    
    this.stats.processingTime = Date.now() - startTime;
    
    // Convert Map to Array and sort by priority and date
    const sortedPosts = Array.from(this.allPosts.values()).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.isNew !== b.isNew) return b.isNew - a.isNew;
      return new Date(b.publishedTime) - new Date(a.publishedTime);
    });

    return sortedPosts;
  }

  async saveData(posts) {
    try {
      // Ensure output directory exists
      await fs.mkdir(CONFIG.outputDir, { recursive: true });

      // Generate summary
      const summary = {
        lastUpdated: new Date().toISOString(),
        stats: this.stats,
        totalPosts: posts.length,
        newPosts: posts.filter(p => p.isNew).length,
        todayPosts: posts.filter(p => p.isToday).length,
        thisWeekPosts: posts.filter(p => p.isThisWeek).length,
        categories: this.generateCategoryStats(posts),
        trendingTopics: this.generateTrendingTopics(posts),
        recentCVEs: this.extractRecentCVEs(posts),
      };

      // Save main posts file
      await fs.writeFile(
        path.join(CONFIG.outputDir, 'posts.json'),
        JSON.stringify(posts, null, 2)
      );

      // Save summary
      await fs.writeFile(
        path.join(CONFIG.outputDir, 'summary.json'),
        JSON.stringify(summary, null, 2)
      );

      // Generate paginated chunks for better performance
      const chunkSize = 50;
      for (let i = 0; i < posts.length; i += chunkSize) {
        const chunk = posts.slice(i, i + chunkSize);
        const chunkNumber = Math.floor(i / chunkSize) + 1;
        
        await fs.writeFile(
          path.join(CONFIG.outputDir, `posts-${chunkNumber}.json`),
          JSON.stringify(chunk, null, 2)
        );
      }

      // Generate RSS feed for latest posts
      await this.generateRSSFeed(posts.slice(0, 50));

      console.log('💾 Data saved successfully');
      console.log(`📊 Total posts: ${posts.length}`);
      console.log(`🆕 New posts: ${summary.newPosts}`);
      console.log(`📅 Today's posts: ${summary.todayPosts}`);
      
    } catch (error) {
      console.error('❌ Error saving data:', error);
      throw error;
    }
  }

  generateCategoryStats(posts) {
    const stats = {};
    
    posts.forEach(post => {
      const category = post.sourceCategory;
      if (!stats[category]) {
        stats[category] = { total: 0, new: 0, today: 0, thisWeek: 0 };
      }
      
      stats[category].total++;
      if (post.isNew) stats[category].new++;
      if (post.isToday) stats[category].today++;
      if (post.isThisWeek) stats[category].thisWeek++;
    });
    
    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }

  generateTrendingTopics(posts) {
    const topics = {};
    
    posts.forEach(post => {
      post.categories.forEach(category => {
        const key = category.toLowerCase();
        topics[key] = (topics[key] || 0) + 1;
      });
    });
    
    return Object.entries(topics)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  extractRecentCVEs(posts) {
    const cves = new Set();
    
    posts
      .filter(post => post.isThisWeek)
      .forEach(post => {
        post.cveIds.forEach(cve => cves.add(cve));
      });
    
    return Array.from(cves).sort();
  }

  async generateRSSFeed(posts) {
    try {
      const feed = new Feed({
        title: 'Medium Cybersecurity Posts',
        description: 'Latest cybersecurity posts aggregated from Medium',
        id: 'https://kdairatchi.github.io/medium-writeups/',
        link: 'https://kdairatchi.github.io/medium-writeups/',
        language: 'en',
        image: 'https://kdairatchi.github.io/medium-writeups/icon.png',
        favicon: 'https://kdairatchi.github.io/medium-writeups/favicon.ico',
        copyright: 'All rights reserved to original authors',
        updated: new Date(),
        generator: 'Medium Cybersecurity RSS Aggregator v4.0',
        feedLinks: {
          rss: 'https://kdairatchi.github.io/medium-writeups/data/feed.rss'
        },
      });

      posts.slice(0, 50).forEach(post => {
        feed.addItem({
          title: post.title,
          id: post.guid,
          link: post.link,
          description: post.description,
          content: post.description,
          author: [{
            name: post.author || 'Unknown Author',
          }],
          date: new Date(post.publishedTime),
          category: post.categories.map(cat => ({ name: cat })),
        });
      });

      await fs.writeFile(
        path.join(CONFIG.outputDir, 'feed.rss'),
        feed.rss2()
      );

      await fs.writeFile(
        path.join(CONFIG.outputDir, 'feed.json'),
        feed.json1()
      );

      console.log('📡 RSS feeds generated');
      
    } catch (error) {
      console.error('❌ Error generating RSS feed:', error);
    }
  }

  printStats() {
    console.log('\n📊 Processing Summary:');
    console.log(`⏱️  Processing time: ${(this.stats.processingTime / 1000).toFixed(1)}s`);
    console.log(`📡 Feeds processed: ${this.stats.successfulFeeds}/${this.stats.totalFeeds}`);
    console.log(`✅ Success rate: ${((this.stats.successfulFeeds / this.stats.totalFeeds) * 100).toFixed(1)}%`);
    console.log(`📄 Total posts: ${this.stats.totalPosts}`);
    console.log(`🆕 New posts: ${this.stats.newPosts}`);
    console.log(`📅 Today's posts: ${this.stats.todayPosts}`);
    console.log(`📈 This week's posts: ${this.stats.thisWeekPosts}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      this.stats.errors.forEach(error => {
        console.log(`   ${error.feed}: ${error.error}`);
      });
    }
  }
}

// Main execution
async function main() {
  try {
    const processor = new RSSProcessor();
    const posts = await processor.processAllFeeds();
    await processor.saveData(posts);
    processor.printStats();
    
    console.log('\n✅ RSS processing completed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { RSSProcessor, CONFIG };