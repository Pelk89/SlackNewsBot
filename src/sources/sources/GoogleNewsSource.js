const Parser = require('rss-parser');
const BaseSource = require('./BaseSource');
const { parseRSSWithRetry } = require('../../utils/retry');
const { getCacheManager } = require('../../cache/CacheManager');
const { GoogleNewsQueryBuilder } = require('../../utils/googleNewsQueryBuilder');
const { getKeywordMatcher } = require('../../utils/keywordMatcher');

/**
 * GoogleNewsSource - Fetches news from Google News RSS feeds
 *
 * Features:
 * - Keyword search with Query Builder (advanced Boolean queries)
 * - Topic feeds (BUSINESS, TECHNOLOGY, SCIENCE)
 * - Dual-mode fetching (keyword + topics)
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
    this.baseUrl = this.config.baseUrl || 'https://news.google.com/rss';
    this.language = this.config.language || 'en-US';
    this.country = this.config.country || 'US';

    // Query Builder for optimized queries (optional)
    // Only initialize if explicitly enabled OR if not configured (defaults to enabled)
    const queryBuilderEnabled = this.config.queryBuilder?.enabled !== false;
    if (queryBuilderEnabled && this.config.keywordSearch?.enabled !== false) {
      this.queryBuilder = new GoogleNewsQueryBuilder(this.config.queryBuilder || {});
    }

    // Keyword Matcher for topic filtering
    this.keywordMatcher = getKeywordMatcher();

    // Topic feeds configuration
    this.topicsEnabled = this.config.topics?.enabled || false;
    this.enabledTopics = this.config.topics?.feeds?.filter(t => t.enabled) || [];
    this.maxArticlesPerTopic = this.config.topics?.maxArticlesPerTopic || 15;
  }

  /**
   * Fetch news from Google News for given keywords
   *
   * Dual-mode fetching:
   * 1. Keyword search (with Query Builder if enabled)
   * 2. Topic feeds (if enabled)
   *
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} Array of news items
   */
  async fetch(keywords) {
    const cacheManager = getCacheManager();
    const cacheKey = cacheManager.generateKey(`source:${this.id}`, { keywords });

    try {
      console.log(`→ Fetching from ${this.name} with keywords: ${keywords.join(', ')}`);

      // Use cache wrapper for automatic caching
      return await cacheManager.wrap('rss', cacheKey, async () => {
        const promises = [];

        // Mode 1: Keyword Search (enhanced with Query Builder)
        const keywordSearchEnabled = this.config.keywordSearch?.enabled !== false;
        if (keywordSearchEnabled) {
          promises.push(this.fetchKeywordMode(keywords));
        }

        // Mode 2: Topic Feeds (new)
        if (this.topicsEnabled) {
          promises.push(this.fetchTopicMode(keywords));
        }

        // Fetch both modes in parallel
        const results = await Promise.allSettled(promises);

        // Merge results from both modes
        const allItems = results
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value);

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
   * Fetch news using keyword search mode
   *
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} Array of raw news items
   */
  async fetchKeywordMode(keywords) {
    try {
      // Use Query Builder if enabled
      if (this.queryBuilder) {
        const queries = this.queryBuilder.buildOptimizedQueries(keywords);

        // If Query Builder fails, fall back to original method
        if (!queries || queries.length === 0) {
          console.log(`Query Builder returned no queries, falling back to original keyword search`);
          return await this.fetchKeywordsOriginal(keywords);
        }

        console.log(`Using Query Builder: ${keywords.length} keywords → ${queries.length} optimized queries`);

        // Fetch for each optimized query
        const promises = queries.map(query => this.fetchForQuery(query));
        const results = await Promise.all(promises);
        return results.flat();

      } else {
        // Fallback: Original implementation
        return await this.fetchKeywordsOriginal(keywords);
      }
    } catch (error) {
      console.error(`Error in keyword mode, falling back to original:`, error.message);
      return await this.fetchKeywordsOriginal(keywords);
    }
  }

  /**
   * Fetch news using original keyword-by-keyword method
   *
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} Array of raw news items
   */
  async fetchKeywordsOriginal(keywords) {
    const promises = keywords.map(keyword => this.fetchForKeyword(keyword));
    const results = await Promise.all(promises);
    return results.flat();
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
      const rssUrl = `${this.baseUrl}/search?q=${encodedQuery}&hl=${this.language}&gl=${this.country}&ceid=${this.country}:${this.language.split('-')[0]}`;

      // Parse RSS with retry and timeout
      const feed = await parseRSSWithRetry(this.parser, rssUrl, {
        timeout: 20000,
        retries: 1,
        operationName: `${this.name} keyword: ${keyword}`
      });

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
   * Fetch news for an optimized query string
   *
   * @param {string} query - Optimized query string (with OR, exclusions, etc.)
   * @returns {Promise<Array<Object>>} Array of raw news items
   */
  async fetchForQuery(query) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const rssUrl = `${this.baseUrl}/search?q=${encodedQuery}&hl=${this.language}&gl=${this.country}&ceid=${this.country}:${this.language.split('-')[0]}`;

      // Parse RSS with retry and timeout
      const feed = await parseRSSWithRetry(this.parser, rssUrl, {
        timeout: 20000,
        retries: 1,
        operationName: `${this.name} query: ${query.substring(0, 50)}...`
      });

      return feed.items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        description: item.contentSnippet || item.description || '',
        source: this.extractSource(item.title)
      }));
    } catch (error) {
      console.error(`Error fetching Google News for query "${query.substring(0, 50)}...":`, error.message);
      return [];
    }
  }

  /**
   * Fetch news from topic feeds mode
   *
   * @param {Array<string>} keywords - Keywords for filtering topic results
   * @returns {Promise<Array<Object>>} Array of raw news items
   */
  async fetchTopicMode(keywords) {
    try {
      console.log(`Fetching ${this.enabledTopics.length} Google News topic feeds`);

      // Fetch all enabled topics in parallel
      const promises = this.enabledTopics.map(topic => this.fetchTopic(topic));
      const results = await Promise.allSettled(promises);

      // Collect all topic articles
      const allTopicArticles = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);

      // NO keyword filtering - let SemanticScorer handle relevance!
      console.log(`Topic feeds: ${allTopicArticles.length} fetched (no keyword filtering, SemanticScorer will score)`);

      return allTopicArticles;
    } catch (error) {
      console.error(`Error fetching topic feeds:`, error.message);
      return [];
    }
  }

  /**
   * Fetch a single topic feed
   *
   * @param {Object} topic - Topic configuration
   * @returns {Promise<Array<Object>>} Array of raw news items
   */
  async fetchTopic(topic) {
    try {
      const rssUrl = `${this.baseUrl}/${topic.url}?hl=${this.language}&gl=${this.country}&ceid=${this.country}:${this.language.split('-')[0]}`;

      // Parse RSS with retry and timeout
      const feed = await parseRSSWithRetry(this.parser, rssUrl, {
        timeout: 20000,
        retries: 1,
        operationName: `${this.name} topic: ${topic.name}`
      });

      // Limit articles per topic
      const items = feed.items.slice(0, this.maxArticlesPerTopic);

      return items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        description: item.contentSnippet || item.description || '',
        source: this.extractSource(item.title),
        topicSource: `Google News - ${topic.name}`,
        googleNewsTopic: topic.name
      }));
    } catch (error) {
      console.error(`Error fetching Google News topic "${topic.name}":`, error.message);
      return [];
    }
  }

  /**
   * Filter topic articles by keyword relevance
   *
   * @param {Array<Object>} articles - Topic articles to filter
   * @param {Array<string>} keywords - Keywords to match against
   * @returns {Array<Object>} Filtered articles
   */
  filterTopicArticles(articles, keywords) {
    if (!articles || articles.length === 0) {
      return [];
    }

    if (!keywords || keywords.length === 0) {
      return articles;
    }

    // Use KeywordMatcher to filter articles
    return articles.filter(article => {
      const text = `${article.title} ${article.description}`;

      // Check if article matches any keyword
      return keywords.some(keyword => {
        const matchResult = this.keywordMatcher.matches(text, keyword, {
          language: this.language.split('-')[0]
        });
        return matchResult.matched;
      });
    });
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
