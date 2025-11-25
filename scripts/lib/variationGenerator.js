/**
 * Variation Generator for keyword management
 * Generates keyword variations using algorithms extracted from keywordMatcher.js:230-277
 *
 * IMPORTANT: This code is copied from src/utils/keywordMatcher.js to ensure
 * consistency between generation and runtime matching.
 */
class VariationGenerator {
  /**
   * Generate all variations for a keyword
   * @param {string} keyword - Base keyword
   * @param {string} language - Language (en, de)
   * @returns {array} - Array of variations (excluding base keyword)
   */
  generateVariations(keyword, language = 'en') {
    const variations = new Set();

    // 1. Plural/Singular variations
    this._addPluralVariations(keyword, variations, language);

    // 2. Hyphenation variations
    this._addHyphenVariations(keyword, variations);

    // Remove the original keyword (we store it separately)
    variations.delete(keyword);

    return Array.from(variations);
  }

  /**
   * Add plural/singular variations
   * COPIED FROM: src/utils/keywordMatcher.js lines 230-260
   */
  _addPluralVariations(keyword, variations, language) {
    const words = keyword.split(' ');
    const lastWord = words[words.length - 1];

    // English pluralization rules
    if (language === 'en' || language === 'de') {
      if (lastWord.endsWith('s') && lastWord.length > 2) {
        // Plural → Singular (robots → robot)
        const singular = lastWord.slice(0, -1);
        variations.add([...words.slice(0, -1), singular].join(' '));
      } else if (lastWord.endsWith('y') && lastWord.length > 2) {
        // Singular → Plural (delivery → deliveries)
        const plural = lastWord.slice(0, -1) + 'ies';
        variations.add([...words.slice(0, -1), plural].join(' '));
      } else if (!lastWord.endsWith('s')) {
        // Singular → Plural (robot → robots)
        variations.add([...words.slice(0, -1), lastWord + 's'].join(' '));
      }
    }

    // German pluralization (basic)
    if (language === 'de') {
      if (lastWord.endsWith('er') || lastWord.endsWith('en')) {
        // Already plural-like, add singular guess
        const singular = lastWord.slice(0, -2);
        if (singular.length > 2) {
          variations.add([...words.slice(0, -1), singular].join(' '));
        }
      }
    }
  }

  /**
   * Add hyphenation variations
   * COPIED FROM: src/utils/keywordMatcher.js lines 265-277
   */
  _addHyphenVariations(keyword, variations) {
    // last mile → last-mile, lastmile
    if (keyword.includes(' ') && !keyword.includes('-')) {
      variations.add(keyword.replace(/\s+/g, '-'));
      variations.add(keyword.replace(/\s+/g, ''));
    }

    // last-mile → last mile, lastmile
    if (keyword.includes('-')) {
      variations.add(keyword.replace(/-/g, ' '));
      variations.add(keyword.replace(/-/g, ''));
    }
  }
}

module.exports = VariationGenerator;
