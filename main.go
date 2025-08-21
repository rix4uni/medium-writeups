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

// Constants
const (
	maxTitleLength    = 65
	requestDelay      = 3 * time.Second
	dateFormat        = "Mon, 02 Jan 2006"
	readmeFilename    = "README.md"
	outputTableHeader = "| Time | Title | Feed | IsNew | IsToday |\n|-----------|-----|-----|-----|-----|"
)

// RSS structs for XML parsing
type RSS struct {
	Channel Channel `xml:"channel"`
}

type Channel struct {
	Items []Item `xml:"item"`
}

type Item struct {
	Title   string `xml:"title"`
	GUID    string `xml:"guid"`
	PubDate string `xml:"pubDate"`
}

// FeedEntry represents a processed RSS entry
type FeedEntry struct {
	Title   string
	GUID    string
	PubDate string
	Feeds   string
	IsNew   string
	IsToday string
}

// FeedSource represents an RSS feed source
type FeedSource struct {
	URL  string
	Name string
}

func main() {
	fmt.Println("🚀 Starting Medium Cybersecurity Posts Aggregator")
	fmt.Println("📅 Current GMT Date:", getCurrentDateGMT())
	fmt.Println("----------------------------------------")
	
	feedSources := getFeedSources()
	readmeContent := readREADME()
	currentDate := getCurrentDateGMT()
	
	entries := processFeeds(feedSources, readmeContent, currentDate)
	
	if len(entries) == 0 {
		fmt.Println("❌ No entries found or all feeds failed to fetch")
		return
	}
	
	sortedEntries := sortEntries(entries)
	generateOutput(sortedEntries)
	
	fmt.Printf("\n✅ Processed %d entries from %d feeds\n", len(sortedEntries), len(feedSources))
}

