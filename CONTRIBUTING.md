# 🤝 Contributing to Medium Cybersecurity Writeups Aggregator

Thank you for your interest in contributing! This project aggregates cybersecurity content from Medium to help the security community stay informed. Every contribution helps make cybersecurity knowledge more accessible.

## 🚀 Quick Start

1. 🍴 **Fork the repository**
2. 🌿 **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. 💻 **Make your changes**
4. ✅ **Test your changes**
5. 📝 **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. 📤 **Push to the branch** (`git push origin feature/amazing-feature`)
7. 🔄 **Open a Pull Request**

## 🎯 Ways to Contribute

### 📡 Adding New RSS Feeds

The most valuable contribution is adding new cybersecurity RSS feeds from Medium:

1. **Edit `main.go`**
2. **Find the appropriate category** (Bug Bounty, Web Security, etc.)
3. **Add the new Medium RSS feed URL**
4. **Test locally** to ensure it works

**Example:**
```go
// Add to the appropriate category
webSecFeeds := []string{
    "https://medium.com/feed/tag/web-security",
    "https://medium.com/feed/tag/your-new-tag", // ← Add here
    // ... existing feeds
}
```

### 🏷️ Adding New Categories

To add a completely new security category:

1. **Create a new category section** in the `getFeedSources()` function
2. **Choose an appropriate priority** (lower numbers = higher priority)
3. **Select a distinctive color** for the category
4. **Add relevant RSS feeds**

**Example:**
```go
// New category (Priority 26)
newCategoryFeeds := []string{
    "https://medium.com/feed/tag/new-security-topic",
    "https://medium.com/feed/tag/related-topic",
}
addFeedsWithCategory(&sources, newCategoryFeeds, "New Category Name", 26, "#COLOR_HEX")
```

### 🎨 Improving the Dashboard

The HTML dashboard can always be improved:

- **🔍 Enhanced search functionality**
- **📊 Better statistics visualization**
- **📱 Mobile responsiveness improvements**
- **🎨 UI/UX enhancements**
- **⚡ Performance optimizations**

### 📚 Documentation Improvements

Help improve the documentation:

- **📖 Fix typos or unclear explanations**
- **➕ Add missing documentation**
- **🔄 Update outdated information**
- **📋 Add more examples**

### 🔧 Bug Fixes and Features

- **🐛 Fix reported bugs**
- **⚡ Performance improvements**
- **🔒 Security enhancements**
- **🆕 New features**

## 📋 Contribution Guidelines

### 🔍 RSS Feed Criteria

When adding new RSS feeds, ensure they meet these criteria:

- ✅ **Medium-hosted**: Must be from medium.com
- ✅ **Cybersecurity focused**: Content should be security-related
- ✅ **Active**: Recent posts (within last 6 months)
- ✅ **Quality content**: Well-written, informative posts
- ✅ **English language**: Primary content in English
- ✅ **Appropriate tags**: Use specific, relevant Medium tags

### 📝 Code Quality Standards

- **🧪 Test your changes** locally before submitting
- **📖 Follow existing code style** and conventions
- **💬 Add comments** for complex logic
- **🔒 Ensure security best practices**
- **⚡ Optimize for performance**
- **📱 Maintain mobile compatibility**

### 🎯 Commit Message Format

Use clear, descriptive commit messages:

```
🔧 Add new AI security RSS feeds to category

- Added 5 new Medium feeds focusing on AI/ML security
- Updated category priority and color scheme
- Tested locally with successful aggregation

Fixes #123
```

**Commit Emoji Guide:**
- 🆕 `:new:` - New features
- 🔧 `:wrench:` - Configuration/setup changes
- 🐛 `:bug:` - Bug fixes
- 📚 `:books:` - Documentation
- 🎨 `:art:` - UI/UX improvements
- ⚡ `:zap:` - Performance improvements
- 🔒 `:lock:` - Security improvements
- 🧪 `:test_tube:` - Tests

### 📤 Pull Request Guidelines

**Before submitting:**
- ✅ Test locally (`go run main.go`)
- ✅ Verify HTML output renders correctly
- ✅ Check GitHub Actions pass
- ✅ Update documentation if needed
- ✅ Add yourself to contributors if desired

**PR Description should include:**
- 📋 Clear description of changes
- 🎯 Motivation/reasoning for changes
- 🧪 Testing performed
- 📸 Screenshots for UI changes
- 🔗 References to related issues

## 🛠️ Development Setup

### Prerequisites

- 📦 **Go 1.23.4+**
- 🔄 **Git**
- 🌐 **Web browser** (for testing HTML output)

### Local Development

1. **Clone your fork:**
```bash
git clone https://github.com/YOUR-USERNAME/medium-writeups.git
cd medium-writeups
```

2. **Set up Go module:**
```bash
go mod init medium-writeups-aggregator
go mod tidy
```

3. **Run locally:**
```bash
go run main.go
```

4. **View results:**
- Open `README.md` for markdown output
- Open `index.html` for dashboard

### Testing Changes

**Test with limited feeds** (for faster development):
```bash
export MAX_FEEDS=10
export DEBUG_MODE=true
go run main.go
```

**Test specific categories** by temporarily commenting out others in `main.go`.

## 🔒 Security Considerations

Since this project deals with cybersecurity content:

- **🔍 Validate all RSS feed URLs** before adding
- **🧹 Ensure proper content sanitization**
- **⏱️ Respect rate limiting** for Medium servers
- **🔒 Follow secure coding practices**
- **📋 Report security issues** privately first

## 🏆 Recognition

Contributors will be recognized in:

- 📋 **README.md** contributors section
- 🎉 **Release notes** for significant contributions
- 💬 **GitHub Discussions** shout-outs
- 🌟 **Special mentions** in documentation

## 📞 Getting Help

Need help contributing?

1. 📖 **Read the documentation** in `/docs`
2. 🔍 **Search existing issues** and discussions
3. 💬 **Start a discussion** for questions
4. 🆘 **Create an issue** for bugs

## 🌟 High-Impact Contributions

These contributions are especially valuable:

### 🎯 Most Needed
- **📡 New RSS feeds** from active Medium security writers
- **🏷️ Specialized categories** (AI Security, IoT Security, etc.)
- **📱 Mobile UI improvements**
- **⚡ Performance optimizations**

### 🚀 Advanced
- **🔌 API endpoints** for external consumption
- **📊 Advanced analytics** and trending analysis
- **🔄 Integration** with other security feeds
- **🤖 AI-powered** content categorization

## 📜 Code of Conduct

This project follows the **Contributor Covenant Code of Conduct**:

- 🤝 **Be respectful** and inclusive
- 💭 **Be open** to feedback and suggestions
- 🎯 **Focus on what's best** for the community
- 🆘 **Help others** learn and contribute
- 🔒 **Maintain confidentiality** of security issues

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

## 🙏 Thank You

Every contribution, no matter how small, helps the cybersecurity community stay informed and secure. Your efforts help democratize access to security knowledge!

**Happy Contributing! 🚀**

---

*For questions about contributing, open an issue or start a discussion. We're here to help!*