const fs = require('fs');
const path = require('path');
const NewsAggregator = require('./aggregator');
const RelevanceScorer = require('./scorer');
const GoogleNewsSource = require('./sources/GoogleNewsSource');
const RSSSource = require('./sources/RSSSource');
const NewsAPISource = require('./sources/NewsAPISource');
const XSource = require('./sources/XSource');

/**
 * SourceManager - Manages all news sources
 *
 * Orchestrates fetching, aggregation, scoring, and diversification
 */
class SourceManager {
  constructor(configPath = null) {
    // Load configuration
    const defaultConfigPath = path.join(__dirname, '../config/sources.json');
    const configFile = configPath || process.env.NEWS_SOURCES_CONFIG || defaultConfigPath;

    this.config = this.loadConfig(configFile);

    // Initialize components
    this.aggregator = new NewsAggregator({
      similarityThreshold: 0.8
    });

    this.scorer = new RelevanceScorer(
      this.config.scoring,
      this.config.sourceAuthority
    );

    // Initialize sources
    this.sources = this.loadSources();

    console.log(`✓ SourceManager initialized with ${this.sources.length} sources`);
  }

  /**
   * Load configuration from JSON file
   *
   * @param {string} configPath - Path to config file
   * @returns {Object} Configuration object
   */
  loadConfig(configPath) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);

      // Replace environment variables in config
      return this.replaceEnvVars(config);
    } catch (error) {
      console.error(`Error loading config from ${configPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Replace environment variable placeholders in config
   *
   * @param {Object} obj - Configuration object
   * @returns {Object} Config with env vars replaced
   */
  replaceEnvVars(obj) {
    const replaced = JSON.parse(JSON.stringify(obj)); // Deep clone

    const replace = (item) => {
      if (typeof item === 'string') {
        // Replace ${VAR_NAME} with process.env.VAR_NAME
        return item.replace(/\$\{([^}]+)\}/g, (match, varName) => {
          return process.env[varName] || match;
        });
      } else if (Array.isArray(item)) {
        return item.map(replace);
      } else if (typeof item === 'object' && item !== null) {
        const result = {};
        for (const key in item) {
          result[key] = replace(item[key]);
        }
        return result;
      }
      return item;
    };

    return replace(replaced);
  }

  /**
   * Load and initialize all configured sources
   *
   * @returns {Array<BaseSource>} Array of source instances
   */
  loadSources() {
    const sources = [];

    for (const sourceConfig of this.config.sources) {
      try {
        const source = this.createSourceInstance(sourceConfig);

        if (!source.validate()) {
          console.warn(`⚠ Source ${sourceConfig.id} failed validation, skipping`);
          continue;
        }

        if (!source.enabled) {
          console.log(`⊗ Source ${sourceConfig.id} is disabled`);
          continue;
        }

        sources.push(source);
        console.log(`✓ Loaded source: ${source.name} (${source.type})`);
      } catch (error) {
        console.error(`✗ Error loading source ${sourceConfig.id}:`, error.message);
      }
    }

    return sources;
  }

  /**
   * Create source instance based on type
   *
   * @param {Object} config - Source configuration
   * @returns {BaseSource} Source instance
   */
  createSourceInstance(config) {
    switch (config.type) {
      case 'google-news':
        return new GoogleNewsSource(config);

      case 'newsapi':
        return new NewsAPISource(config);

      case 'rss':
        return new RSSSource(config);

      case 'x':
      case 'twitter':
        return new XSource(config);

      default:
        throw new Error(`Unknown source type: ${config.type}`);
    }
  }

  /**
   * Fetch news from all enabled sources
   *
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} Aggregated, scored, and diversified news
   */
  async fetchAllNews(keywords) {
    console.log(`\n→ Fetching news for keywords: ${keywords.join(', ')}`);
    console.log(`→ Using ${this.sources.length} enabled sources\n`);

    try {
      // Fetch from all sources in parallel (Promise.allSettled for graceful degradation)
      const promises = this.sources.map(source =>
        this.fetchFromSource(source, keywords)
      );

      const results = await Promise.allSettled(promises);

      // Collect successful results
      const successfulResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.warn(`⚠ ${failedCount} source(s) failed to fetch`);
      }

      // Aggregate and deduplicate
      console.log(`\n→ Aggregating results from ${successfulResults.length} sources`);
      const aggregated = this.aggregator.aggregate(successfulResults);

      // Score all items
      console.log(`→ Scoring ${aggregated.length} items`);
      const scored = this.scorer.scoreAll(aggregated, keywords);

      // Sort by score
      const sorted = this.aggregator.sort(scored, 'score');

      // Diversify sources
      console.log(`→ Applying source diversification`);
      const diversified = this.diversify(sorted);

      console.log(`✓ Final result: ${diversified.length} news items\n`);

      return diversified;
    } catch (error) {
      console.error('✗ Error fetching news:', error);
      throw error;
    }
  }

  /**
   * Fetch news from a single source with error handling
   *
   * @param {BaseSource} source - Source instance
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} News items from source
   */
  async fetchFromSource(source, keywords) {
    try {
      const items = await source.fetch(keywords);
      return items || [];
    } catch (error) {
      console.error(`✗ Error fetching from ${source.name}:`, error.message);
      return []; // Graceful degradation
    }
  }

  /**
   * Diversify news sources to prevent single-source dominance
   *
   * @param {Array<Object>} items - Scored news items
   * @returns {Array<Object>} Diversified items
   */
  diversify(items) {
    const maxPerSource = this.config.diversification?.maxPerSource || 3;
    const minSources = this.config.diversification?.minSources || 2;

    const sourceCounts = {};
    const diversified = [];
    const uniqueSources = new Set();

    for (const item of items) {
      const sourceId = item.sourceId;

      // Track how many items from this source
      sourceCounts[sourceId] = (sourceCounts[sourceId] || 0) + 1;

      // Skip if we've reached max for this source
      if (sourceCounts[sourceId] > maxPerSource) {
        continue;
      }

      diversified.push(item);
      uniqueSources.add(sourceId);
    }

    // Warn if we don't have minimum source diversity
    if (uniqueSources.size < minSources) {
      console.warn(`⚠ Only ${uniqueSources.size} unique sources (minimum: ${minSources})`);
    }

    return diversified;
  }

  /**
   * Get statistics about news sources
   *
   * @param {Array<Object>} items - News items
   * @returns {Object} Statistics
   */
  getStats(items) {
    return this.aggregator.getStats(items);
  }

  /**
   * Get list of enabled sources
   *
   * @returns {Array<Object>} Source info
   */
  getEnabledSources() {
    return this.sources.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      priority: s.priority
    }));
  }
}

module.exports = SourceManager;
