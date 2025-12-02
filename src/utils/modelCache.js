/**
 * ModelCache - Singleton for managing ML model instances
 *
 * Purpose:
 * - Load models once at startup (or first use)
 * - Reuse same model instances across multiple scoring calls
 * - Avoid reloading ~300MB of models on every request
 *
 * Usage:
 *   const modelCache = require('./utils/modelCache');
 *   const scorer = await modelCache.getSemanticScorer(config);
 */
class ModelCache {
  constructor() {
    this.semanticScorer = null;
    this.initializationPromise = null;
  }

  /**
   * Get or create SemanticScorer instance
   * @param {Object} config - Configuration object
   * @returns {Promise<SemanticScorer>} - Initialized scorer
   */
  async getSemanticScorer(config) {
    // If already initialized, return immediately
    if (this.semanticScorer) {
      return this.semanticScorer;
    }

    // If initialization in progress, wait for it
    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.semanticScorer;
    }

    // Start initialization
    this.initializationPromise = this._initializeSemanticScorer(config);
    await this.initializationPromise;
    this.initializationPromise = null;

    return this.semanticScorer;
  }

  /**
   * Internal method to initialize scorer
   * @private
   */
  async _initializeSemanticScorer(config) {
    const SemanticScorer = require('../relevance/scorers/SemanticScorer');
    this.semanticScorer = new SemanticScorer(config);
    await this.semanticScorer.initialize();
  }

  /**
   * Clear cached models (useful for testing or reload)
   */
  clear() {
    this.semanticScorer = null;
    this.initializationPromise = null;
  }
}

// Export singleton instance
module.exports = new ModelCache();
