/**
 * BaseSource - Abstract base class for all news sources
 *
 * Provides common interface and utilities for news sources.
 * All source implementations should extend this class.
 */
class BaseSource {
  constructor(config) {
    if (new.target === BaseSource) {
      throw new Error('BaseSource is an abstract class and cannot be instantiated directly');
    }

    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.enabled = config.enabled !== false; // Default to enabled
    this.priority = config.priority || 1;
    this.config = config.config || {};
  }

  /**
   * Fetch news from this source
   * Must be implemented by subclasses
   *
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} Array of normalized news items
   */
  async fetch(keywords) {
    throw new Error('fetch() must be implemented by subclass');
  }

  /**
   * Normalize a news item to standard format
   *
   * @param {Object} item - Raw news item
   * @returns {Object} Normalized news item
   */
  normalize(item) {
    return {
      title: item.title || '',
      link: item.link || item.url || '',
      pubDate: item.pubDate || item.publishedAt || new Date().toISOString(),
      description: this.cleanDescription(item.description || item.content || ''),
      source: item.source || this.name,
      sourceId: this.id,
      image: item.image || item.urlToImage || null
    };
  }

  /**
   * Clean and truncate description text
   *
   * @param {string} text - Raw description
   * @returns {string} Cleaned description
   */
  cleanDescription(text) {
    if (!text) return '';

    // Remove HTML tags
    let cleaned = text.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Limit to 200 characters
    if (cleaned.length > 200) {
      cleaned = cleaned.substring(0, 197) + '...';
    }

    return cleaned;
  }

  /**
   * Validate if this source is properly configured
   *
   * @returns {boolean} True if valid
   */
  validate() {
    return !!(this.id && this.name && this.type);
  }

  /**
   * Get a string representation of this source
   *
   * @returns {string}
   */
  toString() {
    return `${this.name} (${this.type})`;
  }
}

module.exports = BaseSource;
