/**
 * Deduplicator - Enhanced deduplication for news items
 *
 * Removes duplicate news articles across multiple sources using:
 * - Title similarity
 * - URL matching
 * - Content fingerprinting
 */
class Deduplicator {
  constructor(options = {}) {
    this.similarityThreshold = options.similarityThreshold || 0.8;
  }

  /**
   * Remove duplicate news items
   *
   * @param {Array<Object>} items - News items to deduplicate
   * @returns {Array<Object>} Deduplicated items
   */
  deduplicate(items) {
    if (!items || items.length === 0) {
      return [];
    }

    const uniqueItems = [];
    const seenUrls = new Set();
    const seenTitles = new Set();

    for (const item of items) {
      // Skip if we've seen this exact URL
      if (seenUrls.has(item.link)) {
        continue;
      }

      // Check title similarity
      const titleKey = this.normalizeTitle(item.title);
      if (seenTitles.has(titleKey)) {
        continue;
      }

      // Check if title is too similar to any existing titles
      if (this.isTooSimilar(item.title, uniqueItems)) {
        continue;
      }

      // This is a unique item
      uniqueItems.push(item);
      seenUrls.add(item.link);
      seenTitles.add(titleKey);
    }

    return uniqueItems;
  }

  /**
   * Normalize title for comparison
   *
   * @param {string} title - News title
   * @returns {string} Normalized title
   */
  normalizeTitle(title) {
    if (!title) return '';

    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim()
      .substring(0, 50);            // First 50 chars
  }

  /**
   * Check if title is too similar to existing items
   *
   * @param {string} title - Title to check
   * @param {Array<Object>} existingItems - Already added items
   * @returns {boolean} True if too similar
   */
  isTooSimilar(title, existingItems) {
    const normalized = this.normalizeTitle(title);

    for (const item of existingItems) {
      const existingNormalized = this.normalizeTitle(item.title);

      // Calculate similarity
      const similarity = this.calculateSimilarity(normalized, existingNormalized);

      if (similarity >= this.similarityThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate similarity between two strings (Jaccard similarity)
   *
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    // Split into words
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));

    // Jaccard similarity: intersection / union
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Group duplicate items (useful for debugging)
   *
   * @param {Array<Object>} items - News items
   * @returns {Array<Array<Object>>} Groups of duplicates
   */
  findDuplicateGroups(items) {
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < items.length; i++) {
      if (processed.has(i)) continue;

      const group = [items[i]];
      processed.add(i);

      for (let j = i + 1; j < items.length; j++) {
        if (processed.has(j)) continue;

        const similarity = this.calculateSimilarity(
          this.normalizeTitle(items[i].title),
          this.normalizeTitle(items[j].title)
        );

        if (similarity >= this.similarityThreshold) {
          group.push(items[j]);
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

module.exports = Deduplicator;
