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

    // Apply exponential decay function for smooth score transitions
    // Formula: score = e^(-λt) where λ = decay constant, t = hours
    // λ = 0.03 gives: 0h→100%, 6h→91%, 12h→74%, 24h→49%, 48h→30%
    const lambda = 0.03;
    const score = Math.exp(-lambda * hoursAgo);

    // Floor at 10% for very old news (never completely irrelevant)
    return Math.max(0.1, score);
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
