const Parser = require('rss-parser');
const BaseSource = require('./BaseSource');

/**
 * RSSSource - Generic RSS feed source
 *
 * Can be used for any standard RSS feed (RetailDive, TechCrunch, etc.)
 */
class RSSSource extends BaseSource {
  constructor(config) {
    super(config);

    this.parser = new Parser({
      customFields: {
        item: ['pubDate', 'description', 'link', 'title', 'content:encoded', 'media:content']
      }
    });

    // RSS feed URL from config
    this.feedUrl = this.config.feedUrl;

    if (!this.feedUrl) {
      throw new Error(`RSSSource ${this.id} requires feedUrl in config`);
    }
  }

  /**
   * Fetch news from RSS feed
   *
   * @param {Array<string>} keywords - Search keywords (used for filtering)
   * @returns {Promise<Array<Object>>} Array of news items
   */
  async fetch(keywords) {
    try {
      console.log(`→ Fetching from ${this.name} (${this.feedUrl})`);

      const feed = await this.parser.parseURL(this.feedUrl);

      // Normalize all items
      const items = feed.items.map(item => this.normalize({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        description: item.contentSnippet || item.description || item['content:encoded'] || '',
        source: this.name,
        image: this.extractImage(item)
      }));

      // Filter by keyword relevance if keywords provided
      const filtered = keywords && keywords.length > 0
        ? this.filterByKeywords(items, keywords)
        : items;

      console.log(`✓ ${this.name}: Found ${filtered.length} items`);

      return filtered;
    } catch (error) {
      console.error(`✗ Error fetching from ${this.name}:`, error.message);
      return [];
    }
  }

  /**
   * Filter items by keyword relevance
   *
   * @param {Array<Object>} items - News items
   * @param {Array<string>} keywords - Keywords to match
   * @returns {Array<Object>} Filtered items
   */
  filterByKeywords(items, keywords) {
    return items.filter(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    });
  }

  /**
   * Extract image URL from RSS item
   *
   * @param {Object} item - RSS item
   * @returns {string|null} Image URL or null
   */
  extractImage(item) {
    // Try various image fields
    if (item.enclosure && item.enclosure.url) {
      return item.enclosure.url;
    }

    if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
      return item['media:content'].$.url;
    }

    if (item.image && item.image.url) {
      return item.image.url;
    }

    return null;
  }

  /**
   * Validate RSS source configuration
   *
   * @returns {boolean} True if valid
   */
  validate() {
    return super.validate() && !!this.feedUrl;
  }
}

module.exports = RSSSource;
