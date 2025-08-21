package main

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

type RSS struct {
	Channel Channel `xml:"channel"`
}

type Channel struct {
	Items []Item `xml:"item"`
}

type Item struct {
	Title   string `xml:"title"`
	GUID    string `xml:"guid"`
	Link    string `xml:"link"`
	PubDate string `xml:"pubDate"`
}

type Entry struct {
	Title   string
	URL     string
	Pub     time.Time
	Feeds   []string
	IsNew   bool
	IsToday bool
}

const (
	maxTitleLength   = 65
	userAgent        = "MediumSecFeedBot/1.0"
	httpTimeout      = 20 * time.Second
	maxConcurrency   = 10
	dateLineFormat   = "Mon, 02 Jan 2006"
	markdownTimeFmt  = time.RFC1123 // “Mon, 02 Jan 2006 15:04:05 MST”
)

var httpClient = &http.Client{Timeout: httpTimeout}

func fetchRSSFeed(url string) (*RSS, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build request %s: %w", url, err)
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("fetch %s: HTTP %d", url, resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", url, err)
	}

	var rss RSS
	if err := xml.Unmarshal(data, &rss); err != nil {
		return nil, fmt.Errorf("parse %s: %w", url, err)
	}
	return &rss, nil
}

func main() {
	// List of RSS feed URLs (unchanged list, kept complete)
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
	}

	// Read README for "IsNew" detection (graceful if missing)
	readmeText := ""
	if b, err := os.ReadFile("README.md"); err == nil {
		readmeText = string(b)
	}

	nowUTC := time.Now().UTC()
	currentDateLine := nowUTC.Format(dateLineFormat)

	// Concurrent fetch
	type res struct {
		url  string
		rss  *RSS
		err  error
	}
	jobs := make(chan string)
	results := make(chan res)

	// Workers
	for w := 0; w < maxConcurrency; w++ {
		go func() {
			for u := range jobs {
				rss, err := fetchRSSFeed(u)
				results <- res{url: u, rss: rss, err: err}
			}
		}()
	}

	go func() {
		for _, u := range urls {
			jobs <- u
		}
		close(jobs)
	}()

	// Collect
	entries := make(map[string]*Entry) // key by URL (or GUID fallback)
	seen := 0
	done := 0
	expected := len(urls)
	for done < expected {
		r := <-results
		done++
		if r.err != nil {
			fmt.Fprintf(os.Stderr, "[WARN] %s\n", r.err)
			continue
		}
		tag := extractFeedName(r.url)

		for _, it := range r.rss.Channel.Items {
			seen++

			// Prefer link; fallback to guid
			url := firstNonEmpty(strings.TrimSpace(it.Link), strings.TrimSpace(it.GUID))
			if url == "" {
				// skip malformed
				continue
			}

			pub, ok := parseAnyDate(it.PubDate)
			if !ok {
				// skip if we can’t parse date to keep table clean
				continue
			}

			key := url // stable dedupe key
			e, exists := entries[key]
			if !exists {
				e = &Entry{
					Title: it.Title,
					URL:   url,
					Pub:   pub.UTC(),
					Feeds: []string{tag},
				}
				// "IsNew" if README doesn't contain URL or GUID (when present)
				if readmeText != "" {
					if !(strings.Contains(readmeText, url) || (it.GUID != "" && strings.Contains(readmeText, it.GUID))) {
						e.IsNew = true
					}
				}
				// Today?
				e.IsToday = isToday(pub.UTC(), currentDateLine)
				entries[key] = e
			} else {
				// merge tag
				if !contains(e.Feeds, tag) {
					e.Feeds = append(e.Feeds, tag)
				}
			}
		}
	}

	// To slice
	list := make([]*Entry, 0, len(entries))
	for _, e := range entries {
		list = append(list, e)
	}

	// Sort: IsNew desc, IsToday desc, Pub desc
	sort.SliceStable(list, func(i, j int) bool {
		if list[i].IsNew != list[j].IsNew {
			return list[i].IsNew && !list[j].IsNew
		}
		if list[i].IsToday != list[j].IsToday {
			return list[i].IsToday && !list[j].IsToday
		}
		return list[i].Pub.After(list[j].Pub)
	})

	// Output
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "| Time | Title | Feed | IsNew | IsToday |\n")
	fmt.Fprintf(&buf, "|-----------|-----|-----|:----:|:------:|\n")
	for _, e := range list {
		title := sanitizeTitle(e.Title)
		title = truncateRunes(title, maxTitleLength)
		feeds := linksForFeeds(e.Feeds)
		isNew := ""
		if e.IsNew {
			isNew = "Yes"
		}
		isToday := ""
		if e.IsToday {
			isToday = "Yes"
		}
		fmt.Fprintf(&buf, "| %s | [%s](%s) | %s | %s | %s |\n",
			e.Pub.Format(markdownTimeFmt), title, e.URL, feeds, isNew, isToday)
	}

	// Print final table to stdout
	fmt.Print(buf.String())
}

/* ---------------------- Helpers ---------------------- */

func extractFeedName(url string) string {
	parts := strings.Split(strings.TrimSuffix(url, "/"), "/")
	if len(parts) == 0 {
		return url
	}
	return parts[len(parts)-1]
}

func sanitizeTitle(title string) string {
	// Remove newlines
	title = strings.ReplaceAll(title, "\n", " ")
	title = strings.ReplaceAll(title, "\r", " ")
	// Escape table/link breakers
	title = strings.ReplaceAll(title, "|", "\\|")
	title = strings.ReplaceAll(title, "[", "\\[")
	title = strings.ReplaceAll(title, "]", "\\]")
	return strings.TrimSpace(title)
}

func truncateRunes(s string, max int) string {
	if max <= 0 {
		return ""
	}
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	rs := []rune(s)
	return string(rs[:max]) + "..."
}

func isToday(pub time.Time, currentDateLine string) bool {
	// Compare on yyyy-mm-dd via formatted line for safety with your existing style
	return pub.Format(dateLineFormat) == currentDateLine
}

func parseAnyDate(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	layouts := []string{
		time.RFC1123Z,               // "Mon, 02 Jan 2006 15:04:05 -0700"
		time.RFC1123,                // "Mon, 02 Jan 2006 15:04:05 MST"
		time.RFC822Z,                // "02 Jan 06 15:04 -0700"
		time.RFC822,                 // "02 Jan 06 15:04 MST"
		time.RFC3339,                // ISO 8601
		"Mon, 02 Jan 2006 15:04:05 -0700",
		"Mon, 02 Jan 2006 15:04:05 MST",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func contains(sl []string, s string) bool {
	for _, v := range sl {
		if v == s {
			return true
		}
	}
	return false
}

func linksForFeeds(tags []string) string {
	// Render "tag" list as markdown links, comma-separated
	if len(tags) == 0 {
		return ""
	}
	// de-dupe defensively
	seen := map[string]struct{}{}
	out := make([]string, 0, len(tags))
	for _, t := range tags {
		if _, ok := seen[t]; ok {
			continue
		}
		seen[t] = struct{}{}
		out = append(out, fmt.Sprintf("[%s](https://medium.com/feed/tag/%s)", t, t))
	}
	return strings.Join(out, ", ")
}

func firstNonEmpty(ss ...string) string {
	for _, s := range ss {
		if strings.TrimSpace(s) != "" {
			return s
		}
	}
	return ""
}
