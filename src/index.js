require('dotenv').config({ override: true });
const express = require('express');
const Scheduler = require('./scheduler');

// Validate environment variables
const requiredEnvVars = ['SLACK_WEBHOOK_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease create a .env file based on .env.example');
  process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize scheduler
const scheduler = new Scheduler(process.env.SLACK_WEBHOOK_URL);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'NewsBot Slack',
    timestamp: new Date().toISOString(),
    timezone: process.env.TIMEZONE || 'Europe/Berlin',
    schedule: process.env.CRON_SCHEDULE || '0 8 * * *'
  });
});

// Manual trigger endpoint (for testing)
app.post('/trigger', async (req, res) => {
  console.log('Manual trigger received via API');

  try {
    // Execute the job asynchronously
    scheduler.executeNow().catch(error => {
      console.error('Error in manual execution:', error);
    });

    res.json({
      status: 'triggered',
      message: 'News job has been triggered and is running in the background',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test Slack connection endpoint
app.post('/test-slack', async (req, res) => {
  console.log('Slack connection test triggered');

  try {
    const SlackService = require('./slackService');
    const slackService = new SlackService(process.env.SLACK_WEBHOOK_URL);
    await slackService.sendTestMessage();

    res.json({
      status: 'success',
      message: 'Test message sent to Slack successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'NewsBot Slack',
    version: '1.0.0',
    status: 'running',
    schedule: {
      cron: process.env.CRON_SCHEDULE || '0 8 * * *',
      timezone: process.env.TIMEZONE || 'Europe/Berlin',
      nextRun: scheduler.getNextRunTime()
    },
    config: {
      keywords: process.env.NEWS_KEYWORDS?.split(',').map(k => k.trim()) || [
        'retail innovation',
        'autonomous delivery',
        'last mile delivery',
        'retail technology'
      ],
      maxItems: parseInt(process.env.MAX_NEWS_ITEMS) || 10
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /status',
      'POST /trigger',
      'POST /test-slack'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Handle test mode (--test flag)
const isTestMode = process.argv.includes('--test');

if (isTestMode) {
  console.log('\n🧪 Test mode enabled - executing job once and exiting\n');

  scheduler.executeNow()
    .then(() => {
      console.log('\n✓ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n✗ Test failed:', error);
      process.exit(1);
    });
} else {
  // Start the server
  app.listen(PORT, () => {
    console.log(`\n✓ Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   Status: http://localhost:${PORT}/status`);
    console.log(`   Manual trigger: POST http://localhost:${PORT}/trigger`);
    console.log(`   Test Slack: POST http://localhost:${PORT}/test-slack\n`);
  });

  // Start the scheduler
  scheduler.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM signal, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT signal, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });
}
