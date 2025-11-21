const BaseSource = require('./BaseSource');
const { retryWithBackoff, createFetchWithTimeout } = require('../../utils/retry');
const { getCacheManager } = require('../../cache/CacheManager');

/**
 * NewsAPISource - Fetches news from NewsAPI.org
 *
 * Provides access to 80,000+ news sources via NewsAPI
 * Free tier: 100 requests/day
 * Docs: https://newsapi.org/docs
 */
class NewsAPISource extends BaseSource {
  constructor(config) {
    super(config);

    // NewsAPI configuration
    this.apiKey = this.config.apiKey;
    this.language = this.config.language || 'en';
    this.sortBy = this.config.sortBy || 'publishedAt';
    this.pageSize = this.config.pageSize || 20;

    if (!this.apiKey || this.apiKey === '${NEWS_API_KEY}') {
      console.warn(`⚠ NewsAPI source ${this.id} is not configured (missing API key)`);
      this.enabled = false;
    }

    // NewsAPI endpoints
    this.baseUrl = 'https://newsapi.org/v2';
  }

  /**
   * Fetch news from NewsAPI
   *
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} Array of news items
   */
  async fetch(keywords) {
    if (!this.enabled || !this.apiKey || this.apiKey === '${NEWS_API_KEY}') {
      console.log(`⚠ ${this.name} is disabled (no API key configured)`);
      return [];
    }

    const cacheManager = getCacheManager();
    const cacheKey = cacheManager.generateKey(`source:${this.id}`, { keywords });

    try {
      console.log(`→ Fetching from ${this.name} with keywords: ${keywords.join(', ')}`);

      // Use cache wrapper for automatic caching
      return await cacheManager.wrap('newsapi', cacheKey, async () => {
        // Build query from keywords
        const query = keywords.join(' OR ');

        const url = `${this.baseUrl}/everything?` + new URLSearchParams({
          q: query,
          language: this.language,
          sortBy: this.sortBy,
          pageSize: this.pageSize,
          apiKey: this.apiKey
        });

        // Fetch with retry and timeout
        const items = await retryWithBackoff(
          async () => {
            const fetchWithTimeout = createFetchWithTimeout(30000); // 30s timeout

            const response = await fetchWithTimeout(url, {
              headers: {
                'User-Agent': 'NewsBot/1.0'
              }
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const error = new Error(`NewsAPI error: ${response.status} - ${errorData.message || response.statusText}`);
              error.statusCode = response.status;
              throw error;
            }

            const data = await response.json();

            if (data.status === 'error') {
              throw new Error(`NewsAPI error: ${data.message}`);
            }

            // Normalize articles
            const items = data.articles.map(article => this.normalize({
              title: article.title,
              link: article.url,
              url: article.url,
              pubDate: article.publishedAt,
              publishedAt: article.publishedAt,
              description: article.description || article.content,
              content: article.content,
              source: article.source.name,
              urlToImage: article.urlToImage
            }));

            return items;
          },
          {
            retries: 2, // Only 2 retries for NewsAPI (rate limit concerns)
            operationName: `${this.name} fetch`
          }
        );

        console.log(`✓ ${this.name}: Found ${items.length} items`);
        return items;
      });

    } catch (error) {
      console.error(`✗ Error fetching from ${this.name}:`, error.message);

      // Check for rate limit errors
      if (error.message.includes('429') || error.message.includes('rateLimited')) {
        console.error(`⚠ NewsAPI rate limit reached. Free tier allows 100 requests/day.`);
      }

      return [];
    }
  }

  /**
   * Validate NewsAPI source configuration
   *
   * @returns {boolean} True if valid
   */
  validate() {
    return super.validate() && !!this.apiKey && this.apiKey !== '${NEWS_API_KEY}';
  }
}

module.exports = NewsAPISource;
