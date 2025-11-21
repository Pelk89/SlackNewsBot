const fs = require('fs');
const path = require('path');
const NewsAggregator = require('./aggregator');
const RelevanceScorer = require('./scorer');
const GoogleNewsSource = require('./sources/GoogleNewsSource');
const RSSSource = require('./sources/RSSSource');
const NewsAPISource = require('./sources/NewsAPISource');
const XSource = require('./sources/XSource');
const { getCircuitBreaker } = require('../utils/circuitBreaker');

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

    // Initialize circuit breaker
    this.circuitBreaker = getCircuitBreaker();

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
   * Fetch news from a single source with error handling and circuit breaker
   *
   * @param {BaseSource} source - Source instance
   * @param {Array<string>} keywords - Search keywords
   * @returns {Promise<Array<Object>>} News items from source
   */
  async fetchFromSource(source, keywords) {
    const sourceId = source.id || source.name;

    // Check circuit breaker - skip if circuit is open
    if (!this.circuitBreaker.allowRequest(sourceId)) {
      const stats = this.circuitBreaker.getStats(sourceId);
      console.warn(`⚠️  Skipping ${source.name} - circuit breaker OPEN (failure rate: ${stats.failureRatePercent}%)`);
      return [];
    }

    try {
      const items = await source.fetch(keywords);

      // Record success with circuit breaker
      this.circuitBreaker.recordSuccess(sourceId);

      return items || [];
    } catch (error) {
      console.error(`✗ Error fetching from ${source.name}:`, error.message);

      // Record failure with circuit breaker
      this.circuitBreaker.recordFailure(sourceId, error);

      return []; // Graceful degradation
    }
  }

  /**
   * Diversify news sources to prevent single-source dominance
   *
   * Strategy:
   * 1. Group articles by source
   * 2. Use round-robin selection to distribute evenly
   * 3. If insufficient articles, gradually relax maxPerSource
   * 4. Prioritize quality (score) within each source's allocation
   *
   * @param {Array<Object>} items - Scored news items (sorted by score)
   * @returns {Array<Object>} Diversified items
   */
  diversify(items) {
    const targetArticles = 10; // Match newsService.maxItems default
    const configMaxPerSource = this.config.diversification?.maxPerSource || 3;
    const minSources = this.config.diversification?.minSources || 2;

    // Group articles by source (preserving score order within each source)
    const bySource = {};
    items.forEach(item => {
      const sourceId = item.sourceId;
      if (!bySource[sourceId]) {
        bySource[sourceId] = [];
      }
      bySource[sourceId].push(item);
    });

    const sourceIds = Object.keys(bySource);
    const numSources = sourceIds.length;

    if (numSources === 0) {
      console.warn('⚠ No articles available for diversification');
      return [];
    }

    // Try to get targetArticles with smart distribution
    let result = this.tryRoundRobinDiversification(
      bySource,
      sourceIds,
      targetArticles,
      configMaxPerSource
    );

    // If we didn't get enough articles, gradually relax limits
    if (result.articles.length < targetArticles && numSources > 0) {
      const relaxationSteps = [configMaxPerSource + 1, configMaxPerSource + 2, configMaxPerSource + 3, targetArticles];

      for (const relaxedMax of relaxationSteps) {
        if (result.articles.length >= targetArticles) break;

        console.log(`📊 Relaxing maxPerSource to ${relaxedMax} to reach ${targetArticles} articles`);
        result = this.tryRoundRobinDiversification(
          bySource,
          sourceIds,
          targetArticles,
          relaxedMax
        );
      }
    }

    // Log diversity metrics
    const uniqueSources = result.sourceCount;
    const distribution = result.distribution;

    console.log(`📊 Source Diversity: ${uniqueSources} sources, ${result.articles.length} articles`);
    Object.entries(distribution).forEach(([sourceId, count]) => {
      const sourceName = bySource[sourceId][0]?.source || sourceId;
      console.log(`   - ${sourceName}: ${count} articles`);
    });

    // Warn if we don't have minimum source diversity
    if (uniqueSources < minSources) {
      console.warn(`⚠ Only ${uniqueSources} unique sources (minimum: ${minSources})`);
    }

    return result.articles;
  }

  /**
   * Attempt round-robin diversification with given maxPerSource limit
   *
   * @param {Object} bySource - Articles grouped by sourceId
   * @param {Array<string>} sourceIds - List of source IDs
   * @param {number} targetArticles - Target number of articles
   * @param {number} maxPerSource - Max articles per source
   * @returns {Object} Result with articles, sourceCount, and distribution
   */
  tryRoundRobinDiversification(bySource, sourceIds, targetArticles, maxPerSource) {
    const diversified = [];
    const distribution = {};
    const uniqueSources = new Set();

    // Round-robin: take articles from each source in rotation
    let round = 0;
    const maxRounds = Math.max(maxPerSource, Math.ceil(targetArticles / sourceIds.length));

    while (diversified.length < targetArticles && round < maxRounds) {
      let addedThisRound = false;

      for (const sourceId of sourceIds) {
        if (diversified.length >= targetArticles) break;

        const sourceArticles = bySource[sourceId];
        const currentCount = distribution[sourceId] || 0;

        // Check if we can add another article from this source
        if (currentCount < maxPerSource && sourceArticles[round]) {
          diversified.push(sourceArticles[round]);
          distribution[sourceId] = currentCount + 1;
          uniqueSources.add(sourceId);
          addedThisRound = true;
        }
      }

      // If no articles were added this round, we're done
      if (!addedThisRound) break;

      round++;
    }

    return {
      articles: diversified,
      sourceCount: uniqueSources.size,
      distribution: distribution
    };
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
