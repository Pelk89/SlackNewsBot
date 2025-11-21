const { compareTwoStrings } = require('string-similarity');

/**
 * KeywordMatcher - Advanced keyword matching with variations, synonyms, and fuzzy matching
 *
 * Features:
 * - Exact matching (case-insensitive)
 * - Automatic plural/singular generation
 * - Automatic hyphenation variations (last-mile ↔ last mile)
 * - Multi-language synonym support (EN ↔ DE)
 * - Fuzzy matching with configurable threshold
 * - Hybrid mode (variations first, then fuzzy as fallback)
 * - Performance-optimized with balanced caching
 */

class KeywordMatcher {
  constructor(config = {}) {
    this.config = {
      mode: process.env.KEYWORD_MATCHING_MODE || config.mode || 'hybrid', // exact|variations|fuzzy|hybrid
      fuzzyThreshold: parseFloat(process.env.KEYWORD_FUZZY_THRESHOLD || config.fuzzyThreshold || '0.8'),
      autoPlural: process.env.KEYWORD_AUTO_PLURAL !== 'false' && (config.autoPlural !== false),
      autoHyphen: process.env.KEYWORD_AUTO_HYPHEN !== 'false' && (config.autoHyphen !== false),
      cacheEnabled: config.cacheEnabled !== false
    };

    // Manual variations (loaded from relevance.json)
    this.variations = config.variations || {};

    // EN ↔ DE synonym mappings (loaded from relevance.json)
    this.synonyms = config.synonyms || {
      'en-de': {}
    };

    // Balanced cache: Only cache frequent matches
    this.matchCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.maxCacheSize = 500; // Balanced: not too large

    console.log('✓ KeywordMatcher initialized:', {
      mode: this.config.mode,
      fuzzyThreshold: this.config.fuzzyThreshold,
      autoPlural: this.config.autoPlural,
      autoHyphen: this.config.autoHyphen,
      manualVariations: Object.keys(this.variations).length,
      synonyms: Object.keys(this.synonyms['en-de']).length
    });
  }

  /**
   * Main matching function - checks if text contains keyword (with variations/synonyms)
   * @param {string} text - Text to search in (e.g., article title/description)
   * @param {string} keyword - Keyword to search for
   * @param {object} options - Override options (language, mode)
   * @returns {object} - { matched: boolean, matchType: string, similarity: number }
   */
  matches(text, keyword, options = {}) {
    if (!text || !keyword) {
      return { matched: false, matchType: 'none', similarity: 0 };
    }

    const textLower = text.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    const mode = options.mode || this.config.mode;

    // Cache key
    const cacheKey = `${textLower}:${keywordLower}:${mode}`;

    // Check cache (balanced caching)
    if (this.config.cacheEnabled && this.matchCache.has(cacheKey)) {
      this.cacheHits++;
      return this.matchCache.get(cacheKey);
    }
    this.cacheMisses++;

    let result;

    // Strategy based on mode
    switch (mode) {
      case 'exact':
        result = this._exactMatch(textLower, keywordLower);
        break;

      case 'variations':
        result = this._variationsMatch(textLower, keywordLower, options);
        break;

      case 'fuzzy':
        result = this._fuzzyMatch(textLower, keywordLower);
        break;

      case 'hybrid':
      default:
        // Hybrid: Try variations first, then fuzzy as fallback
        result = this._variationsMatch(textLower, keywordLower, options);
        if (!result.matched) {
          const fuzzyResult = this._fuzzyMatch(textLower, keywordLower);
          if (fuzzyResult.matched) {
            result = fuzzyResult;
          }
        }
        break;
    }

    // Cache result (if cache not too large)
    if (this.config.cacheEnabled && this.matchCache.size < this.maxCacheSize) {
      this.matchCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Exact substring matching (case-insensitive)
   */
  _exactMatch(text, keyword) {
    const matched = text.includes(keyword);
    return {
      matched,
      matchType: matched ? 'exact' : 'none',
      similarity: matched ? 1.0 : 0
    };
  }

  /**
   * Variations matching: manual variations, auto-generated plural/hyphen, and synonyms
   */
  _variationsMatch(text, keyword, options = {}) {
    const language = options.language || 'en';

    // 1. Check exact match first
    if (text.includes(keyword)) {
      return { matched: true, matchType: 'exact', similarity: 1.0 };
    }

    // 2. Generate all variations for this keyword
    const allVariations = this._generateVariations(keyword, language);

    // 3. Check each variation
    for (const variation of allVariations) {
      if (text.includes(variation.toLowerCase())) {
        return {
          matched: true,
          matchType: variation === keyword ? 'exact' : 'variation',
          similarity: 0.95,
          matchedVariation: variation
        };
      }
    }

    return { matched: false, matchType: 'none', similarity: 0 };
  }

  /**
   * Fuzzy matching using string-similarity library
   */
  _fuzzyMatch(text, keyword) {
    // For fuzzy matching, compare keyword against each word in text
    const words = text.split(/\s+/);
    let maxSimilarity = 0;
    let bestMatch = null;

    // Check individual words
    for (const word of words) {
      const similarity = compareTwoStrings(keyword, word);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatch = word;
      }
    }

    // Also check multi-word phrases
    if (keyword.includes(' ')) {
      const keywordWords = keyword.split(' ');
      const windowSize = keywordWords.length;

      for (let i = 0; i <= words.length - windowSize; i++) {
        const phrase = words.slice(i, i + windowSize).join(' ');
        const similarity = compareTwoStrings(keyword, phrase);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestMatch = phrase;
        }
      }
    }

    const matched = maxSimilarity >= this.config.fuzzyThreshold;

    return {
      matched,
      matchType: matched ? 'fuzzy' : 'none',
      similarity: maxSimilarity,
      matchedText: bestMatch
    };
  }

