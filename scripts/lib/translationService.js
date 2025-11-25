const fs = require('fs');
const path = require('path');

/**
 * Translation Service for keyword management
 * Provides word-by-word translation using static dictionary (NO API calls)
 */
class TranslationService {
  /**
   * @param {string} dictionaryPath - Path to translations-dictionary.json
   */
  constructor(dictionaryPath) {
    // Load static dictionary
    try {
      const content = fs.readFileSync(dictionaryPath, 'utf8');
      this.dictionary = JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Dictionary file not found: ${dictionaryPath}`);
      }
      throw new Error(`Invalid JSON in dictionary: ${err.message}`);
    }
  }

  /**
   * Translate keyword using word-by-word lookup
   * @param {string} keyword - Keyword to translate
   * @param {string} fromLang - Source language (en)
   * @param {string} toLang - Target language (de)
   * @returns {array} - Array of translations
   */
  translate(keyword, fromLang = 'en', toLang = 'de') {
    if (fromLang !== 'en' || toLang !== 'de') {
      return []; // Only EN→DE supported for now
    }

    const keywordLower = keyword.toLowerCase();

    // Build translation combinations
    const translations = this._buildTranslations(keywordLower);

    return translations;
  }

  /**
   * Build translations for a keyword
   * @param {string} keyword - Keyword (lowercase)
   * @returns {array} - Array of translations
   */
  _buildTranslations(keyword) {
    const dict = this.dictionary['en-to-de'];

    // 1. Try exact phrase match first
    if (dict[keyword]) {
      return dict[keyword];
    }

    // 2. Word-by-word translation with combinations
    const words = keyword.split(' ');
    const wordTranslations = words.map(word => {
      // Check if word exists in dictionary
      if (dict[word]) {
        return dict[word];
      }
      // Keep original if no translation found
      return [word];
    });

    // Generate all combinations (cartesian product)
    return this._cartesianProduct(wordTranslations);
  }

  /**
   * Generate cartesian product of translation arrays
   * Example: [["a", "b"], ["c", "d"]] → ["a c", "a d", "b c", "b d"]
   * @param {array} arrays - Array of arrays
   * @returns {array} - Cartesian product
   */
  _cartesianProduct(arrays) {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) return arrays[0];

    const result = [];

    const generate = (current, index) => {
      if (index === arrays.length) {
        result.push(current.join(' '));
        return;
      }

      for (const value of arrays[index]) {
        generate([...current, value], index + 1);
      }
    };

    generate([], 0);
    return result;
  }
}

module.exports = TranslationService;