// getFeedSources returns the list of Medium RSS feeds to monitor
func getFeedSources() []FeedSource {
	urls := []string{
		"https://medium.com/feed/tag/bug-bounty",
		"https://medium.com/feed/tag/security",
		"https://medium.com/feed/tag/vulnerability",
		"https://medium.com/feed/tag/cybersecurity",
		"https://medium.com/feed/tag/penetration-testing",
		"https://medium.com/feed/tag/hacking",
		"https://medium.com/feed/tag/information-technology",
		"https://medium.com/feed/tag/infosec",
		"https://medium.com/feed/tag/web-security",
		"https://medium.com/feed/tag/bug-bounty-tips",
		"https://medium.com/feed/tag/bugs",
		"https://medium.com/feed/tag/pentesting",
		"https://medium.com/feed/tag/xss-attack",
		"https://medium.com/feed/tag/information-security",
		"https://medium.com/feed/tag/cross-site-scripting",
		"https://medium.com/feed/tag/hackerone",
		"https://medium.com/feed/tag/bugcrowd",
		"https://medium.com/feed/tag/bugbounty-writeup",
		"https://medium.com/feed/tag/bug-bounty-writeup",
		"https://medium.com/feed/tag/bug-bounty-hunter",
		"https://medium.com/feed/tag/bug-bounty-program",
		"https://medium.com/feed/tag/ethical-hacking",
		"https://medium.com/feed/tag/application-security",
		"https://medium.com/feed/tag/google-dorking",
		"https://medium.com/feed/tag/dorking",
		"https://medium.com/feed/tag/cyber-security-awareness",
		"https://medium.com/feed/tag/google-dork",
		"https://medium.com/feed/tag/web-pentest",
		"https://medium.com/feed/tag/vdp",
		"https://medium.com/feed/tag/information-disclosure",
		"https://medium.com/feed/tag/exploit",
		"https://medium.com/feed/tag/vulnerability-disclosure",
		"https://medium.com/feed/tag/web-cache-poisoning",
		"https://medium.com/feed/tag/rce",
		"https://medium.com/feed/tag/remote-code-execution",
		"https://medium.com/feed/tag/local-file-inclusion",
		"https://medium.com/feed/tag/vapt",
		"https://medium.com/feed/tag/dorks",
		"https://medium.com/feed/tag/github-dorking",
		"https://medium.com/feed/tag/lfi",
		"https://medium.com/feed/tag/vulnerability-scanning",
		"https://medium.com/feed/tag/subdomain-enumeration",
		"https://medium.com/feed/tag/cybersecurity-tools",
		"https://medium.com/feed/tag/bug-bounty-hunting",
		"https://medium.com/feed/tag/ssrf",
		"https://medium.com/feed/tag/idor",
		"https://medium.com/feed/tag/pentest",
		"https://medium.com/feed/tag/file-upload",
		"https://medium.com/feed/tag/file-inclusion",
		"https://medium.com/feed/tag/security-research",
		"https://medium.com/feed/tag/directory-listing",
		"https://medium.com/feed/tag/log-poisoning",
		"https://medium.com/feed/tag/cve",
		"https://medium.com/feed/tag/xss-vulnerability",
		"https://medium.com/feed/tag/shodan",
		"https://medium.com/feed/tag/censys",
		"https://medium.com/feed/tag/zoomeye",
		"https://medium.com/feed/tag/recon",
		"https://medium.com/feed/tag/xss-bypass",
		"https://medium.com/feed/tag/bounty-program",
		"https://medium.com/feed/tag/subdomain-takeover",
		"https://medium.com/feed/tag/bounties",
		"https://medium.com/feed/tag/api-key",
		"https://medium.com/feed/tag/cyber-sec",
		// Additional security-related tags
		"https://medium.com/feed/tag/network-security",
		"https://medium.com/feed/tag/cloud-security",
		"https://medium.com/feed/tag/aws-security",
		"https://medium.com/feed/tag/azure-security",
		"https://medium.com/feed/tag/gcp-security",
		"https://medium.com/feed/tag/kubernetes-security",
		"https://medium.com/feed/tag/docker-security",
		"https://medium.com/feed/tag/container-security",
		"https://medium.com/feed/tag/devsecops",
		"https://medium.com/feed/tag/secure-coding",
		"https://medium.com/feed/tag/owasp",
		"https://medium.com/feed/tag/owasp-top-10",
		"https://medium.com/feed/tag/mitre-attack",
		"https://medium.com/feed/tag/malware-analysis",
		"https://medium.com/feed/tag/reverse-engineering",
		"https://medium.com/feed/tag/digital-forensics",
		"https://medium.com/feed/tag/incident-response",
		"https://medium.com/feed/tag/soc",
		"https://medium.com/feed/tag/siem",
		"https://medium.com/feed/tag/threat-intelligence",
		"https://medium.com/feed/tag/threat-hunting",
		"https://medium.com/feed/tag/ransomware",
		"https://medium.com/feed/tag/phishing",
		"https://medium.com/feed/tag/social-engineering",
		"https://medium.com/feed/tag/zero-trust",
		"https://medium.com/feed/tag/vpn",
		"https://medium.com/feed/tag/firewall",
		"https://medium.com/feed/tag/ids",
		"https://medium.com/feed/tag/ips",
		"https://medium.com/feed/tag/endpoint-security",
		"https://medium.com/feed/tag/edr",
		"https://medium.com/feed/tag/xdr",
		"https://medium.com/feed/tag/sast",
		"https://medium.com/feed/tag/dast",
		"https://medium.com/feed/tag/iam",
		"https://medium.com/feed/tag/privileged-access-management",
		"https://medium.com/feed/tag/mfa",
		"https://medium.com/feed/tag/2fa",
		"https://medium.com/feed/tag/password-security",
		"https://medium.com/feed/tag/cryptography",
		"https://medium.com/feed/tag/encryption",
		"https://medium.com/feed/tag/tls",
		"https://medium.com/feed/tag/ssl",
		"https://medium.com/feed/tag/pki",
		"https://medium.com/feed/tag/data-protection",
		"https://medium.com/feed/tag/gdpr",
		"https://medium.com/feed/tag/hipaa",
		"https://medium.com/feed/tag/pci-dss",
		"https://medium.com/feed/tag/compliance",
		"https://medium.com/feed/tag/risk-management",
		"https://medium.com/feed/tag/security-audit",
		"https://medium.com/feed/tag/security-assessment",
		"https://medium.com/feed/tag/red-team",
		"https://medium.com/feed/tag/blue-team",
		"https://medium.com/feed/tag/purple-team",
		"https://medium.com/feed/tag/threat-modeling",
		"https://medium.com/feed/tag/security-architecture",
		"https://medium.com/feed/tag/api-security",
		"https://medium.com/feed/tag/mobile-security",
		"https://medium.com/feed/tag/android-security",
		"https://medium.com/feed/tag/ios-security",
		"https://medium.com/feed/tag/iot-security",
		"https://medium.com/feed/tag/industrial-control-systems",
		"https://medium.com/feed/tag/scada-security",
		"https://medium.com/feed/tag/critical-infrastructure",
		"https://medium.com/feed/tag/supply-chain-security",
		"https://medium.com/feed/tag/software-bill-of-materials",
		"https://medium.com/feed/tag/sbom",
		"https://medium.com/feed/tag/zeroday",
		"https://medium.com/feed/tag/zero-day",
		"https://medium.com/feed/tag/nist",
		"https://medium.com/feed/tag/iso-27001",
		"https://medium.com/feed/tag/soc2",
		"https://medium.com/feed/tag/cis-controls",
		"https://medium.com/feed/tag/security-awareness",
		"https://medium.com/feed/tag/security-training",
		"https://medium.com/feed/tag/cyber-threat",
		"https://medium.com/feed/tag/cyber-attack",
		"https://medium.com/feed/tag/cyber-crime",
		"https://medium.com/feed/tag/dark-web",
		"https://medium.com/feed/tag/tor",
		"https://medium.com/feed/tag/blockchain-security",
		"https://medium.com/feed/tag/smart-contract-security",
		"https://medium.com/feed/tag/defi-security",
		"https://medium.com/feed/tag/nft-security",
		"https://medium.com/feed/tag/metaverse-security",
		"https://medium.com/feed/tag/ai-security",
		"https://medium.com/feed/tag/machine-learning-security",
		"https://medium.com/feed/tag/adversarial-machine-learning",
		"https://medium.com/feed/tag/data-privacy",
		"https://medium.com/feed/tag/privacy-by-design",
		"https://medium.com/feed/tag/secure-development",
		"https://medium.com/feed/tag/secure-sdlc",
		"https://medium.com/feed/tag/security-testing",
		"https://medium.com/feed/tag/fuzzing",
		"https://medium.com/feed/tag/binary-exploitation",
		"https://medium.com/feed/tag/buffer-overflow",
		"https://medium.com/feed/tag/format-string",
		"https://medium.com/feed/tag/heap-exploitation",
		"https://medium.com/feed/tag/return-oriented-programming",
		"https://medium.com/feed/tag/rop",
		"https://medium.com/feed/tag/shellcode",
		"https://medium.com/feed/tag/metasploit",
		"https://medium.com/feed/tag/burp-suite",
		"https://medium.com/feed/tag/nmap",
		"https://medium.com/feed/tag/wireshark",
		"https://medium.com/feed/tag/nessus",
		"https://medium.com/feed/tag/openvas",
		"https://medium.com/feed/tag/security-onion",
		"https://medium.com/feed/tag/elastic-security",
		"https://medium.com/feed/tag/splunk",
		"https://medium.com/feed/tag/security-operations",
		"https://medium.com/feed/tag/dfir",
		"https://medium.com/feed/tag/memory-forensics",
		"https://medium.com/feed/tag/disk-forensics",
		"https://medium.com/feed/tag/network-forensics",
		"https://medium.com/feed/tag/mobile-forensics",
		"https://medium.com/feed/tag/cloud-forensics",
		"https://medium.com/feed/tag/malware-research",
		"https://medium.com/feed/tag/apt",
		"https://medium.com/feed/tag/advanced-persistent-threat",
		"https://medium.com/feed/tag/cyber-espionage",
		"https://medium.com/feed/tag/cyber-warfare",
		"https://medium.com/feed/tag/nation-state",
		"https://medium.com/feed/tag/hacktivism",
		"https://medium.com/feed/tag/cyber-insurance",
		"https://medium.com/feed/tag/security-governance",
		"https://medium.com/feed/tag/security-leadership",
		"https://medium.com/feed/tag/security-strategy",
		"https://medium.com/feed/tag/security-metrics",
		"https://medium.com/feed/tag/security-roi",
		"https://medium.com/feed/tag/security-budget",
		"https://medium.com/feed/tag/security-career",
		"https://medium.com/feed/tag/cybersecurity-jobs",
		"https://medium.com/feed/tag/security-certifications",
		"https://medium.com/feed/tag/cissp",
		"https://medium.com/feed/tag/ceh",
		"https://medium.com/feed/tag/oscp",
		"https://medium.com/feed/tag/security-plus",
		"https://medium.com/feed/tag/cybersecurity-education",
		"https://medium.com/feed/tag/cyber-range",
		"https://medium.com/feed/tag/capture-the-flag",
		"https://medium.com/feed/tag/ctf",
		"https://medium.com/feed/tag/security-competitions",
		"https://medium.com/feed/tag/cyber-drills",
		"https://medium.com/feed/tag/tabletop-exercises",
		"https://medium.com/feed/tag/security-conferences",
		"https://medium.com/feed/tag/black-hat",
		"https://medium.com/feed/tag/defcon",
		"https://medium.com/feed/tag/rsaconference",
	}
	
	var sources []FeedSource
	for _, url := range urls {
		sources = append(sources, FeedSource{
			URL:  url,
			Name: extractFeedName(url),
		})
	}
	
	return sources
}

