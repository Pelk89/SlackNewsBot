const SourceManager = require('./sources/SourceManager');

class NewsService {
  constructor() {
    // Initialize SourceManager for multi-source aggregation
    this.sourceManager = new SourceManager();

    this.keywords = process.env.NEWS_KEYWORDS?.split(',').map(k => k.trim()) || [
      'retail innovation',
      'autonomous delivery',
      'last mile delivery',
      'retail technology'
    ];
    this.maxItems = parseInt(process.env.MAX_NEWS_ITEMS) || 10;
  }

  /**
   * DEPRECATED: Use SourceManager instead
   * Kept for backward compatibility
   */
  async fetchGoogleNews(query) {
    console.warn('fetchGoogleNews is deprecated. Use SourceManager instead.');
    return [];
  }

  /**
   * DEPRECATED: Moved to BaseSource
   */
  cleanDescription(text) {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  /**
   * DEPRECATED: Moved to GoogleNewsSource
   */
  extractSource(title) {
    const match = title.match(/- (.+)$/);
    return match ? match[1] : 'Unknown Source';
  }

  /**
   * DEPRECATED: Moved to Deduplicator
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
   * Fetch and aggregate news from all configured sources
   * Uses SourceManager for multi-source aggregation, scoring, and diversification
   * @returns {Promise<Array>} Aggregated, scored, and deduplicated news items
   */
  async fetchRetailInnovationNews() {
    try {
      // Fetch from all sources using SourceManager
      const allNews = await this.sourceManager.fetchAllNews(this.keywords);

      // Limit to max items
      const limitedNews = allNews.slice(0, this.maxItems);

      // Log statistics
      const stats = this.sourceManager.getStats(limitedNews);
      console.log(`→ News from ${stats.sources} different sources`);
      console.log(`✓ Returning ${limitedNews.length} top news items`);

      return limitedNews;
    } catch (error) {
      console.error('✗ Error fetching retail innovation news:', error);
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
