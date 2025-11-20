# NewsBot Slack - Retail Innovation Daily News

A Slack bot that automatically delivers daily news summaries about retail innovation, autonomous delivery, and last-mile technology every morning at 8 AM.

## Features

- 📰 Automated daily news aggregation from Google News RSS feeds
- 🔔 Scheduled delivery to Slack at 8 AM (configurable)
- 🎯 Focused on retail innovation topics:
  - Retail Innovation
  - Autonomous Delivery
  - Last Mile Delivery
  - Retail Technology
  - Grocery Innovation
- 🐳 Docker support for easy deployment
- 🔍 Smart deduplication to avoid repetitive content
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

## Customizing News Sources

Edit the `NEWS_KEYWORDS` in your `.env` file to customize what topics are searched:

```env
NEWS_KEYWORDS=retail innovation,autonomous delivery,grocery tech,ecommerce,supply chain automation
```

The bot will search Google News for each keyword and aggregate the results.

## Project Structure

```
NewsBotSlack/
├── src/
│   ├── index.js          # Main application entry point
│   ├── newsService.js    # Google News RSS fetching logic
│   ├── slackService.js   # Slack webhook integration
│   └── scheduler.js      # Cron job scheduler
├── .env.example          # Environment variable template
├── .gitignore           # Git ignore rules
├── package.json         # Node.js dependencies
├── Dockerfile           # Docker container configuration
├── docker-compose.yml   # Docker Compose orchestration
└── README.md           # This file
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

### Code Structure

- **newsService.js**: Handles fetching and parsing Google News RSS feeds
- **slackService.js**: Formats messages and sends them to Slack via webhook
- **scheduler.js**: Manages cron scheduling and job execution
- **index.js**: Express server with API endpoints and application lifecycle

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_WEBHOOK_URL` | ✅ Yes | - | Slack incoming webhook URL |
| `CRON_SCHEDULE` | No | `0 8 * * *` | Cron schedule for daily job |
| `TIMEZONE` | No | `Europe/Berlin` | Timezone for scheduling |
| `NEWS_KEYWORDS` | No | See default | Comma-separated search keywords |
| `MAX_NEWS_ITEMS` | No | `10` | Maximum news items to display |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `production` | Node environment |

## Security Notes

- Never commit your `.env` file to version control
- Keep your Slack webhook URL secret
- The Docker container runs as a non-root user
- Logs are automatically rotated to prevent disk space issues

## Support & Contribution

For issues, questions, or contributions, please refer to the project repository.

## License

ISC

---

**Built for Innovation Managers in Retail** 🚀

Stay updated on the latest in retail innovation, autonomous delivery, and last-mile technology, delivered fresh to your Slack every morning!
