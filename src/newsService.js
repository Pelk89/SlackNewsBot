const SourceManager = require('./sources/SourceManager');
const RelevanceEngine = require('./relevance/RelevanceEngine');

class NewsService {
  constructor() {
    // Initialize SourceManager for multi-source aggregation
    this.sourceManager = new SourceManager();

    // Initialize RelevanceEngine for intelligent filtering
    try {
      this.relevanceEngine = new RelevanceEngine();
      console.log('✓ RelevanceEngine loaded successfully');
    } catch (error) {
      console.error('✗ Failed to initialize RelevanceEngine:', error.message);
      console.log('→ Will fall back to basic scoring from SourceManager');
      this.relevanceEngine = null;
    }

    this.keywords = process.env.NEWS_KEYWORDS?.split(',').map(k => k.trim()) || [
      'retail innovation',
      'autonomous delivery',
      'last mile delivery',
      'retail technology'
    ];
    this.maxItems = parseInt(process.env.MAX_NEWS_ITEMS) || 10;
  }

  /**
   * Fetch and aggregate news from all configured sources with intelligent relevance filtering
   * Combines SourceManager (multi-source) with RelevanceEngine (intelligent scoring)
   * @returns {Promise<Array>} Aggregated, scored, filtered, and ranked news items
   */
  async fetchRetailInnovationNews() {
    try {
      console.log(`→ Fetching news for keywords: ${this.keywords.join(', ')}`);

      // Step 1: Fetch from all sources using SourceManager
      const allNews = await this.sourceManager.fetchAllNews(this.keywords);
      console.log(`→ Fetched ${allNews.length} items from multiple sources`);

      // Step 2: Apply RelevanceEngine if available for advanced filtering
      let finalNews;
      if (this.relevanceEngine) {
        console.log('→ Applying RelevanceEngine for intelligent filtering...');
        finalNews = await this.relevanceEngine.scoreAndFilter(allNews);

        // Log filtering stats
        const stats = this.relevanceEngine.getFilteringStats(allNews, finalNews);
        console.log(`→ Filtered: ${stats.filtered}/${stats.total} items (${stats.filterRate}% removed)`);
        console.log(`→ Spam filtered: ${stats.spamFiltered}, Duplicates: ${stats.duplicatesFiltered}`);
      } else {
        // Fallback: use SourceManager's basic scoring
        console.log('→ Using SourceManager basic scoring (RelevanceEngine unavailable)');
        finalNews = allNews;
      }

      // Step 3: Limit to max items
      const limitedNews = finalNews.slice(0, this.maxItems);

      // Step 4: Log final statistics
      const sourceStats = this.sourceManager.getStats(limitedNews);
      console.log(`→ Final: ${limitedNews.length} news from ${sourceStats.sources} sources`);

      if (limitedNews.length > 0 && limitedNews[0].relevance) {
        const avgScore = limitedNews.reduce((sum, item) => sum + item.relevance.score, 0) / limitedNews.length;
        console.log(`→ Avg relevance score: ${(avgScore * 100).toFixed(1)}%`);
      }

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
