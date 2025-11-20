/**
 * QualityFilter - Filters articles based on quality thresholds
 *
 * Checks:
 * - Minimum word count
 * - Language (if detectable)
 * - Presence of required fields (title, link)
 * - Description quality
 */
class QualityFilter {
  constructor(config) {
    this.minWordCount = config.filtering.minWordCount || 100;
    this.acceptedLanguages = config.filtering.languages || ['en', 'de'];
  }

  /**
   * Check if article meets quality standards
   * @param {Object} article - Article object
   * @returns {boolean} True if article meets quality standards
   */
  meetsQualityStandards(article) {
    // Required fields
    if (!article.title || !article.link) {
      return false;
    }

    // Check title quality
    if (!this.hasQualityTitle(article.title)) {
      return false;
    }

    // Check description presence and quality
    if (!article.description) {
      // Allow articles without description if they have a good title
      // Some sources provide title-only feeds
      return true;
    }

    // Check word count (if description exists)
    if (!this.meetsMinWordCount(article)) {
      return false;
    }

    return true;
  }

  /**
   * Check if title is of sufficient quality
   * @param {string} title - Article title
   * @returns {boolean} True if quality title
   */
  hasQualityTitle(title) {
    if (!title) return false;

    // Too short
    if (title.length < 10) return false;

    // Check if it's mostly non-alphanumeric (junk)
    const alphanumericRatio = (title.match(/[a-zA-Z0-9]/g) || []).length / title.length;
    if (alphanumericRatio < 0.6) return false;

    return true;
  }

  /**
   * Check if article meets minimum word count
   * @param {Object} article - Article object
   * @returns {boolean} True if meets word count
   */
  meetsMinWordCount(article) {
    const text = `${article.title} ${article.description || ''}`;
    const wordCount = this.countWords(text);

    return wordCount >= this.minWordCount;
  }

  /**
   * Count words in text
   * @param {string} text - Text to count
   * @returns {number} Word count
   */
  countWords(text) {
    if (!text) return 0;

    // Remove HTML tags if present
    const cleanText = text.replace(/<[^>]*>/g, ' ');

    // Split by whitespace and filter empty strings
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);

    return words.length;
  }

  /**
   * Detect language (simple heuristic)
   * @param {string} text - Text to analyze
   * @returns {string} Language code (en, de, unknown)
   */
  detectLanguage(text) {
    if (!text || text.length < 50) return 'unknown';

    const lowerText = text.toLowerCase();

    // German indicators
    const germanWords = ['der', 'die', 'das', 'und', 'ist', 'für', 'mit', 'auf'];
    const germanCount = germanWords.filter(word => lowerText.includes(` ${word} `)).length;

    // English indicators
    const englishWords = ['the', 'and', 'is', 'for', 'with', 'on', 'at', 'to'];
    const englishCount = englishWords.filter(word => lowerText.includes(` ${word} `)).length;

    if (germanCount > englishCount && germanCount > 2) return 'de';
    if (englishCount > germanCount && englishCount > 2) return 'en';

    return 'unknown';
  }

  /**
   * Check if article is in accepted language
   * @param {Object} article - Article object
   * @returns {boolean} True if language is accepted
   */
  isAcceptedLanguage(article) {
    const text = `${article.title} ${article.description || ''}`;
    const language = this.detectLanguage(text);

    // If language unknown, allow through (don't be too restrictive)
    if (language === 'unknown') return true;

    return this.acceptedLanguages.includes(language);
  }

  /**
   * Filter articles based on quality thresholds
   * @param {Array} articles - Array of article objects
   * @returns {Array} Filtered articles (quality ones only)
   */
  filter(articles) {
    const filtered = articles.filter(article => {
      const meetsQuality = this.meetsQualityStandards(article);
      const acceptedLang = this.isAcceptedLanguage(article);

      return meetsQuality && acceptedLang;
    });

    const removedCount = articles.length - filtered.length;
    if (removedCount > 0) {
      console.log(`QualityFilter: Removed ${removedCount} low-quality article(s)`);
    }

    return filtered;
  }

  /**
   * Get quality assessment for an article
   * @param {Object} article - Article object
   * @returns {Object} Quality assessment
   */
  getQualityAssessment(article) {
    const text = `${article.title} ${article.description || ''}`;

    return {
      meetsQuality: this.meetsQualityStandards(article),
      details: {
        hasTitle: !!article.title,
        hasLink: !!article.link,
        hasDescription: !!article.description,
        wordCount: this.countWords(text),
        meetsMinWords: this.meetsMinWordCount(article),
        language: this.detectLanguage(text),
        acceptedLanguage: this.isAcceptedLanguage(article)
      }
    };
  }
}

module.exports = QualityFilter;
