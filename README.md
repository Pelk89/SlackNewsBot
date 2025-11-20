# NewsBot Slack - Retail Innovation Daily News

A Slack bot that automatically delivers daily news summaries about retail innovation, autonomous delivery, and last-mile technology every morning at 8 AM.

## Features

- 📰 **Multi-Source News Aggregation** - Combines news from multiple sources:
  - Google News RSS feeds
  - Retail-specific sources (Retail Dive, Supply Chain Dive, Retail TouchPoints)
  - Tech sources (TechCrunch Logistics)
  - **NewsAPI.org** - Access to 80,000+ sources (requires free API key)
  - **X (Twitter)** - Real-time updates from retail industry accounts (optional)
- 🎯 **Intelligent Scoring System** - Ranks news by relevance:
  - Keyword match quality (40%)
  - Source authority (30%)
  - Freshness/recency (20%)
  - Engagement metrics (10%)
- 🔍 **Advanced Deduplication** - Smart duplicate detection across all sources
- 🎨 **Source Diversification** - Prevents single-source dominance (max 3 per source)
- 🔔 Scheduled delivery to Slack at 8 AM (configurable)
- 🎯 Focused on retail innovation topics:
  - Retail Innovation
  - Autonomous Delivery
  - Last Mile Delivery
  - Retail Technology
  - Grocery Innovation
- 🐳 Docker support for easy deployment
- 📊 REST API endpoints for manual triggers and monitoring
- 🌍 Timezone support (default: Europe/Berlin)

## Prerequisites

- Node.js 20+ (if running locally)
- Docker & Docker Compose (for containerized deployment)
- Slack workspace with permissions to create incoming webhooks

## Quick Start

### 1. Set Up Slack Incoming Webhook

1. Go to your Slack workspace settings
2. Navigate to **Apps** → **Manage Apps**
3. Search for "Incoming Webhooks" and add it
4. Create a new webhook for your desired channel
5. Copy the webhook URL (e.g., `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`)

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Slack webhook URL
nano .env
```

**Required configuration in `.env`:**
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Optional configuration:**
```env
# Schedule (default: 8 AM daily)
CRON_SCHEDULE=0 8 * * *
TIMEZONE=Europe/Berlin

# News settings
NEWS_KEYWORDS=retail innovation,autonomous delivery,last mile delivery,retail technology,grocery innovation
MAX_NEWS_ITEMS=10

# Server settings
PORT=3000
NODE_ENV=production
```

### 3. Run with Docker (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 4. Run Locally (Alternative)

```bash
# Install dependencies
npm install

# Run in production mode
npm start

# Run in development mode with auto-reload
npm run dev

