/**
 * AuthorityScorer - Scores articles based on source reputation
 * Weight: 25% of total relevance score
 *
 * Uses a predefined authority map to rate news sources
 * - Retail-specific sources: 0.85-1.0 (RetailDive, SupplyChainDive)
 * - Major tech/business: 0.8-0.9 (TechCrunch, Bloomberg, Reuters)
 * - Aggregators: 0.6 (Google News)
 * - Unknown sources: 0.4 (default)
 */
class AuthorityScorer {
  constructor(config) {
    this.authorityMap = config.sources.authorityMap;
  }

  /**
   * Score an article based on source authority
   * @param {Object} article - Article object with link or source
   * @returns {number} Score between 0-1
   */
  score(article) {
    const domain = this.extractDomain(article.link);
    const score = this.authorityMap[domain] || this.authorityMap['unknown'];

    return score;
  }

  /**
   * Extract domain from URL
   * @param {string} url - Full URL
   * @returns {string} Domain name (e.g., "retaildive.com")
   */
  extractDomain(url) {
    if (!url) return 'unknown';

    try {
      const hostname = new URL(url).hostname;
      // Remove 'www.' prefix if present
      return hostname.replace(/^www\./, '');
    } catch (error) {
      console.warn(`Could not parse URL: ${url}`, error.message);
      return 'unknown';
    }
  }

  /**
   * Get the authority tier for a source
   * @param {Object} article - Article object
   * @returns {string} Authority tier (excellent, good, fair, unknown)
   */
  getAuthorityTier(article) {
    const score = this.score(article);

    if (score >= 0.9) return 'excellent';
    if (score >= 0.8) return 'good';
    if (score >= 0.6) return 'fair';
    return 'unknown';
  }

  /**
   * Get the source name from an article
   * @param {Object} article - Article object
   * @returns {string} Source name
   */
  getSourceName(article) {
    return this.extractDomain(article.link);
  }
}

module.exports = AuthorityScorer;
