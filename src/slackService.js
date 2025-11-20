const axios = require('axios');

class SlackService {
  constructor(webhookUrl) {
    if (!webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }
    this.webhookUrl = webhookUrl;
  }

  /**
   * Format relevance score as visual bar
   * @param {number} score - Relevance score (0-1)
   * @returns {string} Visual bar representation
   */
  formatRelevanceBar(score) {
    const barLength = 10;
    const filledLength = Math.round(score * barLength);
    const emptyLength = barLength - filledLength;

    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);

    return filled + empty;
  }

  /**
   * Format news items into Slack message blocks
   * @param {Array} newsItems - Array of news items
   * @returns {Object} Slack message payload
   */
  formatNewsMessage(newsItems) {
    if (!newsItems || newsItems.length === 0) {
      return {
        text: '📰 Daily Retail Innovation News',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📰 Daily Retail Innovation News',
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '_No new articles found today. Please check back tomorrow!_'
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `_Generated on ${new Date().toLocaleDateString('de-DE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}_`
              }
            ]
          }
        ]
      };
    }

    // Check if articles have relevance scores
    const hasRelevanceScores = newsItems.length > 0 && newsItems[0].relevance;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📰 Daily Retail Innovation News',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: hasRelevanceScores
            ? `Good morning! Here are *${newsItems.length} top stories* about retail innovation, autonomous delivery, and last mile technology (relevance-filtered):`
            : `Good morning! Here are *${newsItems.length} top stories* about retail innovation, autonomous delivery, and last mile technology:`
        }
      },
      {
        type: 'divider'
      }
    ];

    // Add each news item as a section
    newsItems.forEach((item, index) => {
      const date = new Date(item.pubDate);
      const formattedDate = date.toLocaleDateString('de-DE', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Build the text content
      let text = `*${index + 1}. <${item.link}|${item.title}>*\n${item.description}`;

      // Add relevance information if available
      if (item.relevance) {
        const scorePercent = Math.round(item.relevance.score * 100);
        const relevanceBar = this.formatRelevanceBar(item.relevance.score);

        text += `\n\n📊 Relevance: ${relevanceBar} ${scorePercent}%`;

        // Add reasoning if available
        if (item.relevance.metadata?.reasoning) {
          text += ` • _${item.relevance.metadata.reasoning}_`;
        }
      }

      // Add source and date
      text += `\n_${item.source} • ${formattedDate}_`;

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: text
        }
      });

      // Add divider between items (except after the last one)
      if (index < newsItems.length - 1) {
        blocks.push({
          type: 'divider'
        });
      }
    });

    // Add footer
    blocks.push(
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Generated on ${new Date().toLocaleDateString('de-DE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} • Topics: Retail Innovation, Autonomous Delivery, Last Mile Technology_`
          }
        ]
      }
    );

    return {
      text: '📰 Daily Retail Innovation News',
      blocks: blocks
    };
  }

  /**
   * Send message to Slack via webhook
   * @param {Object} message - Slack message payload
   * @returns {Promise<boolean>} Success status
   */
  async sendMessage(message) {
    try {
      const response = await axios.post(this.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.status === 200 && response.data === 'ok') {
        console.log('✓ Message sent to Slack successfully');
        return true;
      } else {
        console.error('✗ Unexpected response from Slack:', response.data);
        return false;
      }
    } catch (error) {
      if (error.response) {
        console.error('✗ Slack API error:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('✗ No response from Slack:', error.message);
      } else {
        console.error('✗ Error sending message to Slack:', error.message);
      }
      throw error;
    }
  }

  /**
   * Send daily news summary to Slack
   * @param {Array} newsItems - Array of news items
   * @returns {Promise<boolean>} Success status
   */
  async sendDailyNews(newsItems) {
    console.log(`Preparing to send ${newsItems.length} news items to Slack...`);

    const message = this.formatNewsMessage(newsItems);
    return await this.sendMessage(message);
  }

  /**
   * Send error notification to Slack
   * @param {string} errorMessage - Error message
   * @returns {Promise<boolean>} Success status
   */
  async sendErrorNotification(errorMessage) {
    const message = {
      text: '⚠️ NewsBot Error',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ NewsBot Error',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `An error occurred while fetching or sending news:\n\`\`\`${errorMessage}\`\`\``
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_${new Date().toLocaleString('de-DE')}_`
            }
          ]
        }
      ]
    };

    try {
      return await this.sendMessage(message);
    } catch (error) {
      console.error('Failed to send error notification:', error.message);
      return false;
    }
  }

  /**
   * Send test message to verify webhook is working
   * @returns {Promise<boolean>} Success status
   */
  async sendTestMessage() {
    const message = {
      text: '🧪 NewsBot Test Message',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 NewsBot Test Message',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'This is a test message from your Retail Innovation NewsBot. If you can see this, the webhook is configured correctly! ✓'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_Test sent at ${new Date().toLocaleString('de-DE')}_`
            }
          ]
        }
      ]
    };

    return await this.sendMessage(message);
  }
}

module.exports = SlackService;
