package main

import (
	"encoding/xml"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
)

// ================================================================================
// CONSTANTS & CONFIGURATION
// ================================================================================

const (
	// Application settings
	appName           = "Medium Cybersecurity RSS Aggregator"
	appVersion        = "v2.0.0"
	maxTitleLength    = 80
	requestDelay      = 2 * time.Second
	requestTimeout    = 30 * time.Second
	
	// Date formats
	dateFormat        = "Mon, 02 Jan 2006"
	displayTimeFormat = "02 Jan 15:04"
	
	// File settings
	readmeFilename    = "README.md"
	logFilename       = "aggregator.log"
	
	// Output formatting
	separator         = "═══════════════════════════════════════════════════════════════════════════════"
	subSeparator      = "───────────────────────────────────────────────────────────────────────────────"
	
	// Colors for terminal output (ANSI codes)
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorPurple = "\033[35m"
	colorCyan   = "\033[36m"
	colorWhite  = "\033[37m"
	colorBold   = "\033[1m"
)

// ================================================================================
// DATA STRUCTURES
// ================================================================================

// RSS represents the root RSS structure
type RSS struct {
	XMLName xml.Name `xml:"rss"`
	Channel Channel  `xml:"channel"`
}

// Channel represents the RSS channel
type Channel struct {
	Title       string `xml:"title"`
	Description string `xml:"description"`
	Items       []Item `xml:"item"`
}

// Item represents an individual RSS item
type Item struct {
	Title       string `xml:"title"`
	GUID        string `xml:"guid"`
	PubDate     string `xml:"pubDate"`
	Description string `xml:"description"`
	Link        string `xml:"link"`
	Author      string `xml:"author"`
}

// FeedEntry represents a processed RSS entry with metadata
type FeedEntry struct {
	Title       string
	GUID        string
	PubDate     string
	ParsedTime  time.Time
	Feeds       []string
	FeedNames   []string
	IsNew       bool
	IsToday     bool
	Description string
	Author      string
}

// FeedSource represents an RSS feed source configuration
type FeedSource struct {
	URL         string
	Name        string
	Category    string
	Priority    int
	Active      bool
}

// AggregatorStats holds statistics about the aggregation process
type AggregatorStats struct {
	TotalFeeds     int
	SuccessfulFeeds int
	FailedFeeds    int
	TotalEntries   int
	NewEntries     int
	TodayEntries   int
	ProcessingTime time.Duration
	StartTime      time.Time
}

// ================================================================================
// MAIN APPLICATION
// ================================================================================

func main() {
	startTime := time.Now()
	
	printHeader()
	
	// Initialize components
	feedSources := getFeedSources()
	readmeContent := readREADME()
	currentDate := getCurrentDateGMT()
	
	stats := &AggregatorStats{
		TotalFeeds: len(feedSources),
		StartTime:  startTime,
	}
	
	printProcessingInfo(currentDate, len(feedSources))
	
	// Process feeds
	entries := processFeeds(feedSources, readmeContent, currentDate, stats)
	
	if len(entries) == 0 {
		printError("No entries found or all feeds failed to fetch")
		return
	}
	
	// Sort and generate output
	sortedEntries := sortEntries(entries)
	updateStats(stats, sortedEntries, time.Since(startTime))
	
	generateMarkdownOutput(sortedEntries)
	printSummary(stats)
	
	printFooter()
}

// ================================================================================
// FEED SOURCES CONFIGURATION
// ================================================================================

