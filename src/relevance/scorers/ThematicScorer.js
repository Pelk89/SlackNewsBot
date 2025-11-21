/**
 * ThematicScorer - Scores articles based on keyword relevance
 * Weight: 40% of total relevance score
 *
 * Uses a 3-tier keyword system:
 * - Tier 1: High-priority keywords (2.0x weight) - specific topics
 * - Tier 2: Medium-priority keywords (1.0x weight) - related topics
 * - Tier 3: Context keywords (0.5x weight) - general topics
 */
class ThematicScorer {
  constructor(config) {
    this.tier1Keywords = config.keywords.tier1;
    this.tier2Keywords = config.keywords.tier2;
    this.tier3Keywords = config.keywords.tier3;
  }

  /**
   * Score an article based on keyword matches
   * @param {Object} article - Article object with title and description
   * @returns {number} Score between 0-1
   */
  score(article) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    let score = 0;

    // Calculate actual maximum score based on keyword configuration
    // This ensures proper normalization regardless of keyword counts
    const maxPossibleScore =
      (this.tier1Keywords.length * 2.0) +  // Tier 1: 2.0x weight
      (this.tier2Keywords.length * 1.0) +  // Tier 2: 1.0x weight
      (this.tier3Keywords.length * 0.5);   // Tier 3: 0.5x weight

    // Count Tier 1 matches (high priority - 2.0x weight)
    this.tier1Keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 2.0;
      }
    });

    // Count Tier 2 matches (medium priority - 1.0x weight)
    this.tier2Keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 1.0;
      }
    });

    // Count Tier 3 matches (context - 0.5x weight)
    this.tier3Keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 0.5;
      }
    });

    // Normalize to 0-1 range
    const normalizedScore = Math.min(score / maxPossibleScore, 1.0);

    return normalizedScore;
  }

  /**
   * Get detailed breakdown of matched keywords
   * @param {Object} article - Article object
   * @returns {Object} Breakdown of matches by tier
   */
  getMatchBreakdown(article) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();

    const tier1Matches = this.tier1Keywords.filter(kw =>
      text.includes(kw.toLowerCase())
    );
    const tier2Matches = this.tier2Keywords.filter(kw =>
      text.includes(kw.toLowerCase())
    );
    const tier3Matches = this.tier3Keywords.filter(kw =>
      text.includes(kw.toLowerCase())
    );

    return {
      tier1: tier1Matches,
      tier2: tier2Matches,
      tier3: tier3Matches,
      totalMatches: tier1Matches.length + tier2Matches.length + tier3Matches.length
    };
  }
}

module.exports = ThematicScorer;