# Run test mode (execute once and exit)
npm run test
```

## API Endpoints

The bot includes a REST API server for monitoring and manual control:

### Health Check
```bash
GET http://localhost:3000/health
```
Returns the service health status.

### Status Information
```bash
GET http://localhost:3000/status
```
Returns detailed status including schedule, configuration, and next run time.

### Manual Trigger
```bash
POST http://localhost:3000/trigger
```
Manually triggers the news job immediately (useful for testing).

Example:
```bash
curl -X POST http://localhost:3000/trigger
```

### Test Slack Connection
```bash
POST http://localhost:3000/test-slack
```
Sends a test message to Slack to verify the webhook is configured correctly.

Example:
```bash
curl -X POST http://localhost:3000/test-slack
```

## Cron Schedule Format

The `CRON_SCHEDULE` uses standard cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

**Examples:**
- `0 8 * * *` - Every day at 8:00 AM
- `0 9 * * 1-5` - Every weekday at 9:00 AM
- `0 8,17 * * *` - Every day at 8:00 AM and 5:00 PM
- `30 7 * * *` - Every day at 7:30 AM

## Advanced Configuration

### Customizing News Keywords

Edit the `NEWS_KEYWORDS` in your `.env` file to customize what topics are searched:

```env
NEWS_KEYWORDS=retail innovation,autonomous delivery,grocery tech,ecommerce,supply chain automation
```

The bot will search all enabled sources for each keyword and aggregate the results.

### NewsAPI Integration

NewsAPI.org provides access to 80,000+ news sources and is **enabled by default** (requires API key):

1. Create a free account at [NewsAPI.org](https://newsapi.org/)
2. Copy your API key
3. Add to `.env`:
   ```env
   NEWS_API_KEY=your_api_key_here
   ```
4. NewsAPI is already enabled in `src/config/sources.json`

**Note:** Free tier allows 100 requests/day (sufficient for daily bot runs).

### X (Twitter) Integration (Optional)

Get real-time updates from retail industry Twitter accounts using Nitter (privacy-focused Twitter frontend):

**How it works:**
- Fetches tweets from configured Twitter accounts via Nitter RSS feeds
- No Twitter API key required
- Privacy-focused (uses Nitter, not official Twitter API)

**To enable:**

1. Edit `src/config/sources.json`:
   ```json
   {
     "id": "x-twitter",
     "enabled": true,
     "config": {
       "nitterInstance": "nitter.privacydev.net",
       "accounts": [
         "RetailDive",
         "TechCrunch",
         "MITretail",
         "NRFnews",
         "RetailWire"
       ]
     }
   }
   ```

2. Customize the accounts list with retail/tech Twitter accounts you want to follow

**Note:** Nitter instances can be slow or rate-limited. X integration is disabled by default. Enable only if you need real-time Twitter updates.

**Alternative Nitter instances:**
- `nitter.net`
- `nitter.privacydev.net`
- `nitter.poast.org`

If one instance is slow, try another in the `nitterInstance` config.

### Customizing News Sources

Edit `src/config/sources.json` to:
- Enable/disable specific sources
- Add new RSS feeds
- Adjust source priorities
- Configure source-specific settings

**Example - Adding a new RSS source:**

```json
{
  "id": "my-custom-source",
  "name": "My Custom Source",
  "type": "rss",
  "enabled": true,
  "priority": 2,
  "config": {
    "feedUrl": "https://example.com/feed.xml"
  }
}
```

### Scoring Configuration

Adjust scoring weights in `src/config/sources.json`:

```json
{
  "scoring": {
    "keywordMatch": 0.4,      // 40% - How well keywords match
    "sourceAuthority": 0.3,   // 30% - Trust in the source
    "freshness": 0.2,         // 20% - How recent the news is
    "engagement": 0.1         // 10% - Social engagement (future)
  }
}
```

### Source Authority Ratings

Configure trust levels for each source (0.0 to 1.0):

```json
{
  "sourceAuthority": {
    "retaildive": 1.0,           // Highest authority
    "supply-chain-dive": 0.95,
    "techcrunch-logistics": 0.85,
    "google-news": 0.7,
    "my-custom-source": 0.8
  }
}
```

### Diversification Settings

Control source diversity in results:

```json
{
  "diversification": {
    "maxPerSource": 3,    // Max news items from a single source
    "minSources": 2       // Minimum number of different sources
  }
}
```

## Project Structure

```
NewsBotSlack/
├── src/
│   ├── index.js                      # Main application entry point
│   ├── newsService.js                # News aggregation orchestrator
│   ├── slackService.js               # Slack webhook integration
│   ├── scheduler.js                  # Cron job scheduler
│   ├── sources/
│   │   ├── SourceManager.js          # Multi-source coordinator
│   │   ├── aggregator.js             # News aggregation & normalization
│   │   ├── scorer.js                 # Relevance scoring engine
│   │   └── sources/
│   │       ├── BaseSource.js         # Abstract base class
│   │       ├── GoogleNewsSource.js   # Google News RSS implementation
│   │       ├── RSSSource.js          # Generic RSS feed source
│   │       ├── NewsAPISource.js      # NewsAPI.org integration
│   │       └── XSource.js            # X (Twitter) via Nitter
│   ├── config/
│   │   └── sources.json              # Source configurations
│   └── utils/
│       └── deduplicator.js           # Advanced deduplication
├── .env.example                      # Environment variable template
├── .gitignore                        # Git ignore rules
├── package.json                      # Node.js dependencies
├── Dockerfile                        # Docker container configuration
├── docker-compose.yml                # Docker Compose orchestration
├── test-sources.js                   # Source testing utility
├── test-integration.js               # Integration testing utility
└── README.md                         # This file
```

## Monitoring & Logs

### Docker Logs
```bash
# View real-time logs
docker-compose logs -f newsbot

# View last 100 lines
docker-compose logs --tail=100 newsbot
```

### Container Status
```bash
# Check if container is running
docker-compose ps

