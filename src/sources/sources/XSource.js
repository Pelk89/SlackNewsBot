const BaseSource = require('./BaseSource');
const { parseRSSWithRetry } = require('../../utils/retry');
const { getCacheManager } = require('../../cache/CacheManager');

/**
 * XSource - Fetches news from X (Twitter) RSS feeds
 *
 * Uses Nitter RSS feeds (privacy-focused Twitter frontend) or Twitter's RSS endpoints
 * Nitter provides RSS feeds for Twitter searches and user timelines
 */
class XSource extends BaseSource {
  constructor(config) {
    super(config);

    // X/Twitter configuration
    this.searchTerms = this.config.searchTerms || [];
    this.accounts = this.config.accounts || [];
    this.nitterInstance = this.config.nitterInstance || 'nitter.net';

    // Alternative: Use RSS-Bridge or other Twitter RSS services
    this.useRssBridge = this.config.useRssBridge || false;
    this.rssBridgeUrl = this.config.rssBridgeUrl || 'https://rss-bridge.org';

    if (!this.searchTerms.length && !this.accounts.length) {
      console.warn(`⚠ XSource ${this.id} has no search terms or accounts configured`);
    }
  }

  /**
   * Fetch news from X/Twitter
   *
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} Array of news items
   */
  async fetch(keywords) {
    const cacheManager = getCacheManager();
    const cacheKey = cacheManager.generateKey(`source:${this.id}`, { keywords, accounts: this.accounts });

    try {
      console.log(`→ Fetching from ${this.name}`);

      // Use cache wrapper for automatic caching
      return await cacheManager.wrap('rss', cacheKey, async () => {
        const allItems = [];

        // Fetch from configured accounts
        if (this.accounts.length > 0) {
          const accountItems = await this.fetchFromAccounts();
          allItems.push(...accountItems);
        }

        // Fetch from search terms (combine with keywords)
        const searchTerms = [...new Set([...this.searchTerms, ...keywords])];
        if (searchTerms.length > 0) {
          const searchItems = await this.fetchFromSearch(searchTerms);
          allItems.push(...searchItems);
        }

        // Normalize all items
        const normalized = allItems.map(item => this.normalize(item));

        console.log(`✓ ${this.name}: Found ${normalized.length} items`);

        return normalized;
      });

    } catch (error) {
      console.error(`✗ Error fetching from ${this.name}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch tweets from configured accounts using Nitter RSS
   *
   * @returns {Promise<Array<Object>>} Array of tweets
   */
  async fetchFromAccounts() {
    const Parser = require('rss-parser');
    const parser = new Parser();
    const items = [];

    for (const account of this.accounts) {
      try {
        // Nitter RSS URL format: https://nitter.net/{username}/rss
        const rssUrl = `https://${this.nitterInstance}/${account}/rss`;

        // Parse RSS with retry and timeout
        const feed = await parseRSSWithRetry(parser, rssUrl, {
          timeout: 20000,
          retries: 1,
          operationName: `${this.name} account: @${account}`
        });

        feed.items.forEach(item => {
          items.push({
            title: this.cleanTweetText(item.title || item.contentSnippet),
            link: item.link,
            pubDate: item.pubDate || item.isoDate,
            description: this.cleanTweetText(item.contentSnippet || item.description || ''),
            source: `@${account} on X`,
            author: account,
            platform: 'x'
          });
        });

        console.log(`  ✓ Fetched ${feed.items.length} tweets from @${account}`);
      } catch (error) {
        console.error(`  ✗ Error fetching from @${account}:`, error.message);
      }
    }

    return items;
  }

  /**
   * Fetch tweets from search terms using Nitter RSS
   *
   * @param {Array<string>} searchTerms - Terms to search
   * @returns {Promise<Array<Object>>} Array of tweets
   */
  async fetchFromSearch(searchTerms) {
    const Parser = require('rss-parser');
    const parser = new Parser();
    const items = [];

    for (const term of searchTerms.slice(0, 3)) { // Limit to 3 terms to avoid overload
      try {
        // Nitter search RSS URL format: https://nitter.net/search/rss?f=tweets&q={query}
        const encodedTerm = encodeURIComponent(term);
        const rssUrl = `https://${this.nitterInstance}/search/rss?f=tweets&q=${encodedTerm}`;

        // Parse RSS with retry and timeout
        const feed = await parseRSSWithRetry(parser, rssUrl, {
          timeout: 20000,
          retries: 1,
          operationName: `${this.name} search: ${term}`
        });

        feed.items.forEach(item => {
          items.push({
            title: this.cleanTweetText(item.title || item.contentSnippet),
            link: item.link,
            pubDate: item.pubDate || item.isoDate,
            description: this.cleanTweetText(item.contentSnippet || item.description || ''),
            source: 'X Search',
            searchTerm: term,
            platform: 'x'
          });
        });

        console.log(`  ✓ Found ${feed.items.length} tweets for "${term}"`);
      } catch (error) {
        console.error(`  ✗ Error searching for "${term}":`, error.message);
      }
    }

    return items;
  }

  /**
   * Clean tweet text (remove retweet markers, extra whitespace, etc.)
   *
   * @param {string} text - Raw tweet text
   * @returns {string} Cleaned text
   */
  cleanTweetText(text) {
    if (!text) return '';

    let cleaned = text
      // Remove "RT @username:" pattern
      .replace(/^RT @\w+:\s*/i, '')
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Trim
      .trim();

    return cleaned;
  }

  /**
   * Normalize X/Twitter item to standard format
   *
   * @param {Object} item - Raw tweet item
   * @returns {Object} Normalized news item
   */
  normalize(item) {
    const normalized = super.normalize(item);

    // Add X-specific metadata
    if (item.author) {
      normalized.author = item.author;
    }

    if (item.platform) {
      normalized.platform = item.platform;
    }

    return normalized;
  }

  /**
   * Validate X source configuration
   *
   * @returns {boolean} True if valid
   */
  validate() {
    return super.validate() && (this.searchTerms.length > 0 || this.accounts.length > 0);
  }
}

module.exports = XSource;
