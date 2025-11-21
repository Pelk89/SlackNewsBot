const Parser = require('rss-parser');
const BaseSource = require('./BaseSource');
const { parseRSSWithRetry } = require('../../utils/retry');
const { getCacheManager } = require('../../cache/CacheManager');
const { getKeywordMatcher } = require('../../utils/keywordMatcher');

/**
 * RSSSource - Generic RSS feed source
 *
 * Can be used for any standard RSS feed (RetailDive, TechCrunch, etc.)
 * Enhanced with KeywordMatcher for better keyword filtering
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

    // Initialize KeywordMatcher for improved filtering
    this.keywordMatcher = getKeywordMatcher();
  }

  /**
   * Fetch news from RSS feed
   *
   * @param {Array<string>} keywords - Search keywords (used for filtering)
   * @returns {Promise<Array<Object>>} Array of news items
   */
  async fetch(keywords) {
    const cacheManager = getCacheManager();
    const cacheKey = cacheManager.generateKey(`source:${this.id}`, { keywords });

    try {
      console.log(`→ Fetching from ${this.name} (${this.feedUrl})`);

      // Use cache wrapper for automatic caching
      return await cacheManager.wrap('rss', cacheKey, async () => {
        // Parse RSS with retry and timeout
        const feed = await parseRSSWithRetry(this.parser, this.feedUrl, {
          timeout: 20000, // 20s timeout for RSS parsing
          retries: 1,     // 1 retry for transient failures
          operationName: `${this.name} RSS fetch`
        });

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
      });

    } catch (error) {
      console.error(`✗ Error fetching from ${this.name}:`, error.message);
      return [];
    }
  }

  /**
   * Filter items by keyword relevance
   * Enhanced with KeywordMatcher for variations, synonyms, and fuzzy matching
   *
   * @param {Array<Object>} items - News items
   * @param {Array<string>} keywords - Keywords to match
   * @returns {Array<Object>} Filtered items
   */
  filterByKeywords(items, keywords) {
    return items.filter(item => {
      const text = `${item.title} ${item.description}`;

      // Simple language detection
      const textLower = text.toLowerCase();
      const germanWords = ['der', 'die', 'das', 'und', 'ist'];
      const englishWords = ['the', 'and', 'is', 'for'];
      const germanCount = germanWords.filter(w => textLower.includes(` ${w} `)).length;
      const englishCount = englishWords.filter(w => textLower.includes(` ${w} `)).length;
      const language = germanCount > englishCount ? 'de' : 'en';

      // Check if any keyword matches (with variations/synonyms)
      return keywords.some(keyword => {
        const matchResult = this.keywordMatcher.matches(text, keyword, { language });
        return matchResult.matched;
      });
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
