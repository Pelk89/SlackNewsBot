const Deduplicator = require('../utils/deduplicator');

/**
 * NewsAggregator - Aggregates news from multiple sources
 *
 * Handles normalization, deduplication, and sorting
 */
class NewsAggregator {
  constructor(options = {}) {
    this.deduplicator = new Deduplicator({
      similarityThreshold: options.similarityThreshold || 0.8
    });
  }

  /**
   * Aggregate news from multiple sources
   *
   * @param {Array<Array<Object>>} sourcesResults - Array of results from each source
   * @returns {Array<Object>} Aggregated and normalized news items
   */
  aggregate(sourcesResults) {
    // Flatten all results
    const allItems = sourcesResults.flat();

    if (allItems.length === 0) {
      return [];
    }

    console.log(`→ Aggregating ${allItems.length} items from all sources`);

    // Deduplicate
    const unique = this.deduplicator.deduplicate(allItems);

    console.log(`✓ After deduplication: ${unique.length} unique items`);

    return unique;
  }

  /**
   * Sort news items by various criteria
   *
   * @param {Array<Object>} items - News items
   * @param {string} sortBy - Sort criteria ('date', 'score', 'source')
   * @returns {Array<Object>} Sorted items
   */
  sort(items, sortBy = 'date') {
    const sorted = [...items];

    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => {
          const dateA = new Date(a.pubDate);
          const dateB = new Date(b.pubDate);
          return dateB - dateA; // Newest first
        });
        break;

      case 'score':
        sorted.sort((a, b) => (b.score || 0) - (a.score || 0)); // Highest score first
        break;

      case 'source':
        sorted.sort((a, b) => a.source.localeCompare(b.source));
        break;

      default:
        console.warn(`Unknown sort criteria: ${sortBy}, using date`);
        sorted.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    }

    return sorted;
  }

  /**
   * Filter news items by time period
   *
   * @param {Array<Object>} items - News items
   * @param {number} hoursAgo - Number of hours to look back
   * @returns {Array<Object>} Filtered items
   */
  filterByTime(items, hoursAgo) {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return items.filter(item => {
      const itemDate = new Date(item.pubDate);
      return itemDate >= cutoffTime;
    });
  }

  /**
   * Get statistics about aggregated news
   *
   * @param {Array<Object>} items - News items
   * @returns {Object} Statistics
   */
  getStats(items) {
    const sources = {};
    const oldest = items.reduce((oldest, item) => {
      const date = new Date(item.pubDate);
      return !oldest || date < oldest ? date : oldest;
    }, null);

    const newest = items.reduce((newest, item) => {
      const date = new Date(item.pubDate);
      return !newest || date > newest ? date : newest;
    }, null);

    items.forEach(item => {
      sources[item.source] = (sources[item.source] || 0) + 1;
    });

    return {
      totalItems: items.length,
      sources: Object.keys(sources).length,
      sourceBreakdown: sources,
      timeRange: {
        oldest: oldest?.toISOString(),
        newest: newest?.toISOString()
      }
    };
  }
}

module.exports = NewsAggregator;