func getFeedSources() []FeedSource {
	// Core cybersecurity feeds (high priority)
	coreFeeds := []string{
		"https://medium.com/feed/tag/cybersecurity",
		"https://medium.com/feed/tag/bug-bounty",
		"https://medium.com/feed/tag/security",
		"https://medium.com/feed/tag/ethical-hacking",
		"https://medium.com/feed/tag/penetration-testing",
		"https://medium.com/feed/tag/vulnerability",
		"https://medium.com/feed/tag/infosec",
		"https://medium.com/feed/tag/hacking",
	}
	
	// Bug bounty specific feeds
	bugBountyFeeds := []string{
		"https://medium.com/feed/tag/bug-bounty-tips",
		"https://medium.com/feed/tag/bug-bounty-writeup",
		"https://medium.com/feed/tag/bugbounty-writeup",
		"https://medium.com/feed/tag/bug-bounty-hunter",
		"https://medium.com/feed/tag/bug-bounty-program",
		"https://medium.com/feed/tag/hackerone",
		"https://medium.com/feed/tag/bugcrowd",
		"https://medium.com/feed/tag/bounty-program",
		"https://medium.com/feed/tag/bounties",
	}
	
	// Technical security feeds
	technicalFeeds := []string{
		"https://medium.com/feed/tag/web-security",
		"https://medium.com/feed/tag/application-security",
		"https://medium.com/feed/tag/api-security",
		"https://medium.com/feed/tag/xss-attack",
		"https://medium.com/feed/tag/cross-site-scripting",
		"https://medium.com/feed/tag/ssrf",
		"https://medium.com/feed/tag/idor",
		"https://medium.com/feed/tag/rce",
		"https://medium.com/feed/tag/remote-code-execution",
		"https://medium.com/feed/tag/local-file-inclusion",
		"https://medium.com/feed/tag/lfi",
		"https://medium.com/feed/tag/file-upload",
		"https://medium.com/feed/tag/subdomain-takeover",
		"https://medium.com/feed/tag/subdomain-enumeration",
	}
	
	// Tools and methodology feeds
	toolsFeeds := []string{
		"https://medium.com/feed/tag/cybersecurity-tools",
		"https://medium.com/feed/tag/recon",
		"https://medium.com/feed/tag/dorking",
		"https://medium.com/feed/tag/google-dorking",
		"https://medium.com/feed/tag/google-dork",
		"https://medium.com/feed/tag/dorks",
		"https://medium.com/feed/tag/github-dorking",
		"https://medium.com/feed/tag/shodan",
		"https://medium.com/feed/tag/censys",
		"https://medium.com/feed/tag/nmap",
		"https://medium.com/feed/tag/burp-suite",
		"https://medium.com/feed/tag/metasploit",
	}
	
	// Cloud and modern security feeds
	cloudFeeds := []string{
		"https://medium.com/feed/tag/cloud-security",
		"https://medium.com/feed/tag/aws-security",
		"https://medium.com/feed/tag/azure-security",
		"https://medium.com/feed/tag/gcp-security",
		"https://medium.com/feed/tag/kubernetes-security",
		"https://medium.com/feed/tag/docker-security",
		"https://medium.com/feed/tag/container-security",
		"https://medium.com/feed/tag/devsecops",
	}
	
	// Research and analysis feeds
	researchFeeds := []string{
		"https://medium.com/feed/tag/security-research",
		"https://medium.com/feed/tag/malware-analysis",
		"https://medium.com/feed/tag/reverse-engineering",
		"https://medium.com/feed/tag/threat-intelligence",
		"https://medium.com/feed/tag/threat-hunting",
		"https://medium.com/feed/tag/digital-forensics",
		"https://medium.com/feed/tag/incident-response",
		"https://medium.com/feed/tag/cve",
		"https://medium.com/feed/tag/zero-day",
		"https://medium.com/feed/tag/apt",
	}
	
	var sources []FeedSource
	
	// Add feeds with categories and priorities
	addFeedsWithCategory(&sources, coreFeeds, "Core Security", 1)
	addFeedsWithCategory(&sources, bugBountyFeeds, "Bug Bounty", 2)
	addFeedsWithCategory(&sources, technicalFeeds, "Technical", 3)
	addFeedsWithCategory(&sources, toolsFeeds, "Tools & Methods", 4)
	addFeedsWithCategory(&sources, cloudFeeds, "Cloud Security", 5)
	addFeedsWithCategory(&sources, researchFeeds, "Research", 6)
	
	return sources
}

func addFeedsWithCategory(sources *[]FeedSource, urls []string, category string, priority int) {
	for _, url := range urls {
		*sources = append(*sources, FeedSource{
			URL:      url,
			Name:     extractFeedName(url),
			Category: category,
			Priority: priority,
			Active:   true,
		})
	}
}

