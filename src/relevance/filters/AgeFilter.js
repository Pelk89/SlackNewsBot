/**
 * AgeFilter - Filters out articles older than the configured threshold
 *
 * This is a hard filter that completely blocks articles exceeding the max age,
 * regardless of their relevance scores on other dimensions.
 *
 * Default threshold: 48 hours (2 days)
 */
class AgeFilter {
  constructor(config) {
    this.config = config;
    this.maxAgeHours = config.scoring.thresholds.maxAgeHours || 48;
  }

  /**
   * Check if article is within acceptable age threshold
   * @param {Object} article - Article object with pubDate
   * @returns {boolean} True if within threshold (should keep), false otherwise
   */
  isWithinThreshold(article) {
    // Fail-safe: if no pubDate, allow through (don't block articles with unknown dates)
    if (!article.pubDate) return true;

    const pubDate = new Date(article.pubDate);
    const now = new Date();
    const hoursAgo = (now - pubDate) / (1000 * 60 * 60);

    // Handle invalid dates - allow through (fail-safe)
    if (isNaN(hoursAgo)) {
      return true;
    }

    // Future dates (clock skew) - allow through
    if (hoursAgo < 0) {
      return true;
    }

    return hoursAgo <= this.maxAgeHours;
  }

  /**
   * Filter out articles older than the threshold
   * @param {Array} articles - Array of article objects
   * @returns {Array} Filtered articles (within age threshold only)
   */
  filter(articles) {
    const filtered = articles.filter(article => this.isWithinThreshold(article));

    const removedCount = articles.length - filtered.length;
    if (removedCount > 0) {
      console.log(`AgeFilter: Removed ${removedCount} article(s) older than ${this.maxAgeHours} hours`);
    }

    return filtered;
  }

  /**
   * Get age details for an article
   * @param {Object} article - Article object
   * @returns {Object} Age analysis
   */
  getAgeDetails(article) {
    if (!article.pubDate) {
      return {
        withinThreshold: true,
        reason: 'No pubDate (allowed through)',
        hoursAgo: null
      };
    }

    const pubDate = new Date(article.pubDate);
    const now = new Date();
    const hoursAgo = (now - pubDate) / (1000 * 60 * 60);

    if (isNaN(hoursAgo)) {
      return {
        withinThreshold: true,
        reason: 'Invalid date (allowed through)',
        hoursAgo: null
      };
    }

    if (hoursAgo < 0) {
      return {
        withinThreshold: true,
        reason: 'Future date (allowed through)',
        hoursAgo: hoursAgo
      };
    }

    return {
      withinThreshold: hoursAgo <= this.maxAgeHours,
      reason: hoursAgo <= this.maxAgeHours ? 'Within threshold' : `Exceeds ${this.maxAgeHours}h threshold`,
      hoursAgo: hoursAgo
    };
  }
}

module.exports = AgeFilter;
