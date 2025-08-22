# 🚀 Deployment Guide

This guide explains how to deploy and maintain the Medium Cybersecurity RSS Aggregator.

## 📋 Prerequisites

- GitHub repository with Actions enabled
- Go 1.23.4 or later (for local development)
- Basic understanding of GitHub Actions and Go

## 🔧 Initial Setup

### 1. Repository Configuration

1. **Fork/Clone the repository**
   ```bash
   git clone https://github.com/kdairatchi/medium-writeups.git
   cd medium-writeups
   ```

2. **Enable GitHub Actions**
   - Go to repository Settings → Actions → General
   - Ensure "Allow all actions and reusable workflows" is selected

3. **Configure GitHub Pages**
   - Go to repository Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `main` / `root`

### 2. Workflow Configuration

The repository includes three main workflows:

#### 🛡️ Main Aggregator (`actions.yml`)
- **Trigger**: Every 2 hours, weekday business hours (30min), weekends (6h)
- **Purpose**: Fetch RSS feeds, generate README and HTML dashboard
- **Features**: 
  - Automatic retry with exponential backoff
  - Rate limiting and error handling
  - GitHub Pages deployment
  - Failure notifications

#### 🔒 Security Scan (`security-scan.yml`)
- **Trigger**: Every 45 minutes, on code changes
- **Purpose**: Security audits and vulnerability scanning
- **Tools**: Gosec, TruffleHog, Nancy, Trivy

#### 🔧 Maintenance (`maintenance.yml`)
- **Trigger**: Weekly on Monday 2 AM UTC
- **Purpose**: Dependency updates, code cleanup, health checks

## 🌐 GitHub Pages Deployment

### Automatic Deployment

The main workflow automatically:
1. Generates `README.md` with latest posts
2. Creates `index.html` dashboard
3. Deploys to GitHub Pages

### Manual Deployment

```bash
# Trigger manual update
gh workflow run "🛡️ Medium Cybersecurity Writeups Aggregator"

# With specific parameters
gh workflow run "🛡️ Medium Cybersecurity Writeups Aggregator" \
  -f force_update=true \
  -f debug_mode=true \
  -f max_feeds=20
```

## 🔧 Configuration Options

### Environment Variables

The Go application supports these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_FEEDS` | 0 | Limit number of feeds (0 = no limit) |
| `RATE_LIMIT_DELAY` | 3 | Delay between requests (seconds) |
| `DEBUG_MODE` | false | Enable verbose logging |

### Workflow Inputs

#### Main Aggregator Workflow

- `force_update` (boolean): Force update even if no new content
- `debug_mode` (boolean): Enable debug output
- `max_feeds` (number): Maximum feeds to process (for testing)

#### Security Scan Workflow

- `scan_type`: Type of scan (full/quick/code-only/dependencies-only)

#### Maintenance Workflow

- `maintenance_type`: Type of maintenance (full/cleanup-only/update-deps/security-audit)

## 📊 Monitoring and Maintenance

### Health Monitoring

1. **Workflow Status**
   - Check Actions tab for run status
   - Failed runs create GitHub issues automatically

2. **RSS Feed Health**
   - Success rate displayed in README
   - Rate limiting automatically handled

3. **Security Monitoring**
   - Weekly security scans
   - SARIF reports uploaded to Security tab

### Manual Maintenance Tasks

#### Update RSS Feed Sources

1. Edit `main.go` to add/remove feed URLs
2. Test locally: `go run main.go`
3. Commit changes to trigger update

#### Customize Dashboard

1. Modify HTML template in `generateHTMLOutput()` function
2. Update CSS styles in the embedded stylesheet
3. Test changes locally before committing

## 🚨 Troubleshooting

### Common Issues

#### 1. Workflow Failures

**Rate Limiting (429 errors)**
- Automatic retry with exponential backoff
- Increase `RATE_LIMIT_DELAY` if persistent

**Build Failures**
- Check Go version compatibility
- Verify `go.mod` dependencies

**GitHub Pages Not Updating**
- Check Pages settings
- Verify `index.html` is being generated
- Check repository permissions

#### 2. RSS Feed Issues

**No New Posts Detected**
- Check if feeds are actually updated
- Verify GUID comparison logic
- Enable debug mode for details

**Invalid Feed URLs**
- Monitor error logs in workflow runs
- Remove broken feeds from source list

#### 3. Security Scan Failures

**Gosec Findings**
- Review security report in Actions
- Address high-priority findings
- Update exceptions if needed

**Dependency Vulnerabilities**
- Update Go dependencies: `go get -u ./...`
- Check for security patches

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Via workflow dispatch
gh workflow run "🛡️ Medium Cybersecurity Writeups Aggregator" \
  -f debug_mode=true

# Via environment variable (local)
DEBUG_MODE=true go run main.go
```

### Log Analysis

**Workflow Logs**
- View in Actions tab → specific run
- Download logs for offline analysis

**Application Logs**
- Embedded in workflow output
- Color-coded for different message types

## 🔄 Backup and Recovery

### Data Backup

- Repository content backed up via Git
- GitHub automatically backs up repositories
- RSS data regenerated from source feeds

### Recovery Procedures

**Complete Repository Loss**
1. Restore from backup/fork
2. Reconfigure GitHub Actions
3. Re-enable GitHub Pages
4. Run initial aggregation

**Workflow Corruption**
1. Reset workflow files from backup
2. Test with manual trigger
3. Monitor for proper execution

## 📈 Performance Optimization

### Scaling Considerations

- **Feed Limit**: Adjust for GitHub Actions timeout limits
- **Rate Limiting**: Balance speed vs. respectful crawling
- **Caching**: Consider implementing feed caching for large deployments

### Resource Usage

- **GitHub Actions Minutes**: ~5-10 minutes per run
- **Storage**: Minimal (RSS feeds don't require persistent storage)
- **Bandwidth**: Dependent on number of feeds and update frequency

## 🔐 Security Best Practices

1. **Secrets Management**
   - No secrets required for public RSS feeds
   - Use GitHub secrets for any API keys

2. **Access Control**
   - Limit workflow permissions to minimum required
   - Regular security audits via automation

3. **Dependency Management**
   - Weekly automated dependency updates
   - Vulnerability scanning for all dependencies

## 📞 Support and Maintenance

### Regular Maintenance Schedule

- **Daily**: Automatic RSS aggregation
- **Weekly**: Dependency updates and security scans
- **Monthly**: Performance review and optimization
- **Quarterly**: Full security audit

### Getting Help

1. **GitHub Issues**: Report bugs and feature requests
2. **Discussions**: Community support and questions
3. **Documentation**: Comprehensive guides in `/docs`

### Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed contribution guidelines.

---

*Last updated: 2025-08-22*