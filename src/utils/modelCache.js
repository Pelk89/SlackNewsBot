/**
 * ModelCache - Singleton for caching ML models
 *
 * Provides centralized caching of Transformers.js models to avoid
 * reloading models multiple times during application runtime
 */

let modelCacheInstance = null;

class ModelCache {
  constructor() {
    if (modelCacheInstance) {
      return modelCacheInstance;
    }

    this.cache = new Map();
    this.loading = new Map();
    this.transformers = null;

    modelCacheInstance = this;
  }

  /**
   * Get transformers library (lazy load)
   * @returns {Promise<Object>} Transformers.js library
   */
  async getTransformers() {
    if (this.transformers) {
      return this.transformers;
    }

    try {
      // Lazy load @xenova/transformers
      this.transformers = await import('@xenova/transformers');
      return this.transformers;
    } catch (error) {
      console.error('Failed to load @xenova/transformers:', error.message);
      throw new Error('Transformers.js is required. Install with: npm install @xenova/transformers');
    }
  }

  /**
   * Get embedding model (multilingual support)
   * Uses sentence-transformers/all-MiniLM-L6-v2 for English
   * or multilingual-e5-small for multilingual support
   *
   * @param {string} modelName - Optional model name
   * @returns {Promise<Object>} Loaded pipeline
   */
  async getEmbeddingModel(modelName = 'Xenova/all-MiniLM-L6-v2') {
    // Check cache first
    if (this.cache.has(modelName)) {
      return this.cache.get(modelName);
    }

    // Check if already loading
    if (this.loading.has(modelName)) {
      return await this.loading.get(modelName);
    }

    // Start loading
    const loadingPromise = this._loadEmbeddingModel(modelName);
    this.loading.set(modelName, loadingPromise);

    try {
      const model = await loadingPromise;
      this.cache.set(modelName, model);
      this.loading.delete(modelName);
      return model;
    } catch (error) {
      this.loading.delete(modelName);
      throw error;
    }
  }

  /**
   * Internal method to load embedding model
   * @private
   */
  async _loadEmbeddingModel(modelName) {
    try {
      console.log(`Loading embedding model: ${modelName}...`);
      const startTime = Date.now();

      const { pipeline } = await this.getTransformers();

      // Create feature extraction pipeline
      const extractor = await pipeline('feature-extraction', modelName);

      const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✓ Model loaded in ${loadTime}s`);

      return extractor;
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error.message);
      throw error;
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
    this.loading.clear();
    console.log('✓ Model cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      cachedModels: this.cache.size,
      loadingModels: this.loading.size,
      models: Array.from(this.cache.keys())
    };
  }
}

/**
 * Get or create the singleton instance
 * @returns {ModelCache} ModelCache instance
 */
function getModelCache() {
  if (!modelCacheInstance) {
    modelCacheInstance = new ModelCache();
  }
  return modelCacheInstance;
}

module.exports = {
  ModelCache,
  getModelCache
};
