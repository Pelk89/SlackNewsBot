const stringSimilarity = require('string-similarity');

/**
 * GoogleNewsQueryBuilder - Builds optimized Google News search queries
 *
 * Features:
 * - Smart keyword grouping by similarity
 * - Exact phrase matching for multi-word keywords
 * - Boolean OR combinations
 * - Exclusion terms for noise reduction
 * - Date filtering
 */
class GoogleNewsQueryBuilder {
  constructor(options = {}) {
    this.dateRange = options.dateRange !== undefined ? options.dateRange : '7d';
    this.excludeTerms = options.excludeTerms || ['sale', 'discount', 'recipe', 'cooking'];
    this.exactPhraseMatching = options.exactPhraseMatching !== false; // default true
    this.maxQueriesPerFetch = options.maxQueriesPerFetch || 5;
    this.similarityThreshold = options.similarityThreshold || 0.4;
  }

  /**
   * Build optimized queries from keywords
   *
   * @param {Array<string>} keywords - Array of search keywords
   * @param {number} maxQueries - Maximum number of queries to generate
   * @returns {Array<string>} Array of optimized query strings
   */
  buildOptimizedQueries(keywords, maxQueries = null) {
    if (!keywords || keywords.length === 0) {
      return [];
    }

    const limit = maxQueries || this.maxQueriesPerFetch;

    try {
      // Format keywords with exact phrase matching if needed
      const formattedKeywords = keywords.map(kw => this.formatKeyword(kw));

      // Group keywords by similarity
      const groups = this.groupKeywordsBySimilarity(formattedKeywords, limit);

      // Build query for each group
      const queries = groups.map(group => this.buildQuery(group));

      return queries;
    } catch (error) {
      console.error('Error in Query Builder, falling back to original keywords:', error.message);
      // Fallback: return keywords as-is (will be handled by caller)
      return null;
    }
  }

  /**
   * Format a keyword with exact phrase matching if it contains spaces
   *
   * @param {string} keyword - Keyword to format
   * @returns {string} Formatted keyword
   */
  formatKeyword(keyword) {
    if (!keyword) return '';

    const trimmed = keyword.trim();

    // If exact phrase matching is enabled and keyword has spaces, wrap in quotes
    if (this.exactPhraseMatching && trimmed.includes(' ')) {
      return `"${trimmed}"`;
    }

    return trimmed;
  }

  /**
   * Group keywords by similarity using string-similarity library
   *
   * @param {Array<string>} keywords - Formatted keywords
   * @param {number} maxGroups - Maximum number of groups
   * @returns {Array<Array<string>>} Array of keyword groups
   */
  groupKeywordsBySimilarity(keywords, maxGroups) {
    if (keywords.length <= maxGroups) {
      // If we have fewer keywords than max groups, each keyword gets its own group
      return keywords.map(kw => [kw]);
    }

    try {
      const groups = [];
      const used = new Set();

      // Sort keywords by length (longer first) to prioritize more specific terms
      const sorted = [...keywords].sort((a, b) => b.length - a.length);

      for (const keyword of sorted) {
        if (used.has(keyword)) continue;

        const group = [keyword];
        used.add(keyword);

        // Find similar keywords to group with this one
        for (const other of sorted) {
          if (used.has(other) || keyword === other) continue;

          // Calculate similarity (remove quotes for comparison)
          const kw1 = keyword.replace(/"/g, '');
          const kw2 = other.replace(/"/g, '');
          const similarity = stringSimilarity.compareTwoStrings(kw1, kw2);

          if (similarity >= this.similarityThreshold) {
            group.push(other);
            used.add(other);
          }

          // Stop if we've reached our max queries limit
          if (groups.length + 1 >= maxGroups && used.size >= keywords.length) {
            break;
          }
        }

        groups.push(group);

        // Stop if we've reached max groups
        if (groups.length >= maxGroups) {
          break;
        }
      }

      // If we still have unused keywords, add them to the last group
      const remaining = keywords.filter(kw => !used.has(kw));
      if (remaining.length > 0 && groups.length > 0) {
        groups[groups.length - 1].push(...remaining);
      }

      return groups;

    } catch (error) {
      console.error('Error in similarity grouping, falling back to sequential grouping:', error.message);
      return this.groupSequentially(keywords, maxGroups);
    }
  }

  /**
   * Fallback: Group keywords sequentially
   *
   * @param {Array<string>} keywords - Keywords to group
   * @param {number} maxGroups - Maximum number of groups
   * @returns {Array<Array<string>>} Array of keyword groups
   */
  groupSequentially(keywords, maxGroups) {
    const groups = [];
    const keywordsPerGroup = Math.ceil(keywords.length / maxGroups);

    for (let i = 0; i < keywords.length; i += keywordsPerGroup) {
      groups.push(keywords.slice(i, i + keywordsPerGroup));
    }

    return groups;
  }

  /**
   * Build a query string from a group of keywords
   *
   * @param {Array<string>} keywordGroup - Group of keywords
   * @returns {string} Query string
   */
  buildQuery(keywordGroup) {
    if (!keywordGroup || keywordGroup.length === 0) {
      return '';
    }

    // Combine keywords with OR operator
    const keywordPart = keywordGroup.join(' OR ');

    // Build query parts
    const parts = [keywordPart];

    // Add exclusion terms
    if (this.excludeTerms && this.excludeTerms.length > 0) {
      const exclusions = this.excludeTerms.map(term => `-${term}`).join(' ');
      parts.push(exclusions);
    }

    // Add date filter (only if dateRange is truthy)
    if (this.dateRange) {
      parts.push(`when:${this.dateRange}`);
    }

    return parts.join(' ');
  }
}

/**
 * Singleton instance
 */
let instance = null;

/**
 * Get or create GoogleNewsQueryBuilder instance
 *
 * @param {Object} options - Configuration options
 * @returns {GoogleNewsQueryBuilder} Query builder instance
 */
function getQueryBuilder(options = null) {
  if (!instance || options) {
    instance = new GoogleNewsQueryBuilder(options || {});
  }
  return instance;
}

module.exports = {
  GoogleNewsQueryBuilder,
  getQueryBuilder
};
