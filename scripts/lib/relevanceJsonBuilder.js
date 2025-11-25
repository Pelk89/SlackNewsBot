const fs = require('fs');
const path = require('path');

/**
 * Relevance JSON Builder
 * Builds new relevance.json preserving critical sections (scoring, filtering, sources)
 * and replacing the keywords section with generated content
 */
class RelevanceJsonBuilder {
  /**
   * @param {string} relevanceJsonPath - Path to relevance.json
   */
  constructor(relevanceJsonPath) {
    this.relevanceJsonPath = relevanceJsonPath;

    // Load existing config
    try {
      const content = fs.readFileSync(relevanceJsonPath, 'utf8');
      this.config = JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Relevance JSON file not found: ${relevanceJsonPath}`);
      }
      throw new Error(`Invalid JSON in relevance.json: ${err.message}`);
    }
  }

  /**
   * Build new keywords section from parsed CSV + variations + translations
   * @param {array} keywords - Parsed keywords from CSV
   * @param {object} variationsMap - { "keyword": ["variation1", ...] }
   * @param {object} translationsMap - { "word": ["translation1", ...] }
   * @returns {object} - Complete relevance.json config
   */
  build(keywords, variationsMap, translationsMap) {
    // Group keywords by tier
    const tier1 = keywords.filter(k => k.tier === 1).map(k => k.keyword);
    const tier2 = keywords.filter(k => k.tier === 2).map(k => k.keyword);
    const tier3 = keywords.filter(k => k.tier === 3).map(k => k.keyword);

    // Build variations object (only non-empty variations)
    const variations = {};
    for (const [keyword, vars] of Object.entries(variationsMap)) {
      if (vars.length > 0) {
        variations[keyword] = vars;
      }
    }

    // Build synonyms object (en-de mappings)
    const synonyms = {
      'en-de': translationsMap
    };

    // Build new keywords section
    const newKeywordsSection = {
      tier1,
      tier2,
      tier3,
      variations,
      synonyms,
      matchingOptions: {
        fuzzyThreshold: 0.8,
        autoPlural: true,
        autoHyphen: true,
        cacheEnabled: true
      }
    };

    // Return complete config with preserved sections
    return {
      scoring: this.config.scoring,       // PRESERVED
      filtering: this.config.filtering,   // PRESERVED
      keywords: newKeywordsSection,       // REPLACED
      sources: this.config.sources        // PRESERVED
    };
  }

  /**
   * Write config to file
   * @param {object} config - Complete config object
   * @param {boolean} dryRun - If true, don't write
   * @returns {string} - JSON string (for preview)
   */
  write(config, dryRun = false) {
    // Generate JSON (no comments - JSON doesn't support them)
    const json = JSON.stringify(config, null, 2);

    if (!dryRun) {
      // Write to temp file first, then atomic rename
      const tmpPath = this.relevanceJsonPath + '.tmp';
      fs.writeFileSync(tmpPath, json, 'utf8');
      fs.renameSync(tmpPath, this.relevanceJsonPath);
    }

    return json;
  }
}

module.exports = RelevanceJsonBuilder;