# Check container health
docker inspect newsbot-slack | grep -A 10 "Health"
```

## Troubleshooting

### Issue: No messages received in Slack

**Solutions:**
1. Verify webhook URL is correct in `.env`
2. Test the connection: `curl -X POST http://localhost:3000/test-slack`
3. Check logs: `docker-compose logs -f`
4. Ensure the Slack channel exists and the webhook is active

### Issue: Container keeps restarting

**Solutions:**
1. Check logs: `docker-compose logs newsbot`
2. Verify `.env` file exists and contains valid configuration
3. Ensure `SLACK_WEBHOOK_URL` is set correctly

### Issue: Wrong timezone for scheduled jobs

**Solutions:**
1. Set `TIMEZONE` in `.env` (e.g., `Europe/Berlin`, `America/New_York`)
2. Restart the container: `docker-compose restart`

### Issue: Not finding relevant news

**Solutions:**
1. Adjust `NEWS_KEYWORDS` in `.env` to be more specific
2. Increase `MAX_NEWS_ITEMS` to see more results
3. Manually trigger to test: `curl -X POST http://localhost:3000/trigger`

## Development

### Running Tests
```bash
# Execute job once and exit
npm run test
```

### Testing News Sources

Test individual sources or the full aggregation:

```bash
# Test all sources
node test-sources.js

# Test specific source by ID
node test-sources.js google-news
node test-sources.js retaildive

# Test full integration
node test-integration.js
```

### Code Structure

**Core Services:**
- **newsService.js**: News aggregation orchestrator (uses SourceManager)
- **slackService.js**: Formats messages and sends them to Slack via webhook
- **scheduler.js**: Manages cron scheduling and job execution
- **index.js**: Express server with API endpoints and application lifecycle

**Multi-Source Architecture:**
- **SourceManager.js**: Coordinates fetching from all sources in parallel
- **aggregator.js**: Combines results, deduplicates, and normalizes
- **scorer.js**: Scores news by relevance using configurable weights
- **deduplicator.js**: Advanced duplicate detection across sources

**Source Implementations:**
- **BaseSource.js**: Abstract base class for all sources
- **GoogleNewsSource.js**: Google News RSS feed integration
- **RSSSource.js**: Generic RSS feed parser (for Retail Dive, etc.)
- **NewsAPISource.js**: NewsAPI.org integration (80,000+ sources)
- **XSource.js**: X (Twitter) integration via Nitter RSS feeds

**Configuration:**
- **sources.json**: Source definitions, scoring weights, authority ratings

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_WEBHOOK_URL` | ✅ Yes | - | Slack incoming webhook URL |
| `CRON_SCHEDULE` | No | `0 8 * * *` | Cron schedule for daily job |
| `TIMEZONE` | No | `Europe/Berlin` | Timezone for scheduling |
| `NEWS_KEYWORDS` | No | See default | Comma-separated search keywords |
| `MAX_NEWS_ITEMS` | No | `10` | Maximum news items to display |
| `NEWS_API_KEY` | No | - | NewsAPI.org API key (optional) |
| `NEWS_SOURCES_CONFIG` | No | `src/config/sources.json` | Path to sources configuration |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `production` | Node environment |

## Multi-Source Architecture Benefits

### Why Multiple Sources?

**Better Coverage:**
- Google News aggregates from many sources but may miss specialized retail publications
- Direct RSS feeds from Retail Dive, Supply Chain Dive provide expert coverage
- TechCrunch Logistics covers tech/startup perspective
- **NewsAPI** provides access to 80,000+ additional sources worldwide
- **X (Twitter)** offers real-time updates from industry leaders and publications

**Quality Over Quantity:**
- Source authority ratings ensure trusted sources rank higher
- Relevance scoring prioritizes news that matches your keywords
- Diversification prevents one source from dominating results

**Resilience:**
- If one source fails, others continue working (graceful degradation)
- Parallel fetching from all sources for speed
- Per-source error handling prevents total failures

**Customizable:**
- Easy to add new RSS feeds via `sources.json`
- Configure scoring weights to match your priorities
- Enable/disable sources without code changes

## Security Notes

- Never commit your `.env` file to version control
- Keep your Slack webhook URL secret
- Keep your NewsAPI key private
- The Docker container runs as a non-root user
- Logs are automatically rotated to prevent disk space issues

## Support & Contribution

For issues, questions, or contributions, please refer to the project repository.

## License

ISC

---

**Built for Innovation Managers in Retail** 🚀

Stay updated on the latest in retail innovation, autonomous delivery, and last-mile technology, delivered fresh to your Slack every morning!
