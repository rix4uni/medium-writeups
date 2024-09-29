package main

import (
    "encoding/xml"
    "fmt"
    "io/ioutil"
    "net/http"
    "time"
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
    PubDate string `xml:"pubDate"`
}

func fetchRSSFeed(url string) (*RSS, error) {
    // Fetch the RSS feed
    resp, err := http.Get(url)
    if err != nil {
        return nil, fmt.Errorf("Error fetching URL %s: %v", url, err)
    }
    defer resp.Body.Close()

    // Read the RSS feed
    data, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("Error reading response body from %s: %v", url, err)
    }

    // Parse the RSS feed
    var rss RSS
    err = xml.Unmarshal(data, &rss)
    if err != nil {
        return nil, fmt.Errorf("Error parsing XML from %s: %v", url, err)
    }

    return &rss, nil
}

func main() {
    // List of RSS feed URLs
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

    for _, url := range urls {
        // Fetch and parse each feed
        rss, err := fetchRSSFeed(url)
        if err != nil {
            fmt.Println(err)
            continue
        }

        // Print the URL as a header
        fmt.Printf("## %s\n", url)

        // Print the required fields in the markdown format
        for _, item := range rss.Channel.Items {
            fmt.Printf("- %s - [%s](https://freedium.cfd/%s)\n", item.PubDate, item.Title, item.GUID)
        }

        fmt.Println() // Add a blank line between sections

        // Sleep for 5 seconds before fetching the next URL
        time.Sleep(5 * time.Second)
    }
}
