/**
 * TimelinessScorer - Scores articles based on recency
 * Weight: 20% of total relevance score
 *
 * Uses a decay function:
 * - < 6 hours: 1.0 (perfect)
 * - < 12 hours: 0.9 (excellent)
 * - < 24 hours: 0.7 (good)
 * - < 48 hours: 0.4 (acceptable)
 * - > 48 hours: 0.1 (old news)
 */
class TimelinessScorer {
  constructor(config) {
    this.maxAgeHours = config.scoring.thresholds.maxAgeHours || 48;
  }

  /**
   * Score an article based on publication date
   * @param {Object} article - Article object with pubDate
   * @returns {number} Score between 0-1
   */
  score(article) {
    if (!article.pubDate) {
      // If no date available, assume it's recent but not perfect
      return 0.5;
    }

    const pubDate = new Date(article.pubDate);
    const now = new Date();
    const hoursAgo = (now - pubDate) / (1000 * 60 * 60);

    // Handle invalid dates
    if (isNaN(hoursAgo)) {
      console.warn(`Invalid pubDate for article: ${article.title}`);
      return 0.5;
    }

    // Future dates (clock skew or incorrect data) - treat as very recent
    if (hoursAgo < 0) {
      return 1.0;
    }

    // Apply decay function
    if (hoursAgo <= 6) return 1.0;       // < 6h = perfect
    if (hoursAgo <= 12) return 0.9;      // < 12h = excellent
    if (hoursAgo <= 24) return 0.7;      // < 24h = good
    if (hoursAgo <= 48) return 0.4;      // < 48h = acceptable
    return 0.1;                          // > 48h = old news
  }

  /**
   * Get age category of an article
   * @param {Object} article - Article object
   * @returns {string} Age category
   */
  getAgeCategory(article) {
    const score = this.score(article);

    if (score >= 0.9) return 'breaking';      // < 12h
    if (score >= 0.7) return 'recent';        // < 24h
    if (score >= 0.4) return 'today';         // < 48h
    return 'older';                           // > 48h
  }

  /**
   * Get formatted age string
   * @param {Object} article - Article object
   * @returns {string} Human-readable age (e.g., "2 hours ago")
   */
  getFormattedAge(article) {
    if (!article.pubDate) return 'unknown date';

    const pubDate = new Date(article.pubDate);
    const now = new Date();
    const diffMs = now - pubDate;

    if (isNaN(diffMs)) return 'invalid date';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Check if article is within acceptable age threshold
   * @param {Object} article - Article object
   * @returns {boolean} True if within threshold
   */
  isWithinThreshold(article) {
    if (!article.pubDate) return true; // Unknown date, allow through

    const pubDate = new Date(article.pubDate);
    const now = new Date();
    const hoursAgo = (now - pubDate) / (1000 * 60 * 60);

    return hoursAgo <= this.maxAgeHours;
  }
}

module.exports = TimelinessScorer;