// ================================================================================
// CORE PROCESSING FUNCTIONS
// ================================================================================

func processFeeds(sources []FeedSource, readmeContent, currentDate string, stats *AggregatorStats) map[string]*FeedEntry {
	entries := make(map[string]*FeedEntry)
	
	printInfo(fmt.Sprintf("🔄 Processing %d RSS feeds...", len(sources)))
	fmt.Println(subSeparator)
	
	for i, source := range sources {
		if !source.Active {
			continue
		}
		
		progress := fmt.Sprintf("[%d/%d]", i+1, len(sources))
		fmt.Printf("%-8s %-15s %s", progress, source.Category, source.Name)
		
		rss, err := fetchRSSFeed(source.URL)
		if err != nil {
			fmt.Printf(" %s❌ Failed: %s%s\n", colorRed, err.Error(), colorReset)
			stats.FailedFeeds++
			continue
		}
		
		itemsProcessed := processFeedItems(rss, source, entries, readmeContent, currentDate)
		fmt.Printf(" %s✅ %d items%s\n", colorGreen, itemsProcessed, colorReset)
		stats.SuccessfulFeeds++
		
		// Rate limiting
		if i < len(sources)-1 {
			time.Sleep(requestDelay)
		}
	}
	
	fmt.Println(subSeparator)
	printSuccess(fmt.Sprintf("Successfully processed %d/%d feeds", stats.SuccessfulFeeds, len(sources)))
	
	return entries
}

func fetchRSSFeed(url string) (*RSS, error) {
	client := &http.Client{Timeout: requestTimeout}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("network error")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read error")
	}

	var rss RSS
	err = xml.Unmarshal(data, &rss)
	if err != nil {
		return nil, fmt.Errorf("parse error")
	}

	return &rss, nil
}

func processFeedItems(rss *RSS, source FeedSource, entries map[string]*FeedEntry, readmeContent, currentDate string) int {
	itemsProcessed := 0
	
	for _, item := range rss.Channel.Items {
		if entry, exists := entries[item.GUID]; exists {
			// Append to existing entry
			entry.Feeds = append(entry.Feeds, source.URL)
			entry.FeedNames = append(entry.FeedNames, source.Name)
		} else {
			// Parse publication date
			parsedTime, _ := parsePublicationDate(item.PubDate)
			
			// Create new entry
			entries[item.GUID] = &FeedEntry{
				Title:       item.Title,
				GUID:        item.GUID,
				PubDate:     item.PubDate,
				ParsedTime:  parsedTime,
				Feeds:       []string{source.URL},
				FeedNames:   []string{source.Name},
				IsNew:       !strings.Contains(readmeContent, item.GUID),
				IsToday:     checkIfToday(item.PubDate, currentDate),
				Description: item.Description,
				Author:      item.Author,
			}
		}
		itemsProcessed++
	}
	
	return itemsProcessed
}

// ================================================================================
// OUTPUT GENERATION
// ================================================================================

func generateMarkdownOutput(entries []*FeedEntry) {
	fmt.Println()
	printInfo("📋 Generating markdown output...")
	fmt.Println()
	
	// Header
	fmt.Printf("# %s\n\n", appName)
	fmt.Printf("**Last Updated:** %s GMT  \n", getCurrentDateGMT())
	fmt.Printf("**Total Posts:** %d  \n", len(entries))
	
	newCount := countNewEntries(entries)
	todayCount := countTodayEntries(entries)
	
	fmt.Printf("**New Posts:** %d  \n", newCount)
	fmt.Printf("**Today's Posts:** %d  \n\n", todayCount)
	
	// Status badges
	fmt.Printf("![Status](https://img.shields.io/badge/Status-Active-green)  \n")
	fmt.Printf("![Posts](https://img.shields.io/badge/Posts-%d-blue)  \n", len(entries))
	fmt.Printf("![New](https://img.shields.io/badge/New-%d-orange)  \n", newCount)
	fmt.Printf("![Today](https://img.shields.io/badge/Today-%d-red)  \n\n", todayCount)
	
	// Table header
	fmt.Println("## 📰 Latest Cybersecurity Posts")
	fmt.Println()
	fmt.Println("| 🕒 Time | 📄 Title | 📡 Sources | 🆕 New | 📅 Today |")
	fmt.Println("|---------|----------|------------|--------|----------|")
	
	// Entries
	for _, entry := range entries {
		timeStr := formatDisplayTime(entry.ParsedTime)
		title := sanitizeTitle(entry.Title)
		sources := formatSources(entry.FeedNames, entry.Feeds)
		newBadge := formatBoolBadge(entry.IsNew, "🆕", "")
		todayBadge := formatBoolBadge(entry.IsToday, "📅", "")
		
		fmt.Printf("| %s | [%s](%s) | %s | %s | %s |\n",
			timeStr, title, entry.GUID, sources, newBadge, todayBadge)
	}
	
	// Footer
	fmt.Println()
	fmt.Printf("---\n")
	fmt.Printf("*Generated by %s %s*  \n", appName, appVersion)
	fmt.Printf("*🔄 Auto-updated every hour*  \n")
	fmt.Printf("*⭐ Star this repo if you find it useful!*\n")
}

