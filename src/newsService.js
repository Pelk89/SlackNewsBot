const Parser = require('rss-parser');
const axios = require('axios');

class NewsService {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['pubDate', 'description', 'link', 'title', 'source']
      }
    });
    this.keywords = process.env.NEWS_KEYWORDS?.split(',').map(k => k.trim()) || [
      'retail innovation',
      'autonomous delivery',
      'last mile delivery',
      'retail technology'
    ];
    this.maxItems = parseInt(process.env.MAX_NEWS_ITEMS) || 10;
  }

  /**
   * Fetch news from Google News RSS feed
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of news items
   */
  async fetchGoogleNews(query) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

      const feed = await this.parser.parseURL(rssUrl);

      return feed.items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        description: this.cleanDescription(item.contentSnippet || item.description || ''),
        source: this.extractSource(item.title)
      }));
    } catch (error) {
      console.error(`Error fetching news for query "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Clean HTML and extra characters from description
   * @param {string} text - Raw description
   * @returns {string} Cleaned description
   */
  cleanDescription(text) {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200); // Limit to 200 characters
  }

  /**
   * Extract source name from Google News title format
   * @param {string} title - News title
   * @returns {string} Source name
   */
  extractSource(title) {
    const match = title.match(/- (.+)$/);
    return match ? match[1] : 'Unknown Source';
  }

  /**
   * Remove duplicate news items based on title similarity
   * @param {Array} items - News items
   * @returns {Array} Deduplicated items
   */
  removeDuplicates(items) {
    const seen = new Set();
    return items.filter(item => {
      const normalizedTitle = item.title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .substring(0, 50);

      if (seen.has(normalizedTitle)) {
        return false;
      }
      seen.add(normalizedTitle);
      return true;
    });
  }

  /**
   * Fetch and aggregate news from all configured keywords
   * @returns {Promise<Array>} Aggregated and deduplicated news items
   */
  async fetchRetailInnovationNews() {
    console.log(`Fetching news for keywords: ${this.keywords.join(', ')}`);

    try {
      // Fetch news for all keywords in parallel
      const newsPromises = this.keywords.map(keyword => this.fetchGoogleNews(keyword));
      const newsResults = await Promise.all(newsPromises);

      // Flatten and combine all results
      const allNews = newsResults.flat();

      // Remove duplicates
      const uniqueNews = this.removeDuplicates(allNews);

      // Sort by publication date (newest first)
      uniqueNews.sort((a, b) => {
        const dateA = new Date(a.pubDate);
        const dateB = new Date(b.pubDate);
        return dateB - dateA;
      });

      // Limit to max items
      const limitedNews = uniqueNews.slice(0, this.maxItems);

      console.log(`Found ${limitedNews.length} unique news items`);

      return limitedNews;
    } catch (error) {
      console.error('Error fetching retail innovation news:', error);
      throw error;
    }
  }

  /**
   * Get a summary of news for a specific time period
   * @param {number} hoursAgo - Number of hours to look back
   * @returns {Promise<Array>} Recent news items
   */
  async getRecentNews(hoursAgo = 24) {
    const allNews = await this.fetchRetailInnovationNews();
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return allNews.filter(item => {
      const itemDate = new Date(item.pubDate);
      return itemDate >= cutoffTime;
    });
  }
}

module.exports = NewsService;
