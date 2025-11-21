const { getKeywordMatcher } = require('../utils/keywordMatcher');

/**
 * RelevanceScorer - Scores news items based on relevance
 *
 * Scoring factors:
 * - Keyword match quality (enhanced with KeywordMatcher)
 * - Source authority
 * - Freshness (recency)
 * - Engagement (if available)
 *
 * Enhanced with KeywordMatcher for:
 * - Keyword variations and synonyms
 * - Multi-language support (EN/DE)
 * - Fuzzy matching
 */
class RelevanceScorer {
  constructor(weights = {}, authorityMap = {}) {
    // Default weights (should sum to 1.0)
    this.weights = {
      keywordMatch: weights.keywordMatch || 0.4,
      sourceAuthority: weights.sourceAuthority || 0.3,
      freshness: weights.freshness || 0.2,
      engagement: weights.engagement || 0.1
    };

    // Source authority ratings
    this.authorityMap = authorityMap || {
      'retaildive': 1.0,
      'supply-chain-dive': 0.95,
      'techcrunch-logistics': 0.85,
      'retail-touchpoints': 0.9,
      'google-news': 0.7,
      'newsapi': 0.75,
      'the-verge': 0.8
    };

    // Initialize KeywordMatcher (fallback when RelevanceEngine unavailable)
    this.keywordMatcher = getKeywordMatcher();
  }

  /**
   * Score all news items
   *
   * @param {Array<Object>} items - News items to score
   * @param {Array<string>} keywords - Search keywords
   * @returns {Array<Object>} Items with scores added
   */
  scoreAll(items, keywords) {
    return items.map(item => this.scoreItem(item, keywords));
  }

  /**
   * Score a single news item
   *
   * @param {Object} item - News item
   * @param {Array<string>} keywords - Search keywords
   * @returns {Object} Item with score and breakdown
   */
  scoreItem(item, keywords) {
    const scores = {
      keyword: this.scoreKeywordMatch(item, keywords),
      authority: this.scoreSourceAuthority(item.sourceId),
      freshness: this.scoreFreshness(item.pubDate),
      engagement: this.scoreEngagement(item)
    };

    // Calculate weighted total score
    const totalScore =
      scores.keyword * this.weights.keywordMatch +
      scores.authority * this.weights.sourceAuthority +
      scores.freshness * this.weights.freshness +
      scores.engagement * this.weights.engagement;

    return {
      ...item,
      score: totalScore,
      scoreBreakdown: scores
    };
  }

  /**
   * Score keyword match quality (0-1)
   * Enhanced with KeywordMatcher for variations, synonyms, and fuzzy matching
   *
   * @param {Object} item - News item
   * @param {Array<string>} keywords - Search keywords
   * @returns {number} Score
   */
  scoreKeywordMatch(item, keywords) {
    if (!keywords || keywords.length === 0) {
      return 0.5; // Neutral score if no keywords
    }

    const title = item.title || '';
    const description = item.description || '';
    const text = `${title} ${description}`;

    // Simple language detection
    const language = this._detectLanguage(text);
    let matchScore = 0;

    keywords.forEach(keyword => {
      // Check title match (worth more)
      const titleMatch = this.keywordMatcher.matches(title, keyword, { language });
      if (titleMatch.matched) {
        matchScore += 1.0 * titleMatch.similarity;
        return; // Don't double-count in description
      }

      // Check full text match (worth less)
      const textMatch = this.keywordMatcher.matches(text, keyword, { language });
      if (textMatch.matched) {
        matchScore += 0.5 * textMatch.similarity;
      }
    });

    // Normalize by number of keywords
    return Math.min(1.0, matchScore / keywords.length);
  }

  /**
   * Detect article language (simple heuristic)
   * @param {string} text - Article text
   * @returns {string} Language code (en or de)
   */
  _detectLanguage(text) {
    const textLower = text.toLowerCase();

    // German indicators
    const germanWords = ['der', 'die', 'das', 'und', 'ist', 'für'];
    const germanCount = germanWords.filter(word => textLower.includes(` ${word} `)).length;

    // English indicators
    const englishWords = ['the', 'and', 'is', 'for', 'with'];
    const englishCount = englishWords.filter(word => textLower.includes(` ${word} `)).length;

    return germanCount > englishCount ? 'de' : 'en';
  }

  /**
   * Score source authority (0-1)
   *
   * @param {string} sourceId - Source ID
   * @returns {number} Score
   */
  scoreSourceAuthority(sourceId) {
    return this.authorityMap[sourceId] || 0.5; // Default to medium authority
  }

  /**
   * Score freshness/recency (0-1)
   *
   * @param {string} pubDate - Publication date
   * @returns {number} Score
   */
  scoreFreshness(pubDate) {
    try {
      const hours = (Date.now() - new Date(pubDate)) / (1000 * 60 * 60);

      if (hours < 6) return 1.0;      // Very fresh (< 6 hours)
      if (hours < 24) return 0.8;     // Fresh (< 1 day)
      if (hours < 48) return 0.5;     // Recent (< 2 days)
      if (hours < 72) return 0.3;     // Older (< 3 days)
      return 0.1;                      // Old (> 3 days)
    } catch (error) {
      return 0.5; // Default score if date parsing fails
    }
  }

  /**
   * Score engagement (0-1)
   * Currently placeholder - could integrate social shares, etc.
   *
   * @param {Object} item - News item
   * @returns {number} Score
   */
  scoreEngagement(item) {
    // Placeholder - could be enhanced with:
    // - Social media shares
    // - Comments count
    // - Click-through rates
    // For now, return neutral score
    return 0.5;
  }

  /**
   * Filter items by minimum score
   *
   * @param {Array<Object>} items - Scored news items
   * @param {number} minScore - Minimum score threshold
   * @returns {Array<Object>} Filtered items
   */
  filterByMinScore(items, minScore = 0.3) {
    return items.filter(item => item.score >= minScore);
  }

  /**
   * Get top N items by score
   *
   * @param {Array<Object>} items - Scored news items
   * @param {number} n - Number of items to return
   * @returns {Array<Object>} Top N items
   */
  getTopN(items, n) {
    return [...items]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, n);
  }

  /**
   * Update authority map for a source
   *
   * @param {string} sourceId - Source ID
   * @param {number} authority - Authority score (0-1)
   */
  setSourceAuthority(sourceId, authority) {
    this.authorityMap[sourceId] = Math.max(0, Math.min(1, authority));
  }

  /**
   * Update scoring weights
   *
   * @param {Object} weights - New weights
   */
  setWeights(weights) {
    this.weights = { ...this.weights, ...weights };
  }
}

module.exports = RelevanceScorer;
