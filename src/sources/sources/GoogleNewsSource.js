const Parser = require('rss-parser');
const BaseSource = require('./BaseSource');

/**
 * GoogleNewsSource - Fetches news from Google News RSS feeds
 *
 * Uses Google News search RSS endpoint with keyword-based queries
 */
class GoogleNewsSource extends BaseSource {
  constructor(config) {
    super(config);

    this.parser = new Parser({
      customFields: {
        item: ['pubDate', 'description', 'link', 'title', 'source']
      }
    });

    // Google News specific config
    this.baseUrl = this.config.baseUrl || 'https://news.google.com/rss/search';
    this.language = this.config.language || 'en-US';
    this.country = this.config.country || 'US';
  }

  /**
   * Fetch news from Google News for given keywords
   *
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} Array of news items
   */
  async fetch(keywords) {
    try {
      console.log(`→ Fetching from ${this.name} with keywords: ${keywords.join(', ')}`);

      // Fetch news for all keywords in parallel
      const promises = keywords.map(keyword => this.fetchForKeyword(keyword));
      const results = await Promise.all(promises);

      // Flatten and normalize
      const allItems = results.flat();
      const normalized = allItems.map(item => this.normalize(item));

      console.log(`✓ ${this.name}: Found ${normalized.length} items`);

      return normalized;
    } catch (error) {
      console.error(`✗ Error fetching from ${this.name}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch news for a single keyword
   *
   * @param {string} keyword - Search keyword
   * @returns {Promise<Array<Object>>} Array of raw news items
   */
  async fetchForKeyword(keyword) {
    try {
      const encodedQuery = encodeURIComponent(keyword);
      const rssUrl = `${this.baseUrl}?q=${encodedQuery}&hl=${this.language}&gl=${this.country}&ceid=${this.country}:${this.language.split('-')[0]}`;

      const feed = await this.parser.parseURL(rssUrl);

      return feed.items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        description: item.contentSnippet || item.description || '',
        source: this.extractSource(item.title)
      }));
    } catch (error) {
      console.error(`Error fetching Google News for keyword "${keyword}":`, error.message);
      return [];
    }
  }

  /**
   * Extract source name from Google News title format
   * Google News titles typically end with " - Source Name"
   *
   * @param {string} title - News title
   * @returns {string} Source name
   */
  extractSource(title) {
    const match = title.match(/- (.+)$/);
    return match ? match[1] : this.name;
  }

  /**
   * Normalize Google News item to standard format
   *
   * @param {Object} item - Raw Google News item
   * @returns {Object} Normalized news item
   */
  normalize(item) {
    // Call parent normalize, then add Google News specific logic
    const normalized = super.normalize(item);

    // Override source if we extracted it from title
    if (item.source && item.source !== this.name) {
      normalized.source = item.source;
    }

    return normalized;
  }
}

module.exports = GoogleNewsSource;