func formatSources(names []string, urls []string) string {
	if len(names) == 0 {
		return ""
	}
	
	if len(names) == 1 {
		return fmt.Sprintf("[%s](%s)", names[0], urls[0])
	}
	
	// For multiple sources, show count and first source
	return fmt.Sprintf("[%s](%s) +%d", names[0], urls[0], len(names)-1)
}

func formatBoolBadge(value bool, trueText, falseText string) string {
	if value {
		return trueText
	}
	return falseText
}

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

func sortEntries(entries map[string]*FeedEntry) []*FeedEntry {
	entryList := make([]*FeedEntry, 0, len(entries))
	for _, entry := range entries {
		entryList = append(entryList, entry)
	}

	// Sort by: New posts first, then today's posts, then by time (newest first)
	sort.SliceStable(entryList, func(i, j int) bool {
		if entryList[i].IsNew != entryList[j].IsNew {
			return entryList[i].IsNew
		}
		if entryList[i].IsToday != entryList[j].IsToday {
			return entryList[i].IsToday
		}
		return entryList[i].ParsedTime.After(entryList[j].ParsedTime)
	})

	return entryList
}

func sanitizeTitle(title string) string {
	// Clean up the title
	title = strings.ReplaceAll(title, "\n", " ")
	title = strings.ReplaceAll(title, "\r", " ")
	title = strings.ReplaceAll(title, "\t", " ")
	
	// Escape markdown characters
	title = strings.ReplaceAll(title, "|", "\\|")
	title = strings.ReplaceAll(title, "[", "\\[")
	title = strings.ReplaceAll(title, "]", "\\]")
	title = strings.ReplaceAll(title, "*", "\\*")
	title = strings.ReplaceAll(title, "_", "\\_")
	
	// Remove extra spaces
	title = strings.Join(strings.Fields(title), " ")
	
	// Truncate if too long
	if len(title) > maxTitleLength {
		title = title[:maxTitleLength-3] + "..."
	}
	
	return title
}

func extractFeedName(url string) string {
	parts := strings.Split(url, "/")
	tag := parts[len(parts)-1]
	
	// Convert tag to readable name
	name := strings.ReplaceAll(tag, "-", " ")
	name = strings.Title(name)
	
	return name
}

func parsePublicationDate(pubDate string) (time.Time, error) {
	// Try different date formats
	formats := []string{
		time.RFC1123,
		time.RFC1123Z,
		time.RFC822,
		time.RFC822Z,
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
	}
	
	for _, format := range formats {
		if t, err := time.Parse(format, pubDate); err == nil {
			return t, nil
		}
	}
	
	return time.Time{}, fmt.Errorf("unable to parse date: %s", pubDate)
}

func formatDisplayTime(t time.Time) string {
	if t.IsZero() {
		return "Unknown"
	}
	return t.Format(displayTimeFormat)
}

func checkIfToday(pubDate, currentDate string) bool {
	pubTime, err := parsePublicationDate(pubDate)
	if err != nil {
		return false
	}
	
	pubDateFormatted := pubTime.Format(dateFormat)
	return pubDateFormatted == currentDate
}