  /**
   * Generate all variations for a keyword
   * @param {string} keyword - Base keyword
   * @param {string} language - Language context (en, de)
   * @returns {array} - Array of keyword variations
   */
  _generateVariations(keyword, language = 'en') {
    const variations = new Set([keyword]);

    // 1. Manual variations from config
    if (this.variations[keyword]) {
      this.variations[keyword].forEach(v => variations.add(v));
    }

    // 2. Auto-generate plural/singular
    if (this.config.autoPlural) {
      this._addPluralVariations(keyword, variations, language);
    }

    // 3. Auto-generate hyphenation variations
    if (this.config.autoHyphen) {
      this._addHyphenVariations(keyword, variations);
    }

    // 4. Add synonyms (EN ↔ DE)
    this._addSynonyms(keyword, variations, language);

    return Array.from(variations);
  }

  /**
   * Add plural/singular variations
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

  /**
   * Add multi-language synonyms
   */
  _addSynonyms(keyword, variations, language) {
    // English → German
    if (language === 'de' && this.synonyms['en-de'][keyword]) {
      this.synonyms['en-de'][keyword].forEach(syn => variations.add(syn));
    }

    // German → English (reverse lookup)
    if (language === 'en') {
      for (const [enWord, deWords] of Object.entries(this.synonyms['en-de'])) {
        if (deWords.includes(keyword)) {
          variations.add(enWord);
        }
      }
    }

    // Also check if keyword contains synonyms
    for (const [enWord, deWords] of Object.entries(this.synonyms['en-de'])) {
      if (keyword.includes(enWord)) {
        deWords.forEach(deWord => {
          variations.add(keyword.replace(enWord, deWord));
        });
      }
    }
  }

  /**
   * Get all variations for a keyword (useful for debugging)
   */
  getVariations(keyword, language = 'en') {
    return this._generateVariations(keyword, language);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.matchCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total * 100).toFixed(2) : 0;

    return {
      size: this.matchCache.size,
      maxSize: this.maxCacheSize,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Log cache statistics
   */
  logCacheStats() {
    const stats = this.getCacheStats();
    console.log('\n📊 KeywordMatcher Cache Statistics:');
    console.log(`   Size: ${stats.size}/${stats.maxSize}`);
    console.log(`   Hit Rate: ${stats.hitRate} (${stats.hits} hits / ${stats.misses} misses)`);
  }
}

// Singleton instance
let keywordMatcherInstance = null;

/**
 * Get singleton KeywordMatcher instance
 * @param {object} config - Configuration object (only used on first call)
 * @returns {KeywordMatcher}
 */
function getKeywordMatcher(config = null) {
  if (!keywordMatcherInstance && config) {
    keywordMatcherInstance = new KeywordMatcher(config);
  } else if (!keywordMatcherInstance) {
    // Load config from relevance.json if not provided
    try {
      const relevanceConfig = require('../relevance/config/relevance.json');
      keywordMatcherInstance = new KeywordMatcher({
        variations: relevanceConfig.keywords?.variations || {},
        synonyms: relevanceConfig.keywords?.synonyms || { 'en-de': {} },
        ...relevanceConfig.keywords?.matchingOptions || {}
      });
    } catch (error) {
      console.warn('⚠️  Could not load relevance.json, using default KeywordMatcher config');
      keywordMatcherInstance = new KeywordMatcher();
    }
  }

  return keywordMatcherInstance;
}

module.exports = {
  KeywordMatcher,
  getKeywordMatcher
};
