/**
 * DuplicateFilter - Filters out duplicate and near-duplicate articles
 *
 * Uses string similarity to detect:
 * - Exact duplicates (same title)
 * - Near duplicates (similar titles from different sources covering same story)
 * - URL duplicates
 *
 * Note: Will use string-similarity library when available, falls back to simple comparison
 */
class DuplicateFilter {
  constructor(config) {
    this.similarityThreshold = config.filtering.deduplicationSimilarity || 0.85;

    // Try to load string-similarity library if available
    try {
      const stringSimilarity = require('string-similarity');
      this.compareTwoStrings = stringSimilarity.compareTwoStrings;
      this.useSimilarityLib = true;
    } catch (error) {
      // Fallback to simple comparison
      this.useSimilarityLib = false;
      console.log('DuplicateFilter: string-similarity not available, using simple comparison');
    }
  }

  /**
   * Calculate similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    if (this.useSimilarityLib) {
      return this.compareTwoStrings(str1, str2);
    } else {
      // Simple fallback: check if normalized strings match
      const norm1 = this.normalizeTitle(str1);
      const norm2 = this.normalizeTitle(str2);
      return norm1 === norm2 ? 1.0 : 0.0;
    }
  }

  /**
   * Normalize title for comparison
   * @param {string} title - Article title
   * @returns {string} Normalized title
   */
  normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim()
      .substring(0, 100);          // Limit length
  }

  /**
   * Check if two articles are duplicates
   * @param {Object} article1 - First article
   * @param {Object} article2 - Second article
   * @returns {boolean} True if duplicates
   */
  areDuplicates(article1, article2) {
    // Check URL duplicates
    if (article1.link === article2.link) {
      return true;
    }

    // Check title similarity
    const title1 = article1.title || '';
    const title2 = article2.title || '';

    if (!title1 || !title2) return false;

    const similarity = this.calculateSimilarity(title1, title2);
    return similarity >= this.similarityThreshold;
  }

  /**
   * Filter out duplicate articles, keeping the best version
   * @param {Array} articles - Array of article objects
   * @returns {Array} Filtered articles (duplicates removed)
   */
  filter(articles) {
    const unique = [];
    const seen = new Set();

    for (const article of articles) {
      let isDuplicate = false;

      // Check against all previously added articles
      for (const uniqueArticle of unique) {
        if (this.areDuplicates(article, uniqueArticle)) {
          isDuplicate = true;
          // If current article has better metadata, replace the unique one
          if (this.isBetterVersion(article, uniqueArticle)) {
            const index = unique.indexOf(uniqueArticle);
            unique[index] = article;
          }
          break;
        }
      }

      if (!isDuplicate) {
        unique.push(article);
      }
    }

    const removedCount = articles.length - unique.length;
    if (removedCount > 0) {
      console.log(`DuplicateFilter: Removed ${removedCount} duplicate article(s)`);
    }

    return unique;
  }

  /**
   * Determine if article1 is a better version than article2
   * @param {Object} article1 - First article
   * @param {Object} article2 - Second article
   * @returns {boolean} True if article1 is better
   */
  isBetterVersion(article1, article2) {
    // Prefer articles with descriptions
    if (article1.description && !article2.description) return true;
    if (!article1.description && article2.description) return false;

    // Prefer longer descriptions
    const desc1Len = (article1.description || '').length;
    const desc2Len = (article2.description || '').length;
    if (desc1Len > desc2Len * 1.5) return true;
    if (desc2Len > desc1Len * 1.5) return false;

    // Prefer more recent
    if (article1.pubDate && article2.pubDate) {
      return new Date(article1.pubDate) > new Date(article2.pubDate);
    }

    // Default: keep first one
    return false;
  }

  /**
   * Get duplicate groups from articles
   * @param {Array} articles - Array of articles
   * @returns {Array} Array of duplicate groups
   */
  getDuplicateGroups(articles) {
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < articles.length; i++) {
      if (processed.has(i)) continue;

      const group = [articles[i]];
      processed.add(i);

      for (let j = i + 1; j < articles.length; j++) {
        if (processed.has(j)) continue;

        if (this.areDuplicates(articles[i], articles[j])) {
          group.push(articles[j]);
          processed.add(j);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }
}

module.exports = DuplicateFilter;
