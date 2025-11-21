const { getKeywordMatcher } = require('../../utils/keywordMatcher');

/**
 * ThematicScorer - Scores articles based on keyword relevance
 * Weight: 40% of total relevance score
 *
 * Uses a 3-tier keyword system:
 * - Tier 1: High-priority keywords (2.0x weight) - specific topics
 * - Tier 2: Medium-priority keywords (1.0x weight) - related topics
 * - Tier 3: Context keywords (0.5x weight) - general topics
 *
 * Enhanced with KeywordMatcher for:
 * - Keyword variations (last-mile ↔ last mile)
 * - Multi-language synonyms (EN ↔ DE)
 * - Fuzzy matching
 * - Auto-generated plural/hyphen variations
 */
class ThematicScorer {
  constructor(config) {
    this.tier1Keywords = config.keywords.tier1;
    this.tier2Keywords = config.keywords.tier2;
    this.tier3Keywords = config.keywords.tier3;

    // Initialize KeywordMatcher with config
    this.keywordMatcher = getKeywordMatcher({
      variations: config.keywords.variations || {},
      synonyms: config.keywords.synonyms || { 'en-de': {} },
      ...(config.keywords.matchingOptions || {})
    });
  }

  /**
   * Score an article based on keyword matches
   * @param {Object} article - Article object with title and description
   * @returns {number} Score between 0-1
   */
  score(article) {
    const text = `${article.title} ${article.description || ''}`;
    let score = 0;

    // Detect language for better synonym matching
    const language = this._detectLanguage(text);

    // Calculate actual maximum score based on keyword configuration
    // This ensures proper normalization regardless of keyword counts
    const maxPossibleScore =
      (this.tier1Keywords.length * 2.0) +  // Tier 1: 2.0x weight
      (this.tier2Keywords.length * 1.0) +  // Tier 2: 1.0x weight
      (this.tier3Keywords.length * 0.5);   // Tier 3: 0.5x weight

    // Count Tier 1 matches (high priority - 2.0x weight)
    this.tier1Keywords.forEach(keyword => {
      const matchResult = this.keywordMatcher.matches(text, keyword, { language });
      if (matchResult.matched) {
        // Weight by similarity (exact=1.0, variation=0.95, fuzzy=0.8-1.0)
        score += 2.0 * matchResult.similarity;
      }
    });

    // Count Tier 2 matches (medium priority - 1.0x weight)
    this.tier2Keywords.forEach(keyword => {
      const matchResult = this.keywordMatcher.matches(text, keyword, { language });
      if (matchResult.matched) {
        score += 1.0 * matchResult.similarity;
      }
    });

    // Count Tier 3 matches (context - 0.5x weight)
    this.tier3Keywords.forEach(keyword => {
      const matchResult = this.keywordMatcher.matches(text, keyword, { language });
      if (matchResult.matched) {
        score += 0.5 * matchResult.similarity;
      }
    });

    // Normalize to 0-1 range
    const normalizedScore = Math.min(score / maxPossibleScore, 1.0);

    return normalizedScore;
  }

  /**
   * Detect article language (simple heuristic)
   * @param {string} text - Article text
   * @returns {string} Language code (en or de)
   */
  _detectLanguage(text) {
    const textLower = text.toLowerCase();

    // German indicators
    const germanWords = ['der', 'die', 'das', 'und', 'ist', 'für', 'mit', 'auf', 'von', 'den'];
    const germanCount = germanWords.filter(word => textLower.includes(` ${word} `)).length;

    // English indicators
    const englishWords = ['the', 'and', 'is', 'for', 'with', 'on', 'at', 'to', 'from'];
    const englishCount = englishWords.filter(word => textLower.includes(` ${word} `)).length;

    return germanCount > englishCount ? 'de' : 'en';
  }

  /**
   * Get detailed breakdown of matched keywords
   * @param {Object} article - Article object
   * @returns {Object} Breakdown of matches by tier
   */
  getMatchBreakdown(article) {
    const text = `${article.title} ${article.description || ''}`;
    const language = this._detectLanguage(text);

    const tier1Matches = this.tier1Keywords.filter(kw =>
      this.keywordMatcher.matches(text, kw, { language }).matched
    );
    const tier2Matches = this.tier2Keywords.filter(kw =>
      this.keywordMatcher.matches(text, kw, { language }).matched
    );
    const tier3Matches = this.tier3Keywords.filter(kw =>
      this.keywordMatcher.matches(text, kw, { language }).matched
    );

    return {
      tier1: tier1Matches,
      tier2: tier2Matches,
      tier3: tier3Matches,
      totalMatches: tier1Matches.length + tier2Matches.length + tier3Matches.length,
      language
    };
  }
}

module.exports = ThematicScorer;
