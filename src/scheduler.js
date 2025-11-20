const cron = require('node-cron');
const NewsService = require('./newsService');
const SlackService = require('./slackService');

class Scheduler {
  constructor(slackWebhookUrl) {
    this.newsService = new NewsService();
    this.slackService = new SlackService(slackWebhookUrl);
    this.cronSchedule = process.env.CRON_SCHEDULE || '0 8 * * *'; // Default: 8 AM daily
    this.timezone = process.env.TIMEZONE || 'Europe/Berlin';
    this.task = null;
  }

  /**
   * Execute the daily news job
   */
  async executeDailyJob() {
    console.log('\n===========================================');
    console.log(`📰 Starting daily news job at ${new Date().toLocaleString('de-DE')}`);
    console.log('===========================================\n');

    try {
      // Fetch news
      console.log('→ Fetching retail innovation news...');
      const newsItems = await this.newsService.fetchRetailInnovationNews();

      if (newsItems.length === 0) {
        console.log('⚠ No news items found');
      } else {
        console.log(`✓ Found ${newsItems.length} news items`);
      }

      // Send to Slack
      console.log('→ Sending to Slack...');
      await this.slackService.sendDailyNews(newsItems);

      console.log('\n===========================================');
      console.log('✓ Daily news job completed successfully');
      console.log('===========================================\n');
    } catch (error) {
      console.error('\n===========================================');
      console.error('✗ Error executing daily news job:', error.message);
      console.error('===========================================\n');

      // Try to send error notification to Slack
      try {
        await this.slackService.sendErrorNotification(error.message);
      } catch (notificationError) {
        console.error('Failed to send error notification:', notificationError.message);
      }
    }
  }

  /**
   * Start the scheduled job
   */
  start() {
    // Validate cron schedule
    if (!cron.validate(this.cronSchedule)) {
      throw new Error(`Invalid cron schedule: ${this.cronSchedule}`);
    }

    console.log('\n===========================================');
    console.log('🚀 Starting NewsBot Scheduler');
    console.log('===========================================');
    console.log(`Schedule: ${this.cronSchedule}`);
    console.log(`Timezone: ${this.timezone}`);
    console.log(`Next run: ${this.getNextRunTime()}`);
    console.log('===========================================\n');

    this.task = cron.schedule(
      this.cronSchedule,
      async () => {
        await this.executeDailyJob();
      },
      {
        scheduled: true,
        timezone: this.timezone
      }
    );

    console.log('✓ Scheduler started successfully\n');
  }

  /**
   * Stop the scheduled job
   */
  stop() {
    if (this.task) {
      this.task.stop();
      console.log('✓ Scheduler stopped');
    }
  }

  /**
   * Get the next scheduled run time
   * @returns {string} Next run time
   */
  getNextRunTime() {
    // Simple calculation for next run time based on cron schedule
    // For "0 8 * * *" (8 AM daily)
    const now = new Date();
    const next = new Date(now);

    if (this.cronSchedule === '0 8 * * *') {
      next.setHours(8, 0, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    }

    return next.toLocaleString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Execute the job immediately (for testing)
   */
  async executeNow() {
    console.log('→ Manual execution triggered');
    await this.executeDailyJob();
  }
}

module.exports = Scheduler;
