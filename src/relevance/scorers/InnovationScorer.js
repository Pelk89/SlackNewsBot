/**
 * InnovationScorer - Scores articles based on innovation impact signals
 * Weight: 15% of total relevance score
 *
 * Detects innovation indicators:
 * - Positive signals: breakthrough, first, launches, partnership, funding
 * - Negative signals: opinion, analysis, earnings reports
 */
class InnovationScorer {
  constructor(config) {
    // Signals that indicate innovation/impact
    this.innovationSignals = [
      'breakthrough',
      'first',
      'launches',
      'announces',
      'revolutionary',
      'disrupts',
      'game-changer',
      'pilot program',
      'partnership',
      'acquisition',
      'funding',
      'investment',
      'series a',
      'series b',
      'series c',
      'unveils',
      'introduces',
      'debuts',
      'expands',
      'rolls out',
      'new technology',
      'innovation',
      'patented',
      'world\'s first'
    ];

    // Signals that indicate non-innovation content
    this.nonInnovationSignals = [
      'opinion',
      'analysis',
      'commentary',
      'editorial',
      'earnings',
      'quarterly results',
      'stock price',
      'shares fall',
      'shares rise',
      'revenue',
      'profit'
    ];
  }

  /**
   * Score an article based on innovation impact signals
   * @param {Object} article - Article object with title and description
   * @returns {number} Score between 0-1
   */
  score(article) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    let score = 0.5; // Base score (neutral)

    // Add points for innovation signals
    this.innovationSignals.forEach(signal => {
      if (text.includes(signal)) {
        score += 0.1;
      }
    });

    // Subtract points for non-innovation signals
    this.nonInnovationSignals.forEach(signal => {
      if (text.includes(signal)) {
        score -= 0.15;
      }
    });

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get detected innovation signals in an article
   * @param {Object} article - Article object
   * @returns {Object} Detected signals
   */
  getSignals(article) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();

    const positiveSignals = this.innovationSignals.filter(signal =>
      text.includes(signal)
    );

    const negativeSignals = this.nonInnovationSignals.filter(signal =>
      text.includes(signal)
    );

    return {
      positive: positiveSignals,
      negative: negativeSignals,
      netImpact: positiveSignals.length - negativeSignals.length
    };
  }

  /**
   * Get innovation category
   * @param {Object} article - Article object
   * @returns {string} Category (high-impact, moderate, low-impact, commentary)
   */
  getInnovationCategory(article) {
    const score = this.score(article);

    if (score >= 0.8) return 'high-impact';
    if (score >= 0.6) return 'moderate';
    if (score >= 0.4) return 'low-impact';
    return 'commentary';
  }
}

module.exports = InnovationScorer;