func getCurrentDateGMT() string {
	return time.Now().In(time.UTC).Format(dateFormat)
}

func readREADME() string {
	content, err := ioutil.ReadFile(readmeFilename)
	if err != nil && !os.IsNotExist(err) {
		printWarning(fmt.Sprintf("Error reading %s: %v", readmeFilename, err))
		return ""
	}
	return string(content)
}

// ================================================================================
// STATISTICS AND SUMMARY
// ================================================================================

func updateStats(stats *AggregatorStats, entries []*FeedEntry, duration time.Duration) {
	stats.TotalEntries = len(entries)
	stats.ProcessingTime = duration
	
	for _, entry := range entries {
		if entry.IsNew {
			stats.NewEntries++
		}
		if entry.IsToday {
			stats.TodayEntries++
		}
	}
}

func countNewEntries(entries []*FeedEntry) int {
	count := 0
	for _, entry := range entries {
		if entry.IsNew {
			count++
		}
	}
	return count
}

func countTodayEntries(entries []*FeedEntry) int {
	count := 0
	for _, entry := range entries {
		if entry.IsToday {
			count++
		}
	}
	return count
}

// ================================================================================
// DISPLAY FUNCTIONS
// ================================================================================

func printHeader() {
	fmt.Println(colorBold + colorCyan + separator + colorReset)
	fmt.Printf("%s%s🛡️  %s %s%s\n", colorBold, colorCyan, appName, appVersion, colorReset)
	fmt.Printf("%s%s🔗 Medium Cybersecurity RSS Feed Aggregator%s\n", colorBold, colorWhite, colorReset)
	fmt.Println(colorCyan + separator + colorReset)
}

func printProcessingInfo(currentDate string, feedCount int) {
	fmt.Printf("📅 Current GMT Date: %s%s%s\n", colorYellow, currentDate, colorReset)
	fmt.Printf("📊 Processing %s%d%s RSS feeds\n", colorBlue, feedCount, colorReset)
	fmt.Printf("⏱️  Request delay: %s%v%s\n", colorPurple, requestDelay, colorReset)
	fmt.Println(subSeparator)
}

func printSummary(stats *AggregatorStats) {
	fmt.Println()
	fmt.Println(colorBold + colorGreen + "📊 PROCESSING SUMMARY" + colorReset)
	fmt.Println(subSeparator)
	fmt.Printf("🕒 Processing Time: %s%v%s\n", colorBlue, stats.ProcessingTime.Round(time.Second), colorReset)
	fmt.Printf("📡 Feeds Processed: %s%d/%d%s (%s%.1f%%%s success rate)\n", 
		colorGreen, stats.SuccessfulFeeds, stats.TotalFeeds, colorReset,
		colorYellow, float64(stats.SuccessfulFeeds)/float64(stats.TotalFeeds)*100, colorReset)
	fmt.Printf("📄 Total Entries: %s%d%s\n", colorBlue, stats.TotalEntries, colorReset)
	fmt.Printf("🆕 New Entries: %s%d%s\n", colorGreen, stats.NewEntries, colorReset)
	fmt.Printf("📅 Today's Entries: %s%d%s\n", colorYellow, stats.TodayEntries, colorReset)
}

func printFooter() {
	fmt.Println()
	fmt.Println(colorCyan + separator + colorReset)
	fmt.Printf("%s%s✅ Processing completed successfully!%s\n", colorBold, colorGreen, colorReset)
	fmt.Printf("%s%s🚀 Check the generated output above%s\n", colorBold, colorWhite, colorReset)
	fmt.Println(colorCyan + separator + colorReset)
}

func printInfo(message string) {
	fmt.Printf("%s%sℹ️  %s%s\n", colorBold, colorBlue, message, colorReset)
}

func printSuccess(message string) {
	fmt.Printf("%s%s✅ %s%s\n", colorBold, colorGreen, message, colorReset)
}

func printWarning(message string) {
	fmt.Printf("%s%s⚠️  %s%s\n", colorBold, colorYellow, message, colorReset)
}

func printError(message string) {
	fmt.Printf("%s%s❌ %s%s\n", colorBold, colorRed, message, colorReset)
}
