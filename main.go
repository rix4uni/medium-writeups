package main

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

// ================================================================================
// CONSTANTS & CONFIGURATION
// ================================================================================

const (
	// Application settings
	appName        = "Medium Cybersecurity RSS Aggregator"
	appVersion     = "v3.0.0"
	maxTitleLength = 85
	requestTimeout = 45 * time.Second

	// Date formats
	dateFormat        = "Mon, 02 Jan 2006"
	displayTimeFormat = "02 Jan 15:04"
	isoDateFormat     = "2006-01-02T15:04:05Z"

	// File settings
	readmeFilename = "README.md"
	indexFilename  = "index.html"

	// Output formatting
	separator    = "═══════════════════════════════════════════════════════════════════════════════"
	subSeparator = "───────────────────────────────────────────────────────────────────────────────"

	// Data directory
	dataDirectory = "data"

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

// Environment variables for configuration
var (
	maxFeeds     = getEnvInt("MAX_FEEDS", 0) // 0 means no limit
	requestDelay = getEnvDuration("RATE_LIMIT_DELAY", 3) * time.Second
	debugMode    = getEnvBool("DEBUG_MODE", false)
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
	Title       string   `xml:"title"`
	GUID        string   `xml:"guid"`
	PubDate     string   `xml:"pubDate"`
	Description string   `xml:"description"`
	Link        string   `xml:"link"`
	Author      string   `xml:"author"`
	Categories  []string `xml:"category"`
}

// FeedEntry represents a processed RSS entry with metadata
type FeedEntry struct {
	Title       string
	GUID        string
	PubDate     string
	ParsedTime  time.Time
	Feeds       []string
	FeedNames   []string
	Categories  []string
	IsNew       bool
	IsToday     bool
	IsThisWeek  bool
	Description string
	Author      string
	Priority    int
}

// FeedSource represents an RSS feed source configuration
type FeedSource struct {
	URL      string
	Name     string
	Category string
	Priority int
	Active   bool
	Color    string
}

// AggregatorStats holds statistics about the aggregation process
type AggregatorStats struct {
	TotalFeeds      int
	SuccessfulFeeds int
	FailedFeeds     int
	TotalEntries    int
	NewEntries      int
	TodayEntries    int
	WeekEntries     int
	ProcessingTime  time.Duration
	StartTime       time.Time
	RateLimited     int
}

// CategoryStats represents statistics for each category
type CategoryStats struct {
	Name       string
	TotalPosts int
	NewPosts   int
	TodayPosts int
	Color      string
}

// TrendingTopic represents a frequently mentioned keyword or category
type TrendingTopic struct {
	Name  string
	Count int
}

// ================================================================================
// ENVIRONMENT VARIABLE HELPERS
// ================================================================================

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultSeconds int) time.Duration {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return time.Duration(intValue)
		}
	}
	return time.Duration(defaultSeconds)
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return strings.ToLower(value) == "true"
	}
	return defaultValue
}

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

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

func extractFeedName(url string) string {
	parts := strings.Split(url, "/")
	tag := parts[len(parts)-1]

	// Convert tag to readable name with better formatting
	name := strings.ReplaceAll(tag, "-", " ")

	// Handle special cases
	replacements := map[string]string{
		"xss": "XSS", "sql": "SQL", "api": "API", "aws": "AWS", "gcp": "GCP",
		"rce": "RCE", "lfi": "LFI", "rfi": "RFI", "csrf": "CSRF", "ssrf": "SSRF",
		"idor": "IDOR", "osint": "OSINT", "siem": "SIEM", "soc": "SOC", "edr": "EDR",
		"xdr": "XDR", "iam": "IAM", "mfa": "MFA", "2fa": "2FA", "vpn": "VPN",
		"tls": "TLS", "ssl": "SSL", "pki": "PKI", "cve": "CVE", "apt": "APT",
		"ios": "iOS", "gdpr": "GDPR", "hipaa": "HIPAA", "sox": "SOX", "iso": "ISO",
		"nist": "NIST", "cis": "CIS", "dfir": "DFIR", "jwt": "JWT", "oauth": "OAuth",
		"defi": "DeFi", "nft": "NFT", "ai": "AI", "ml": "ML", "iot": "IoT",
	}

	words := strings.Fields(name)
	for i, word := range words {
		lowerWord := strings.ToLower(word)
		if replacement, exists := replacements[lowerWord]; exists {
			words[i] = replacement
		} else {
			words[i] = strings.Title(word)
		}
	}

	return strings.Join(words, " ")
}

