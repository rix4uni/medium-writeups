# 🚀 Quick Start Guide

Welcome to the Medium Cybersecurity Writeups Aggregator! This guide will help you get up and running quickly.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- ✅ **Go 1.23.4+** - [Download here](https://golang.org/dl/)
- ✅ **Git** - [Download here](https://git-scm.com/downloads)
- ✅ **GitHub account** - [Sign up here](https://github.com/join)

## ⚡ Quick Setup (5 minutes)

### 1. 🍴 Fork the Repository

1. Go to the [repository page](https://github.com/your-username/medium-writeups)
2. Click the "Fork" button in the top-right corner
3. Select your GitHub account as the destination

### 2. 📥 Clone Your Fork

```bash
git clone https://github.com/YOUR-USERNAME/medium-writeups.git
cd medium-writeups
```

### 3. 🔧 Initialize Go Module

```bash
# Initialize Go module (if not already done)
go mod init medium-writeups-aggregator
go mod tidy
```

### 4. 🏃 Run the Aggregator

```bash
# Run the aggregator locally
go run main.go
```

This will:
- 📡 Fetch the latest cybersecurity posts from Medium
- 📝 Generate a README.md file
- 🌐 Create an index.html file for GitHub Pages

### 5. 🔍 View the Results

- **README.md** - Markdown formatted list of posts
- **index.html** - Interactive HTML dashboard

Open `index.html` in your browser to see the interactive dashboard!

## 🚀 GitHub Pages Deployment

### Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select "GitHub Actions"
5. Save the settings

### 🔄 Automatic Updates

The aggregator will automatically:
- 🕐 Run every 2 hours during business hours
- 🌙 Run every 2 hours during off hours
- 📊 Update both README.md and the HTML dashboard
- 🚀 Deploy changes to GitHub Pages

## 🎛️ Configuration Options

### Environment Variables

You can customize the behavior using environment variables:

```bash
# Limit number of feeds (for testing)
export MAX_FEEDS=10

# Enable debug mode
export DEBUG_MODE=true

# Adjust rate limiting (seconds between requests)
export RATE_LIMIT_DELAY=3
```

### Manual Workflow Trigger

You can manually trigger the aggregator:

1. Go to the **Actions** tab in your repository
2. Select "Medium Cybersecurity Writeups Aggregator"
3. Click "Run workflow"
4. Optionally adjust parameters:
   - **Force update**: Update even if no new content
   - **Debug mode**: Enable verbose logging
   - **Max feeds**: Limit feeds for testing

## 📊 Understanding the Output

### README.md Structure

The generated README includes:

- 📈 **Quick Stats** - Summary statistics
- 🏷️ **Categories Overview** - Posts by category
- ℹ️ **Update Information** - Last update details
- 📰 **Latest Posts** - Table of all posts
- 🔗 **Useful Links** - Related resources
- 📈 **Trending Topics** - Popular topics

### HTML Dashboard Features

The interactive dashboard includes:

- 📊 **Live Statistics** - Real-time metrics
- 🔍 **Search & Filter** - Find specific content
- 📱 **Mobile Responsive** - Works on all devices
- 🎨 **Category Badges** - Visual organization
- ⏰ **Time Indicators** - Recent vs older posts

## 🔧 Customization

### Adding New RSS Feeds

Edit `main.go` and add new feeds to the appropriate category:

```go
// Example: Add new bug bounty feeds
bugBountyFeeds := []string{
    "https://medium.com/feed/tag/your-new-tag",
    // ... existing feeds
}
```

### Modifying Categories

You can adjust the category priorities and colors in the `getFeedSources()` function.

### Styling the Dashboard

The HTML dashboard uses Tailwind CSS. You can customize the styling in the `generateHTMLOutput()` function.

## 🛡️ Security Features

This aggregator includes several security features:

- 🔒 **Input Sanitization** - All content is sanitized
- ⏱️ **Rate Limiting** - Respects Medium's servers
- 🔍 **Vulnerability Scanning** - Automated security checks
- 📋 **License Compliance** - Tracks open source licenses

## 🆘 Troubleshooting

### Common Issues

**Build Errors**
```bash
# If you get module errors, try:
go mod tidy
go clean -modcache
```

**Rate Limiting**
- The aggregator includes automatic rate limiting
- If you see 429 errors, wait a few minutes and try again

**GitHub Actions Failing**
- Check the Actions tab for detailed error logs
- Ensure repository settings allow GitHub Actions

### Getting Help

1. 📖 Check the [full documentation](README.md)
2. 🔍 Search [existing issues](https://github.com/your-username/medium-writeups/issues)
3. 💬 Start a [discussion](https://github.com/your-username/medium-writeups/discussions)
4. 🐛 Create a new issue with details

## 🎯 Next Steps

Once you have the basic setup working:

1. 📚 Explore the [Architecture Guide](architecture.md)
2. 🔧 Learn about [Configuration Options](configuration.md)
3. 🤝 Consider [Contributing](../CONTRIBUTING.md) improvements
4. 🔒 Review [Security Documentation](security.md)

## 🌟 Pro Tips

- 🔄 Use manual workflow triggers for testing
- 📊 Monitor the Actions tab for execution logs
- 🎨 Customize the HTML dashboard for your needs
- 📱 Test the mobile responsiveness
- 🔍 Use the search functionality to find specific topics

---

**🎉 Congratulations!** You now have a fully functional cybersecurity news aggregator!

The aggregator will automatically keep your content fresh and deploy it to GitHub Pages. Enjoy staying up-to-date with the latest cybersecurity content!