// readREADME reads the existing README.md file
func readREADME() string {
	content, err := ioutil.ReadFile(readmeFilename)
	if err != nil && !os.IsNotExist(err) {
		fmt.Printf("⚠️ Error reading %s: %v\n", readmeFilename, err)
		return ""
	}
	return string(content)
}

// getCurrentDateGMT returns the current date in GMT format
func getCurrentDateGMT() string {
	return time.Now().In(time.UTC).Format(dateFormat)
}

// processFeeds fetches and processes all RSS feeds
func processFeeds(sources []FeedSource, readmeContent, currentDate string) map[string]*FeedEntry {
	entries := make(map[string]*FeedEntry)
	successCount := 0
	
	for i, source := range sources {
		fmt.Printf("[%d/%d] Fetching %s...", i+1, len(sources), source.Name)
		
		rss, err := fetchRSSFeed(source.URL)
		if err != nil {
			fmt.Printf(" ❌ Error: %v\n", err)
			continue
		}
		
		itemsProcessed := processFeedItems(rss, source, entries, readmeContent, currentDate)
		fmt.Printf(" ✅ (%d items)\n", itemsProcessed)
		successCount++
		
		if i < len(sources)-1 {
			time.Sleep(requestDelay)
		}
	}
	
	fmt.Printf("✅ Successfully processed %d/%d feeds\n", successCount, len(sources))
	return entries
}

