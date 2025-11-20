/**
 * SpamFilter - Filters out spam and clickbait articles
 *
 * Detects:
 * - Clickbait patterns ("you won't believe", "shocking", etc.)
 * - Excessive capitalization
 * - Excessive punctuation (multiple exclamation marks)
 * - Common spam indicators
 */
class SpamFilter {
  constructor(config) {
    this.config = config;

    // Clickbait patterns (regex)
    this.clickbaitPatterns = [
      /you won'?t believe/i,
      /shocking/i,
      /this one trick/i,
      /what happened next/i,
      /number \d+ will shock you/i,
      /doctors hate (him|her|them)/i,
      /\d+ reasons why/i,
      /the truth about/i,
      /what .* doesn'?t want you to know/i,
      /mind.?blown/i,
      /jaw.?dropping/i
    ];
  }

  /**
   * Check if article is spam/clickbait
   * @param {Object} article - Article object with title
   * @returns {boolean} True if spam, false otherwise
   */
  isSpam(article) {
    const title = article.title || '';

    // Check clickbait patterns
    if (this.hasClickbaitPattern(title)) {
      return true;
    }

    // Check excessive capitalization
    if (this.hasExcessiveCaps(title)) {
      return true;
    }

    // Check excessive punctuation
    if (this.hasExcessivePunctuation(title)) {
      return true;
    }

    return false;
  }

  /**
   * Check for clickbait patterns
   * @param {string} title - Article title
   * @returns {boolean} True if clickbait detected
   */
  hasClickbaitPattern(title) {
    return this.clickbaitPatterns.some(pattern => pattern.test(title));
  }

  /**
   * Check for excessive capitalization
   * @param {string} title - Article title
   * @returns {boolean} True if excessive caps
   */
  hasExcessiveCaps(title) {
    // Ignore if title is too short
    if (title.length < 10) return false;

    // Calculate ratio of uppercase to total letters
    const letters = title.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return false;

    const upperCount = (title.match(/[A-Z]/g) || []).length;
    const capsRatio = upperCount / letters.length;

    // If more than 50% uppercase (excluding first letter of words), flag it
    return capsRatio > 0.5;
  }

  /**
   * Check for excessive punctuation
   * @param {string} title - Article title
   * @returns {boolean} True if excessive punctuation
   */
  hasExcessivePunctuation(title) {
    // Count exclamation marks
    const exclamationCount = (title.match(/!/g) || []).length;
    if (exclamationCount > 2) return true;

    // Count question marks
    const questionCount = (title.match(/\?/g) || []).length;
    if (questionCount > 2) return true;

    return false;
  }

  /**
   * Filter out spam articles from a list
   * @param {Array} articles - Array of article objects
   * @returns {Array} Filtered articles (non-spam only)
   */
  filter(articles) {
    const filtered = articles.filter(article => !this.isSpam(article));

    const removedCount = articles.length - filtered.length;
    if (removedCount > 0) {
      console.log(`SpamFilter: Removed ${removedCount} spam/clickbait article(s)`);
    }

    return filtered;
  }

  /**
   * Get spam detection details for an article
   * @param {Object} article - Article object
   * @returns {Object} Detection details
   */
  getSpamDetails(article) {
    const title = article.title || '';

    return {
      isSpam: this.isSpam(article),
      reasons: {
        clickbait: this.hasClickbaitPattern(title),
        excessiveCaps: this.hasExcessiveCaps(title),
        excessivePunctuation: this.hasExcessivePunctuation(title)
      }
    };
  }
}

module.exports = SpamFilter;
