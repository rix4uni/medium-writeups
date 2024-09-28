package main

import (
    "encoding/xml"
    "fmt"
    "io/ioutil"
    "net/http"
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
    }
}