// fetchRSSFeed retrieves and parses an RSS feed
func fetchRSSFeed(url string) (*RSS, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("error fetching URL %s: %v", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("received non-200 status code: %d", resp.StatusCode)
	}

	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body from %s: %v", url, err)
	}

	var rss RSS
	err = xml.Unmarshal(data, &rss)
	if err != nil {
		return nil, fmt.Errorf("error parsing XML from %s: %v", url, err)
	}

	return &rss, nil
}

// processFeedItems processes items from a single RSS feed
func processFeedItems(rss *RSS, source FeedSource, entries map[string]*FeedEntry, readmeContent, currentDate string) int {
	itemsProcessed := 0
	
	for _, item := range rss.Channel.Items {
		if entry, exists := entries[item.GUID]; exists {
			// Append to existing entry
			entry.Feeds += fmt.Sprintf(", [%s](%s)", source.Name, source.URL)
		} else {
			// Create new entry
			isNew := "Yes"
			if strings.Contains(readmeContent, item.GUID) {
				isNew = ""
			}
			
			entries[item.GUID] = &FeedEntry{
				Title:   item.Title,
				GUID:    item.GUID,
				PubDate: item.PubDate,
				Feeds:   fmt.Sprintf("[%s](%s)", source.Name, source.URL),
				IsNew:   isNew,
				IsToday: checkIfToday(item.PubDate, currentDate),
			}
		}
		itemsProcessed++
	}
	
	return itemsProcessed
}