func parsePublicationDate(pubDate string) (time.Time, error) {
	formats := []string{
		time.RFC1123, time.RFC1123Z, time.RFC822, time.RFC822Z,
		"2006-01-02T15:04:05Z", "2006-01-02T15:04:05-07:00",
		"2006-01-02T15:04:05.000Z", "Mon, 2 Jan 2006 15:04:05 MST",
		"Mon, 2 Jan 2006 15:04:05 -0700", "2006-01-02 15:04:05",
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

	now := time.Now()
	diff := now.Sub(t)

	if diff < time.Hour {
		minutes := int(diff.Minutes())
		if minutes < 1 {
			return "Just now"
		}
		return fmt.Sprintf("%dm ago", minutes)
	} else if diff < 24*time.Hour {
		hours := int(diff.Hours())
		return fmt.Sprintf("%dh ago", hours)
	} else if diff < 7*24*time.Hour {
		days := int(diff.Hours() / 24)
		return fmt.Sprintf("%dd ago", days)
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

func checkIfThisWeek(pubDate string) bool {
	pubTime, err := parsePublicationDate(pubDate)
	if err != nil {
		return false
	}

	now := time.Now()
	weekAgo := now.AddDate(0, 0, -7)

	return pubTime.After(weekAgo)
}

func sanitizeTitle(title string) string {
	title = strings.ReplaceAll(title, "\n", " ")
	title = strings.ReplaceAll(title, "\r", " ")
	title = strings.ReplaceAll(title, "\t", " ")

	title = strings.ReplaceAll(title, "|", "\\|")
	title = strings.ReplaceAll(title, "[", "\\[")
	title = strings.ReplaceAll(title, "]", "\\]")
	title = strings.ReplaceAll(title, "*", "\\*")
	title = strings.ReplaceAll(title, "_", "\\_")
	title = strings.ReplaceAll(title, "`", "\\`")
	title = strings.ReplaceAll(title, "#", "\\#")

	title = strings.Join(strings.Fields(title), " ")

	if len(title) > maxTitleLength {
		title = title[:maxTitleLength-3] + "..."
	}

	return title
}

func sanitizeHTMLTitle(title string) string {
	title = strings.ReplaceAll(title, "&", "&amp;")
	title = strings.ReplaceAll(title, "<", "&lt;")
	title = strings.ReplaceAll(title, ">", "&gt;")
	title = strings.ReplaceAll(title, "\"", "&quot;")
	title = strings.ReplaceAll(title, "'", "&#39;")

	if len(title) > maxTitleLength {
		title = title[:maxTitleLength-3] + "..."
	}

	return title
}

func sortEntries(entries map[string]*FeedEntry) []*FeedEntry {
	entryList := make([]*FeedEntry, 0, len(entries))
	for _, entry := range entries {
		entryList = append(entryList, entry)
	}

	sort.SliceStable(entryList, func(i, j int) bool {
		if entryList[i].Priority != entryList[j].Priority {
			return entryList[i].Priority < entryList[j].Priority
		}
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

// ================================================================================
// DISPLAY FUNCTIONS
// ================================================================================

func printHeader() {
	fmt.Println(colorBold + colorCyan + separator + colorReset)
	fmt.Printf("%s%s🛡️  %s %s%s\n", colorBold, colorCyan, appName, appVersion, colorReset)
	fmt.Printf("%s%s🔗 Enhanced Medium Cybersecurity RSS Feed Aggregator%s\n", colorBold, colorWhite, colorReset)
	fmt.Printf("%s%s📊 GitHub Pages Ready • Professional Dashboard • Enhanced Filtering%s\n", colorBold, colorWhite, colorReset)
	fmt.Println(colorCyan + separator + colorReset)
}

func printProcessingInfo(currentDate string, feedCount int) {
	fmt.Printf("📅 Current GMT Date: %s%s%s\n", colorYellow, currentDate, colorReset)
	fmt.Printf("📊 Processing %s%d%s RSS feeds across %s15%s categories\n", colorBlue, feedCount, colorReset, colorPurple, colorReset)
	fmt.Printf("⏱️  Request delay: %s%v%s (adaptive rate limiting)\n", colorPurple, requestDelay, colorReset)
	if maxFeeds > 0 {
		fmt.Printf("🔢 Feed limit: %s%d%s (testing mode)\n", colorYellow, maxFeeds, colorReset)
	}
	if debugMode {
		fmt.Printf("🔍 Debug mode: %sENABLED%s\n", colorYellow, colorReset)
	}
	fmt.Println(subSeparator)
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

func printSummary(stats *AggregatorStats) {
	fmt.Println()
	fmt.Println(colorBold + colorGreen + "📊 PROCESSING SUMMARY" + colorReset)
	fmt.Println(subSeparator)
	fmt.Printf("🕒 Processing Time: %s%v%s\n", colorBlue, stats.ProcessingTime.Round(time.Second), colorReset)
	fmt.Printf("📡 Feeds Processed: %s%d/%d%s (%s%.1f%%%s success rate)\n",
		colorGreen, stats.SuccessfulFeeds, stats.TotalFeeds, colorReset,
		colorYellow, float64(stats.SuccessfulFeeds)/float64(stats.TotalFeeds)*100, colorReset)

	if stats.RateLimited > 0 {
		fmt.Printf("⏳ Rate Limited: %s%d%s feeds (%.1f%%)\n",
			colorYellow, stats.RateLimited, colorReset,
			float64(stats.RateLimited)/float64(stats.TotalFeeds)*100)
	}

	fmt.Printf("📄 Total Entries: %s%d%s\n", colorBlue, stats.TotalEntries, colorReset)
	fmt.Printf("🆕 New Entries: %s%d%s (%.1f%%)\n",
		colorGreen, stats.NewEntries, colorReset,
		float64(stats.NewEntries)/float64(stats.TotalEntries)*100)
	fmt.Printf("📅 Today's Entries: %s%d%s (%.1f%%)\n",
		colorYellow, stats.TodayEntries, colorReset,
		float64(stats.TodayEntries)/float64(stats.TotalEntries)*100)
	fmt.Printf("📈 This Week's Entries: %s%d%s (%.1f%%)\n",
		colorPurple, stats.WeekEntries, colorReset,
		float64(stats.WeekEntries)/float64(stats.TotalEntries)*100)
}

func printFooter() {
	fmt.Println()
	fmt.Println(colorCyan + separator + colorReset)
	fmt.Printf("%s%s✅ Processing completed successfully!%s\n", colorBold, colorGreen, colorReset)
	fmt.Printf("%s%s🌐 GitHub Pages dashboard generated: index.html%s\n", colorBold, colorWhite, colorReset)
	fmt.Printf("%s%s📱 Mobile-responsive with search and filtering%s\n", colorBold, colorWhite, colorReset)
	fmt.Printf("%s%s🚀 Ready for deployment to GitHub Pages%s\n", colorBold, colorWhite, colorReset)
	fmt.Println(colorCyan + separator + colorReset)
}

// ================================================================================
// STATISTICS FUNCTIONS
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
		if entry.IsThisWeek {
			stats.WeekEntries++
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

func countWeekEntries(entries []*FeedEntry) int {
	count := 0
	for _, entry := range entries {
		if entry.IsThisWeek {
			count++
		}
	}
	return count
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

	// Apply feed limit if set
	if maxFeeds > 0 && len(feedSources) > maxFeeds {
		feedSources = feedSources[:maxFeeds]
		printInfo(fmt.Sprintf("🔢 Limited to %d feeds for testing", maxFeeds))
	}

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

	// Generate all outputs
	generateJSONOutput(sortedEntries, stats, feedSources)
	generateMarkdownOutput(sortedEntries, stats, feedSources)
	generateHTMLOutput(sortedEntries, stats, feedSources)
	printSummary(stats)

	printFooter()
}

// ================================================================================
// ENHANCED FEED SOURCES CONFIGURATION
// ================================================================================

func getFeedSources() []FeedSource {
	var sources []FeedSource

	// Core cybersecurity feeds (Priority 1)
	coreFeeds := []string{
		"https://medium.com/feed/tag/cybersecurity",
		"https://medium.com/feed/tag/information-security",
		"https://medium.com/feed/tag/infosec",
		"https://medium.com/feed/tag/security",
		"https://medium.com/feed/tag/cyber-security",
		"https://medium.com/feed/tag/security-research",
		"https://medium.com/feed/tag/cyber-threat",
		"https://medium.com/feed/tag/security-awareness",
	}
	addFeedsWithCategory(&sources, coreFeeds, "Core Security", 1, "#FF6B6B")

	// Bug bounty and ethical hacking (Priority 2)
	bugBountyFeeds := []string{
		"https://medium.com/feed/tag/bug-bounty",
		"https://medium.com/feed/tag/bug-bounty-tips",
		"https://medium.com/feed/tag/bug-bounty-writeup",
		"https://medium.com/feed/tag/bugbounty-writeup",
		"https://medium.com/feed/tag/bug-bounty-hunter",
		"https://medium.com/feed/tag/bug-bounty-program",
		"https://medium.com/feed/tag/ethical-hacking",
		"https://medium.com/feed/tag/hackerone",
		"https://medium.com/feed/tag/bugcrowd",
		"https://medium.com/feed/tag/bounty-program",
		"https://medium.com/feed/tag/bounties",
		"https://medium.com/feed/tag/responsible-disclosure",
		"https://medium.com/feed/tag/vulnerability-disclosure",
	}
	addFeedsWithCategory(&sources, bugBountyFeeds, "Bug Bounty", 2, "#4ECDC4")

	// Penetration testing and red team (Priority 3)
	penTestFeeds := []string{
		"https://medium.com/feed/tag/penetration-testing",
		"https://medium.com/feed/tag/pentesting",
		"https://medium.com/feed/tag/pentest",
		"https://medium.com/feed/tag/red-team",
		"https://medium.com/feed/tag/red-teaming",
		"https://medium.com/feed/tag/hacking",
		"https://medium.com/feed/tag/exploitation",
		"https://medium.com/feed/tag/exploit",
		"https://medium.com/feed/tag/offensive-security",
		"https://medium.com/feed/tag/security-testing",
	}
	addFeedsWithCategory(&sources, penTestFeeds, "Penetration Testing", 3, "#45B7D1")

	// Web application security (Priority 4)
	webSecFeeds := []string{
		"https://medium.com/feed/tag/web-security",
		"https://medium.com/feed/tag/application-security",
		"https://medium.com/feed/tag/web-application-security",
		"https://medium.com/feed/tag/xss",
		"https://medium.com/feed/tag/xss-attack",
		"https://medium.com/feed/tag/cross-site-scripting",
		"https://medium.com/feed/tag/sql-injection",
		"https://medium.com/feed/tag/sqli",
		"https://medium.com/feed/tag/ssrf",
		"https://medium.com/feed/tag/idor",
		"https://medium.com/feed/tag/csrf",
		"https://medium.com/feed/tag/rce",
		"https://medium.com/feed/tag/remote-code-execution",
		"https://medium.com/feed/tag/lfi",
		"https://medium.com/feed/tag/local-file-inclusion",
		"https://medium.com/feed/tag/rfi",
		"https://medium.com/feed/tag/file-upload",
		"https://medium.com/feed/tag/path-traversal",
		"https://medium.com/feed/tag/command-injection",
	}
	addFeedsWithCategory(&sources, webSecFeeds, "Web Security", 4, "#96CEB4")

	// API and mobile security (Priority 5)
	apiMobileFeeds := []string{
		"https://medium.com/feed/tag/api-security",
		"https://medium.com/feed/tag/rest-api-security",
		"https://medium.com/feed/tag/graphql-security",
		"https://medium.com/feed/tag/mobile-security",
		"https://medium.com/feed/tag/android-security",
		"https://medium.com/feed/tag/ios-security",
		"https://medium.com/feed/tag/mobile-app-security",
		"https://medium.com/feed/tag/oauth",
		"https://medium.com/feed/tag/jwt",
		"https://medium.com/feed/tag/authentication",
		"https://medium.com/feed/tag/authorization",
	}
	addFeedsWithCategory(&sources, apiMobileFeeds, "API & Mobile", 5, "#FFEAA7")

	// Cloud security (Priority 6)
	cloudFeeds := []string{
		"https://medium.com/feed/tag/cloud-security",
		"https://medium.com/feed/tag/aws-security",
		"https://medium.com/feed/tag/azure-security",
		"https://medium.com/feed/tag/gcp-security",
		"https://medium.com/feed/tag/google-cloud-security",
		"https://medium.com/feed/tag/kubernetes-security",
		"https://medium.com/feed/tag/docker-security",
		"https://medium.com/feed/tag/container-security",
		"https://medium.com/feed/tag/serverless-security",
		"https://medium.com/feed/tag/devsecops",
		"https://medium.com/feed/tag/infrastructure-security",
	}
	addFeedsWithCategory(&sources, cloudFeeds, "Cloud Security", 6, "#DDA0DD")

	// Tools and reconnaissance (Priority 7)
	toolsFeeds := []string{
		"https://medium.com/feed/tag/cybersecurity-tools",
		"https://medium.com/feed/tag/security-tools",
		"https://medium.com/feed/tag/recon",
		"https://medium.com/feed/tag/reconnaissance",
		"https://medium.com/feed/tag/osint",
		"https://medium.com/feed/tag/dorking",
		"https://medium.com/feed/tag/google-dorking",
		"https://medium.com/feed/tag/google-dork",
		"https://medium.com/feed/tag/dorks",
		"https://medium.com/feed/tag/github-dorking",
		"https://medium.com/feed/tag/subdomain-enumeration",
		"https://medium.com/feed/tag/subdomain-takeover",
		"https://medium.com/feed/tag/port-scanning",
		"https://medium.com/feed/tag/vulnerability-scanning",
	}
	addFeedsWithCategory(&sources, toolsFeeds, "Tools & OSINT", 7, "#74B9FF")

	// Specific security tools (Priority 8)
	specificToolsFeeds := []string{
		"https://medium.com/feed/tag/burp-suite",
		"https://medium.com/feed/tag/nmap",
		"https://medium.com/feed/tag/metasploit",
		"https://medium.com/feed/tag/wireshark",
		"https://medium.com/feed/tag/nessus",
		"https://medium.com/feed/tag/shodan",
		"https://medium.com/feed/tag/censys",
		"https://medium.com/feed/tag/masscan",
		"https://medium.com/feed/tag/sqlmap",
		"https://medium.com/feed/tag/nikto",
		"https://medium.com/feed/tag/gobuster",
		"https://medium.com/feed/tag/dirb",
		"https://medium.com/feed/tag/ffuf",
		"https://medium.com/feed/tag/nuclei",
	}
	addFeedsWithCategory(&sources, specificToolsFeeds, "Security Tools", 8, "#A29BFE")

	// Malware and threat analysis (Priority 9)
	malwareFeeds := []string{
		"https://medium.com/feed/tag/malware-analysis",
		"https://medium.com/feed/tag/malware",
		"https://medium.com/feed/tag/reverse-engineering",
		"https://medium.com/feed/tag/threat-intelligence",
		"https://medium.com/feed/tag/threat-hunting",
		"https://medium.com/feed/tag/apt",
		"https://medium.com/feed/tag/advanced-persistent-threat",
		"https://medium.com/feed/tag/ransomware",
		"https://medium.com/feed/tag/phishing",
		"https://medium.com/feed/tag/social-engineering",
		"https://medium.com/feed/tag/threat-analysis",
	}
	addFeedsWithCategory(&sources, malwareFeeds, "Malware & Threats", 9, "#FD79A8")

	// Digital forensics and incident response (Priority 10)
	forensicsFeeds := []string{
		"https://medium.com/feed/tag/digital-forensics",
		"https://medium.com/feed/tag/forensics",
		"https://medium.com/feed/tag/incident-response",
		"https://medium.com/feed/tag/dfir",
		"https://medium.com/feed/tag/memory-forensics",
		"https://medium.com/feed/tag/disk-forensics",
		"https://medium.com/feed/tag/network-forensics",
		"https://medium.com/feed/tag/mobile-forensics",
		"https://medium.com/feed/tag/cloud-forensics",
		"https://medium.com/feed/tag/volatility",
	}
	addFeedsWithCategory(&sources, forensicsFeeds, "Forensics & IR", 10, "#FDCB6E")

	// Cryptography and privacy (Priority 11)
	cryptoFeeds := []string{
		"https://medium.com/feed/tag/cryptography",
		"https://medium.com/feed/tag/encryption",
		"https://medium.com/feed/tag/cryptocurrency-security",
		"https://medium.com/feed/tag/blockchain-security",
		"https://medium.com/feed/tag/smart-contract-security",
		"https://medium.com/feed/tag/defi-security",
		"https://medium.com/feed/tag/privacy",
		"https://medium.com/feed/tag/data-privacy",
		"https://medium.com/feed/tag/gdpr",
		"https://medium.com/feed/tag/tls",
		"https://medium.com/feed/tag/ssl",
	}
	addFeedsWithCategory(&sources, cryptoFeeds, "Crypto & Privacy", 11, "#E17055")

	// Network security (Priority 12)
	networkFeeds := []string{
		"https://medium.com/feed/tag/network-security",
		"https://medium.com/feed/tag/firewall",
		"https://medium.com/feed/tag/ids",
		"https://medium.com/feed/tag/ips",
		"https://medium.com/feed/tag/vpn",
		"https://medium.com/feed/tag/zero-trust",
		"https://medium.com/feed/tag/network-monitoring",
		"https://medium.com/feed/tag/packet-analysis",
		"https://medium.com/feed/tag/network-forensics",
	}
	addFeedsWithCategory(&sources, networkFeeds, "Network Security", 12, "#00B894")

	// Vulnerability research (Priority 13)
	vulnResearchFeeds := []string{
		"https://medium.com/feed/tag/vulnerability",
		"https://medium.com/feed/tag/vulnerability-research",
		"https://medium.com/feed/tag/cve",
		"https://medium.com/feed/tag/zero-day",
		"https://medium.com/feed/tag/zeroday",
		"https://medium.com/feed/tag/exploit-development",
		"https://medium.com/feed/tag/buffer-overflow",
		"https://medium.com/feed/tag/heap-exploitation",
		"https://medium.com/feed/tag/rop",
		"https://medium.com/feed/tag/return-oriented-programming",
		"https://medium.com/feed/tag/shellcode",
		"https://medium.com/feed/tag/fuzzing",
	}
	addFeedsWithCategory(&sources, vulnResearchFeeds, "Vuln Research", 13, "#6C5CE7")

	// Security operations and blue team (Priority 14)
	blueTeamFeeds := []string{
		"https://medium.com/feed/tag/blue-team",
		"https://medium.com/feed/tag/soc",
		"https://medium.com/feed/tag/security-operations",
		"https://medium.com/feed/tag/siem",
		"https://medium.com/feed/tag/security-monitoring",
		"https://medium.com/feed/tag/endpoint-security",
		"https://medium.com/feed/tag/edr",
		"https://medium.com/feed/tag/xdr",
		"https://medium.com/feed/tag/security-orchestration",
		"https://medium.com/feed/tag/soar",
	}
	addFeedsWithCategory(&sources, blueTeamFeeds, "Blue Team & SOC", 14, "#00CEC9")

	// Compliance and governance (Priority 15)
	complianceFeeds := []string{
		"https://medium.com/feed/tag/compliance",
		"https://medium.com/feed/tag/security-governance",
		"https://medium.com/feed/tag/risk-management",
		"https://medium.com/feed/tag/security-audit",
		"https://medium.com/feed/tag/security-assessment",
		"https://medium.com/feed/tag/pci-dss",
		"https://medium.com/feed/tag/hipaa",
		"https://medium.com/feed/tag/sox",
		"https://medium.com/feed/tag/iso-27001",
		"https://medium.com/feed/tag/nist",
		"https://medium.com/feed/tag/cis-controls",
	}
	addFeedsWithCategory(&sources, complianceFeeds, "Compliance & Governance", 15, "#FD79A8")

	// AI/ML Security and Emerging Technologies (Priority 16)
	aiSecurityFeeds := []string{
		"https://medium.com/feed/tag/ai-security",
		"https://medium.com/feed/tag/machine-learning-security",
		"https://medium.com/feed/tag/ml-security",
		"https://medium.com/feed/tag/artificial-intelligence-security",
		"https://medium.com/feed/tag/adversarial-attacks",
		"https://medium.com/feed/tag/model-poisoning",
		"https://medium.com/feed/tag/ai-privacy",
		"https://medium.com/feed/tag/federated-learning-security",
		"https://medium.com/feed/tag/deepfake-detection",
		"https://medium.com/feed/tag/ai-ethics",
		"https://medium.com/feed/tag/llm-security",
		"https://medium.com/feed/tag/chatgpt-security",
		"https://medium.com/feed/tag/prompt-injection",
		"https://medium.com/feed/tag/ai-poisoning",
		"https://medium.com/feed/tag/model-extraction",
		"https://medium.com/feed/tag/ai-backdoor",
	}
	addFeedsWithCategory(&sources, aiSecurityFeeds, "AI/ML Security", 16, "#FF6B9D")

	// IoT and Hardware Security (Priority 17)
	iotSecurityFeeds := []string{
		"https://medium.com/feed/tag/iot-security",
		"https://medium.com/feed/tag/internet-of-things-security",
		"https://medium.com/feed/tag/hardware-security",
		"https://medium.com/feed/tag/embedded-security",
		"https://medium.com/feed/tag/firmware-security",
		"https://medium.com/feed/tag/hardware-hacking",
		"https://medium.com/feed/tag/pcb-security",
		"https://medium.com/feed/tag/side-channel-attacks",
		"https://medium.com/feed/tag/automotive-security",
		"https://medium.com/feed/tag/industrial-security",
		"https://medium.com/feed/tag/scada-security",
		"https://medium.com/feed/tag/smart-home-security",
	}
	addFeedsWithCategory(&sources, iotSecurityFeeds, "IoT & Hardware", 17, "#4ECDC4")

	// DevSecOps and CI/CD Security (Priority 18)
	devSecOpsFeeds := []string{
		"https://medium.com/feed/tag/devsecops",
		"https://medium.com/feed/tag/cicd-security",
		"https://medium.com/feed/tag/pipeline-security",
		"https://medium.com/feed/tag/secure-coding",
		"https://medium.com/feed/tag/sast",
		"https://medium.com/feed/tag/dast",
		"https://medium.com/feed/tag/iast",
		"https://medium.com/feed/tag/software-composition-analysis",
		"https://medium.com/feed/tag/container-scanning",
		"https://medium.com/feed/tag/secrets-management",
		"https://medium.com/feed/tag/secure-software-development",
		"https://medium.com/feed/tag/shift-left-security",
	}
	addFeedsWithCategory(&sources, devSecOpsFeeds, "DevSecOps & CI/CD", 18, "#96CEB4")

	// Social Engineering and Human Security (Priority 19)
	socialEngFeeds := []string{
		"https://medium.com/feed/tag/social-engineering",
		"https://medium.com/feed/tag/phishing",
		"https://medium.com/feed/tag/pretexting",
		"https://medium.com/feed/tag/baiting",
		"https://medium.com/feed/tag/quid-pro-quo",
		"https://medium.com/feed/tag/tailgating",
		"https://medium.com/feed/tag/vishing",
		"https://medium.com/feed/tag/smishing",
		"https://medium.com/feed/tag/spear-phishing",
		"https://medium.com/feed/tag/whaling",
		"https://medium.com/feed/tag/business-email-compromise",
		"https://medium.com/feed/tag/security-awareness-training",
	}
	addFeedsWithCategory(&sources, socialEngFeeds, "Social Engineering", 19, "#FF9F43")

	// Zero Trust and Modern Architecture (Priority 20)
	zeroTrustFeeds := []string{
		"https://medium.com/feed/tag/zero-trust",
		"https://medium.com/feed/tag/zero-trust-architecture",
		"https://medium.com/feed/tag/zero-trust-security",
		"https://medium.com/feed/tag/microsegmentation",
		"https://medium.com/feed/tag/software-defined-perimeter",
		"https://medium.com/feed/tag/conditional-access",
		"https://medium.com/feed/tag/identity-verification",
		"https://medium.com/feed/tag/device-trust",
		"https://medium.com/feed/tag/network-segmentation",
		"https://medium.com/feed/tag/secure-access-service-edge",
		"https://medium.com/feed/tag/sase",
		"https://medium.com/feed/tag/ztna",
	}
	addFeedsWithCategory(&sources, zeroTrustFeeds, "Zero Trust & Modern Architecture", 20, "#A55EEA")

	// Threat Intelligence and Hunting (Priority 21)
	threatIntelFeeds := []string{
		"https://medium.com/feed/tag/threat-intelligence",
		"https://medium.com/feed/tag/threat-hunting",
		"https://medium.com/feed/tag/cyber-threat-intelligence",
		"https://medium.com/feed/tag/indicators-of-compromise",
		"https://medium.com/feed/tag/ioc",
		"https://medium.com/feed/tag/tactics-techniques-procedures",
		"https://medium.com/feed/tag/ttp",
		"https://medium.com/feed/tag/mitre-attack",
		"https://medium.com/feed/tag/mitre-att-ck",
		"https://medium.com/feed/tag/cyber-kill-chain",
		"https://medium.com/feed/tag/diamond-model",
		"https://medium.com/feed/tag/threat-modeling",
	}
	addFeedsWithCategory(&sources, threatIntelFeeds, "Threat Intelligence", 21, "#26D0CE")

	// Privacy and Data Protection (Priority 22)
	privacyFeeds := []string{
		"https://medium.com/feed/tag/data-privacy",
		"https://medium.com/feed/tag/privacy",
		"https://medium.com/feed/tag/gdpr",
		"https://medium.com/feed/tag/ccpa",
		"https://medium.com/feed/tag/data-protection",
		"https://medium.com/feed/tag/privacy-by-design",
		"https://medium.com/feed/tag/data-minimization",
		"https://medium.com/feed/tag/consent-management",
		"https://medium.com/feed/tag/right-to-be-forgotten",
		"https://medium.com/feed/tag/privacy-impact-assessment",
		"https://medium.com/feed/tag/data-subject-rights",
		"https://medium.com/feed/tag/privacy-engineering",
	}
	addFeedsWithCategory(&sources, privacyFeeds, "Privacy & Data Protection", 22, "#FD79A8")

	// Quantum Computing and Post-Quantum Cryptography (Priority 23)
	quantumSecurityFeeds := []string{
		"https://medium.com/feed/tag/quantum-computing-security",
		"https://medium.com/feed/tag/post-quantum-cryptography",
		"https://medium.com/feed/tag/quantum-cryptography",
		"https://medium.com/feed/tag/quantum-key-distribution",
		"https://medium.com/feed/tag/quantum-resistant-algorithms",
		"https://medium.com/feed/tag/quantum-supremacy",
		"https://medium.com/feed/tag/quantum-attacks",
		"https://medium.com/feed/tag/lattice-cryptography",
		"https://medium.com/feed/tag/nist-pqc",
		"https://medium.com/feed/tag/quantum-safe",
		"https://medium.com/feed/tag/quantum-threat",
		"https://medium.com/feed/tag/cryptographic-agility",
	}
	addFeedsWithCategory(&sources, quantumSecurityFeeds, "Quantum & Post-Quantum", 23, "#6C5CE7")

	// Additional Specialized Security Areas (Priority 24)
	specializedFeeds := []string{
		"https://medium.com/feed/tag/satellite-security",
		"https://medium.com/feed/tag/space-security",
		"https://medium.com/feed/tag/supply-chain-security",
		"https://medium.com/feed/tag/third-party-risk",
		"https://medium.com/feed/tag/vendor-risk-management",
		"https://medium.com/feed/tag/critical-infrastructure",
		"https://medium.com/feed/tag/operational-technology",
		"https://medium.com/feed/tag/ot-security",
		"https://medium.com/feed/tag/maritime-security",
		"https://medium.com/feed/tag/aviation-security",
		"https://medium.com/feed/tag/healthcare-security",
		"https://medium.com/feed/tag/financial-security",
	}
	addFeedsWithCategory(&sources, specializedFeeds, "Specialized Security", 24, "#00B894")

	// Bug Bounty Platforms and Programs (Priority 25) 
	bugBountyPlatformFeeds := []string{
		"https://medium.com/feed/tag/hackerone",
		"https://medium.com/feed/tag/bugcrowd",
		"https://medium.com/feed/tag/intigriti",
		"https://medium.com/feed/tag/yeswehack",
		"https://medium.com/feed/tag/synack",
		"https://medium.com/feed/tag/cobalt",
		"https://medium.com/feed/tag/zerocopter",
		"https://medium.com/feed/tag/federacy",
		"https://medium.com/feed/tag/open-bug-bounty",
		"https://medium.com/feed/tag/google-vrp",
		"https://medium.com/feed/tag/microsoft-bounty",
		"https://medium.com/feed/tag/facebook-bounty",
	}
	addFeedsWithCategory(&sources, bugBountyPlatformFeeds, "Bug Bounty Platforms", 25, "#E17055")

	return sources
}

func addFeedsWithCategory(sources *[]FeedSource, urls []string, category string, priority int, color string) {
	for _, url := range urls {
		*sources = append(*sources, FeedSource{
			URL:      url,
			Name:     extractFeedName(url),
			Category: category,
			Priority: priority,
			Active:   true,
			Color:    color,
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
		fmt.Printf("%-8s %-20s %s", progress, source.Category, source.Name)

		rss, err := fetchRSSFeed(source.URL)
		if err != nil {
			if strings.Contains(err.Error(), "429") {
				fmt.Printf(" %s⏳ Rate limited%s\n", colorYellow, colorReset)
				stats.RateLimited++
			} else {
				fmt.Printf(" %s❌ Failed: %s%s\n", colorRed, err.Error(), colorReset)
			}
			stats.FailedFeeds++

			// Longer delay for rate limited requests
			if strings.Contains(err.Error(), "429") {
				time.Sleep(requestDelay * 2)
			}
			continue
		}

		itemsProcessed := processFeedItems(rss, source, entries, readmeContent, currentDate)
		fmt.Printf(" %s✅ %d items%s\n", colorGreen, itemsProcessed, colorReset)
		stats.SuccessfulFeeds++

		// Rate limiting with jitter
		if i < len(sources)-1 {
			delay := requestDelay
			if stats.RateLimited > 0 {
				delay = requestDelay * 2 // Slower when we've been rate limited
			}
			time.Sleep(delay)
		}
	}

	fmt.Println(subSeparator)
	printSuccess(fmt.Sprintf("Successfully processed %d/%d feeds (%d rate limited)",
		stats.SuccessfulFeeds, len(sources), stats.RateLimited))

	return entries
}

func fetchRSSFeed(url string) (*RSS, error) {
	client := &http.Client{Timeout: requestTimeout}

	// Add user agent to appear more legitimate
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("request creation error")
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; CybersecurityBot/3.0; +https://github.com/cybersecurity-aggregator)")
	req.Header.Set("Accept", "application/rss+xml, application/xml, text/xml")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("network error")
	}
	defer resp.Body.Close()

	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("HTTP 429 - Rate limited")
	} else if resp.StatusCode != http.StatusOK {
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
			if source.Priority < entry.Priority {
				entry.Priority = source.Priority // Keep highest priority
			}
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
				Categories:  item.Categories,
				IsNew:       !strings.Contains(readmeContent, item.GUID),
				IsToday:     checkIfToday(item.PubDate, currentDate),
				IsThisWeek:  checkIfThisWeek(item.PubDate),
				Description: item.Description,
				Author:      item.Author,
				Priority:    source.Priority,
			}
		}
		itemsProcessed++
	}

	return itemsProcessed
}

// generateCategoryStats calculates post statistics grouped by category
func generateCategoryStats(entries []*FeedEntry, sources []FeedSource) []CategoryStats {
	statsMap := make(map[string]*CategoryStats)

	for _, entry := range entries {
		category := getCategoryFromFeeds(entry.FeedNames, sources)
		color := getCategoryColor(entry.FeedNames, sources)

		catStat, exists := statsMap[category]
		if !exists {
			catStat = &CategoryStats{Name: category, Color: color}
			statsMap[category] = catStat
		}

		catStat.TotalPosts++
		if entry.IsNew {
			catStat.NewPosts++
		}
		if entry.IsToday {
			catStat.TodayPosts++
		}
	}

	result := make([]CategoryStats, 0, len(statsMap))
	for _, v := range statsMap {
		result = append(result, *v)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].TotalPosts > result[j].TotalPosts
	})

	return result
}

// getCategoryFromFeeds returns the category name for given feed names
func getCategoryFromFeeds(feedNames []string, sources []FeedSource) string {
	for _, name := range feedNames {
		for _, src := range sources {
			if src.Name == name {
				return src.Category
			}
		}
	}
	return "Uncategorized"
}

// getCategoryColor returns the color associated with the entry's category
func getCategoryColor(feedNames []string, sources []FeedSource) string {
	for _, name := range feedNames {
		for _, src := range sources {
			if src.Name == name && src.Color != "" {
				return src.Color
			}
		}
	}
	return "#FFFFFF"
}

// extractTrendingTopics returns trending topics based on entry categories
func extractTrendingTopics(entries []*FeedEntry) []TrendingTopic {
	counts := make(map[string]int)
	for _, entry := range entries {
		for _, cat := range entry.Categories {
			key := strings.ToLower(cat)
			counts[key]++
		}
	}

	topics := make([]TrendingTopic, 0, len(counts))
	for name, count := range counts {
		topics = append(topics, TrendingTopic{Name: name, Count: count})
	}

	sort.Slice(topics, func(i, j int) bool {
		return topics[i].Count > topics[j].Count
	})

	return topics
}

// generateCategoryOptions returns HTML option elements for category filter
func generateCategoryOptions(sources []FeedSource) string {
	seen := make(map[string]bool)
	var builder strings.Builder
	for _, src := range sources {
		if !seen[src.Category] {
			seen[src.Category] = true
			builder.WriteString(fmt.Sprintf("<option value=\"%s\">%s</option>", src.Category, src.Category))
		}
	}
	return builder.String()
}

// ================================================================================
// ENHANCED OUTPUT GENERATION
// ================================================================================

// JSONPost represents a post in JSON format for the dashboard
type JSONPost struct {
	GUID            string    `json:"guid"`
	Title           string    `json:"title"`
	Link            string    `json:"link"`
	Description     string    `json:"description"`
	PublishedTime   string    `json:"publishedTime"`
	Author          string    `json:"author"`
	Categories      []string  `json:"categories"`
	SourceCategory  string    `json:"sourceCategory"`
	Priority        int       `json:"priority"`
	AgeHours        float64   `json:"ageHours"`
	IsNew           bool      `json:"isNew"`
	IsToday         bool      `json:"isToday"`
	IsThisWeek      bool      `json:"isThisWeek"`
	CVEIds          []string  `json:"cveIds"`
}

// JSONSummary represents summary data for the dashboard
type JSONSummary struct {
	TotalPosts     int                    `json:"totalPosts"`
	NewPosts       int                    `json:"newPosts"`
	TodayPosts     int                    `json:"todayPosts"`
	ThisWeekPosts  int                    `json:"thisWeekPosts"`
	Categories     []CategoryStats        `json:"categories"`
	TrendingTopics []TrendingTopic        `json:"trendingTopics"`
	RecentCVEs     []string               `json:"recentCVEs"`
	Stats          map[string]interface{} `json:"stats"`
	LastUpdated    string                 `json:"lastUpdated"`
}

func generateJSONOutput(entries []*FeedEntry, stats *AggregatorStats, sources []FeedSource) {
	printInfo("📊 Generating JSON data for dashboard...")
	
	// Create data directory if it doesn't exist
	err := os.MkdirAll(dataDirectory, 0755)
	if err != nil {
		printWarning(fmt.Sprintf("Failed to create data directory: %v", err))
		return
	}
	
	// Convert entries to JSON format
	jsonPosts := make([]JSONPost, len(entries))
	for i, entry := range entries {
		// Extract CVE IDs from title and description
		cveIds := extractCVEIds(entry.Title + " " + entry.Description)
		
		// Calculate age in hours
		ageHours := 0.0
		if !entry.ParsedTime.IsZero() {
			ageHours = time.Since(entry.ParsedTime).Hours()
		}
		
		jsonPosts[i] = JSONPost{
			GUID:           entry.GUID,
			Title:          entry.Title,
			Link:           entry.GUID, // Use GUID as link since it's the Medium URL
			Description:    entry.Description,
			PublishedTime:  entry.ParsedTime.Format(time.RFC3339),
			Author:         entry.Author,
			Categories:     entry.Categories,
			SourceCategory: getCategoryFromFeeds(entry.FeedNames, sources),
			Priority:       entry.Priority,
			AgeHours:       ageHours,
			IsNew:          entry.IsNew,
			IsToday:        entry.IsToday,
			IsThisWeek:     entry.IsThisWeek,
			CVEIds:         cveIds,
		}
	}
	
	// Generate summary data
	categoryStats := generateCategoryStats(entries, sources)
	trendingTopics := extractTrendingTopics(entries)
	recentCVEs := extractRecentCVEs(entries)
	
	summary := JSONSummary{
		TotalPosts:     len(entries),
		NewPosts:       countNewEntries(entries),
		TodayPosts:     countTodayEntries(entries),
		ThisWeekPosts:  countWeekEntries(entries),
		Categories:     categoryStats,
		TrendingTopics: trendingTopics,
		RecentCVEs:     recentCVEs,
		Stats: map[string]interface{}{
			"totalFeeds":      stats.TotalFeeds,
			"successfulFeeds": stats.SuccessfulFeeds,
			"successRate":     float64(stats.SuccessfulFeeds) / float64(stats.TotalFeeds) * 100,
			"rateLimited":     stats.RateLimited,
			"processingTime":  stats.ProcessingTime.String(),
		},
		LastUpdated: getCurrentDateGMT(),
	}
	
	// Write posts JSON
	postsJSON, err := json.MarshalIndent(jsonPosts, "", "  ")
	if err != nil {
		printWarning(fmt.Sprintf("Failed to marshal posts JSON: %v", err))
		return
	}
	
	err = ioutil.WriteFile(dataDirectory+"/posts.json", postsJSON, 0644)
	if err != nil {
		printWarning(fmt.Sprintf("Failed to write posts.json: %v", err))
	} else {
		printSuccess(fmt.Sprintf("Generated %s/posts.json (%d posts)", dataDirectory, len(jsonPosts)))
	}
	
	// Write summary JSON
	summaryJSON, err := json.MarshalIndent(summary, "", "  ")
	if err != nil {
		printWarning(fmt.Sprintf("Failed to marshal summary JSON: %v", err))
		return
	}
	
	err = ioutil.WriteFile(dataDirectory+"/summary.json", summaryJSON, 0644)
	if err != nil {
		printWarning(fmt.Sprintf("Failed to write summary.json: %v", err))
	} else {
		printSuccess(fmt.Sprintf("Generated %s/summary.json", dataDirectory))
	}
}

// extractCVEIds extracts CVE IDs from text using regex
func extractCVEIds(text string) []string {
	// Simple regex to match CVE-YYYY-NNNN format
	var cveIds []string
	lines := strings.Split(text, " ")
	for _, word := range lines {
		word = strings.ToUpper(strings.TrimSpace(word))
		if strings.HasPrefix(word, "CVE-") && len(word) >= 9 {
			cveIds = append(cveIds, word)
		}
	}
	return cveIds
}

// extractRecentCVEs returns CVE IDs from recent entries
func extractRecentCVEs(entries []*FeedEntry) []string {
	cveSet := make(map[string]bool)
	for _, entry := range entries {
		if entry.IsThisWeek {
			cves := extractCVEIds(entry.Title + " " + entry.Description)
			for _, cve := range cves {
				cveSet[cve] = true
			}
		}
	}
	
	cves := make([]string, 0, len(cveSet))
	for cve := range cveSet {
		cves = append(cves, cve)
	}
	sort.Strings(cves)
	return cves
}

func generateMarkdownOutput(entries []*FeedEntry, stats *AggregatorStats, sources []FeedSource) {
	printInfo("📋 Generating GitHub Pages compatible markdown...")
	fmt.Println()

	// Enhanced GitHub Pages README with better styling
	fmt.Printf("# 🛡️ %s\n\n", appName)

	// Status and stats section
	fmt.Printf("[![Status](https://img.shields.io/badge/Status-🟢_Active-success?style=for-the-badge)](#) ")
	fmt.Printf("[![Posts](https://img.shields.io/badge/Posts-%d-blue?style=for-the-badge)](#) ", len(entries))
	fmt.Printf("[![New](https://img.shields.io/badge/New-%d-orange?style=for-the-badge)](#) ", countNewEntries(entries))
	fmt.Printf("[![Today](https://img.shields.io/badge/Today-%d-red?style=for-the-badge)](#)\n\n", countTodayEntries(entries))

	// Quick stats table
	fmt.Printf("## 📊 Quick Stats\n\n")
	fmt.Printf("| Metric | Count | Percentage |\n")
	fmt.Printf("|--------|-------|------------|\n")
	fmt.Printf("| 📰 **Total Posts** | **%d** | 100%% |\n", len(entries))
	fmt.Printf("| 🆕 **New Posts** | **%d** | %.1f%% |\n",
		countNewEntries(entries),
		float64(countNewEntries(entries))/float64(len(entries))*100)
	fmt.Printf("| 📅 **Today's Posts** | **%d** | %.1f%% |\n",
		countTodayEntries(entries),
		float64(countTodayEntries(entries))/float64(len(entries))*100)
	fmt.Printf("| 📈 **This Week** | **%d** | %.1f%% |\n",
		countWeekEntries(entries),
		float64(countWeekEntries(entries))/float64(len(entries))*100)
	fmt.Printf("| 🔄 **Success Rate** | **%d/%d** | %.1f%% |\n\n",
		stats.SuccessfulFeeds, stats.TotalFeeds,
		float64(stats.SuccessfulFeeds)/float64(stats.TotalFeeds)*100)

	// Category breakdown
	categoryStats := generateCategoryStats(entries, sources)
	fmt.Printf("## 🏷️ Categories Overview\n\n")
	fmt.Printf("| Category | Posts | New | Today | Trend |\n")
	fmt.Printf("|----------|--------|-----|-------|-------|\n")
	for _, cat := range categoryStats {
		trend := "📈"
		if cat.NewPosts == 0 {
			trend = "📊"
		} else if cat.NewPosts > 5 {
			trend = "🚀"
		}
		fmt.Printf("| **%s** | %d | %d | %d | %s |\n",
			cat.Name, cat.TotalPosts, cat.NewPosts, cat.TodayPosts, trend)
	}
	fmt.Printf("\n")

	// Update information
	fmt.Printf("## ℹ️ Update Information\n\n")
	fmt.Printf("- **Last Updated**: %s GMT\n", getCurrentDateGMT())
	fmt.Printf("- **Processing Time**: %v\n", stats.ProcessingTime.Round(time.Second))
	fmt.Printf("- **Feeds Processed**: %d/%d (%.1f%% success rate)\n",
		stats.SuccessfulFeeds, stats.TotalFeeds,
		float64(stats.SuccessfulFeeds)/float64(stats.TotalFeeds)*100)
	fmt.Printf("- **Rate Limited**: %d feeds\n", stats.RateLimited)
	fmt.Printf("- **Next Update**: Automatically every 2 hours\n\n")

	// Main posts table with enhanced formatting
	fmt.Printf("## 📰 Latest Cybersecurity Posts\n\n")
	fmt.Printf("> 🔍 **Pro Tip**: Use `Ctrl+F` to search for specific topics, CVEs, or tools!\n\n")

	fmt.Printf("| 🕒 Time | 📄 Title | 📂 Category | 🆕 | 📅 | 📊 |\n")
	fmt.Printf("|---------|----------|-------------|----|----|----|\n")

	// Group entries by priority and date
	for _, entry := range entries {
		timeStr := formatDisplayTime(entry.ParsedTime)
		title := sanitizeTitle(entry.Title)
		category := getCategoryFromFeeds(entry.FeedNames, sources)

		newBadge := ""
		if entry.IsNew {
			newBadge = "🆕"
		}

		todayBadge := ""
		if entry.IsToday {
			todayBadge = "📅"
		}

		priorityBadge := ""
		if entry.Priority <= 3 {
			priorityBadge = "🔥"
		} else if entry.Priority <= 6 {
			priorityBadge = "⭐"
		} else {
			priorityBadge = "📝"
		}

		fmt.Printf("| %s | [%s](%s) | %s | %s | %s | %s |\n",
			timeStr, title, entry.GUID, category, newBadge, todayBadge, priorityBadge)
	}

	// Footer with enhanced information
	fmt.Printf("\n---\n\n")
	fmt.Printf("## 🔗 Useful Links\n\n")
	fmt.Printf("- 🌐 **[Live Dashboard](https://your-username.github.io/medium-writeups/)** - Interactive view\n")
	fmt.Printf("- 📱 **[Mobile View](https://your-username.github.io/medium-writeups/mobile)** - Optimized for mobile\n")
	fmt.Printf("- 📊 **[Analytics](https://your-username.github.io/medium-writeups/stats)** - Detailed statistics\n")
	fmt.Printf("- 🔄 **[API](https://your-username.github.io/medium-writeups/api/posts.json)** - JSON feed\n\n")

	fmt.Printf("## 🛠️ Technical Details\n\n")
	fmt.Printf("- **Generator**: %s %s\n", appName, appVersion)
	fmt.Printf("- **Sources**: %d Medium RSS feeds across %d categories\n", len(sources), len(categoryStats))
	fmt.Printf("- **Update Frequency**: Every 2 hours via GitHub Actions\n")
	fmt.Printf("- **Repository**: [GitHub](https://github.com/your-username/medium-writeups)\n")
	fmt.Printf("- **License**: MIT License\n\n")

	fmt.Printf("## 📈 Trending Topics\n\n")
	trendingTopics := extractTrendingTopics(entries)
	for i, topic := range trendingTopics {
		if i >= 10 {
			break
		} // Top 10 only
		fmt.Printf("- **%s** (%d posts)\n", topic.Name, topic.Count)
	}
	fmt.Printf("\n")

	fmt.Printf("## 🤝 Contributing\n\n")
	fmt.Printf("Want to add more RSS feeds or improve the aggregator?\n\n")
	fmt.Printf("1. 🍴 Fork the repository\n")
	fmt.Printf("2. ➕ Add new feeds in `main.go`\n")
	fmt.Printf("3. 🧪 Test your changes\n")
	fmt.Printf("4. 📬 Submit a pull request\n\n")

	fmt.Printf("---\n")
	fmt.Printf("*⚡ Powered by GitHub Actions | 🔄 Auto-updated every 2 hours | ⭐ Star if useful!*\n")
}

func generateHTMLOutput(entries []*FeedEntry, stats *AggregatorStats, sources []FeedSource) {
	printInfo("🌐 Skipping HTML generation - using existing enhanced index.html")
	printInfo("📊 Enhanced index.html will load data from generated JSON files")
	
	// The existing index.html is already perfectly designed and will load:
	// - data/posts.json (generated by generateJSONOutput)  
	// - data/summary.json (generated by generateJSONOutput)
	// We don't need to overwrite the beautiful UI that's already there!
}