// sortEntries sorts entries by IsNew and IsToday status
func sortEntries(entries map[string]*FeedEntry) []*FeedEntry {
	entryList := make([]*FeedEntry, 0, len(entries))
	for _, entry := range entries {
		entryList = append(entryList, entry)
	}

	sort.SliceStable(entryList, func(i, j int) bool {
		if entryList[i].IsNew == entryList[j].IsNew {
			return entryList[i].IsToday > entryList[j].IsToday
		}
		return entryList[i].IsNew > entryList[j].IsNew
	})

	return entryList
}

// generateOutput prints the formatted table of entries
func generateOutput(entries []*FeedEntry) {
	fmt.Println("\n📋 Results:")
	fmt.Println(outputTableHeader)
	
	newCount, todayCount := 0, 0
	for _, entry := range entries {
		if entry.IsNew == "Yes" {
			newCount++
		}
		if entry.IsToday == "Yes" {
			todayCount++
		}
		
		sanitizedTitle := sanitizeTitle(entry.Title)
		fmt.Printf("| %s | [%s](%s) | %s | %s | %s |\n",
			formatPubDate(entry.PubDate), sanitizedTitle, entry.GUID, entry.Feeds, entry.IsNew, entry.IsToday)
	}
	
	fmt.Printf("\n📊 Summary: %d new posts, %d posts from today\n", newCount, todayCount)
}

// Helper function to extract the feed name from the URL
func extractFeedName(url string) string {
	parts := strings.Split(url, "/")
	return parts[len(parts)-1]
}

// Helper function to sanitize the title
func sanitizeTitle(title string) string {
	// Remove newline characters
	title = strings.ReplaceAll(title, "\n", " ")
	title = strings.ReplaceAll(title, "\r", " ")

	// Escape special Markdown characters
	title = strings.ReplaceAll(title, "|", "\\|")
	title = strings.ReplaceAll(title, "[", "\\[")
	title = strings.ReplaceAll(title, "]", "\\]")

	// Trim if too long
	if len(title) > maxTitleLength {
		title = title[:maxTitleLength] + "..."
	}

	return title
}

// Helper function to check if the PubDate matches the current date
func checkIfToday(pubDate, currentDate string) string {
	pubTime, err := time.Parse(time.RFC1123, pubDate)
	if err != nil {
		// Try alternative date format
		pubTime, err = time.Parse(time.RFC1123Z, pubDate)
		if err != nil {
			return ""
		}
	}

	pubDateFormatted := pubTime.Format(dateFormat)
	if pubDateFormatted == currentDate {
		return "Yes"
	}
	return ""
}

// Helper function to format publication date for better readability
func formatPubDate(pubDate string) string {
	pubTime, err := time.Parse(time.RFC1123, pubDate)
	if err != nil {
		// Try alternative date format
		pubTime, err = time.Parse(time.RFC1123Z, pubDate)
		if err != nil {
			return pubDate // Return original if can't parse
		}
	}
	
	return pubTime.Format("02 Jan 15:04")
}
