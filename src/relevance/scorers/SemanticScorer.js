/**
 * SemanticScorer - NLP-based topic matching using embeddings
 *
 * Scores articles based on semantic similarity to predefined topics
 * using multilingual sentence embeddings (EN + DE support)
 */

const path = require('path');
const fs = require('fs');
const { getModelCache } = require('../../utils/modelCache');

class SemanticScorer {
  constructor(config = null) {
    // Load topics configuration
    const topicsPath = path.join(__dirname, '../../../config/topics.json');

    try {
      const topicsData = fs.readFileSync(topicsPath, 'utf8');
      const topicsConfig = JSON.parse(topicsData);
      this.topics = topicsConfig.topics;
    } catch (error) {
      console.error('Failed to load topics.json:', error.message);
      this.topics = [];
    }

    // Get model cache singleton
    this.modelCache = getModelCache();

    // Track initialization
    this.initialized = false;
    this.topicEmbeddings = null;
  }

  /**
   * Initialize the semantic scorer (lazy loading)
   * Generates embeddings for all topic examples
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Get embedding model from cache
      const model = await this.modelCache.getEmbeddingModel();

      // Generate embeddings for all topics
      this.topicEmbeddings = await Promise.all(
        this.topics.map(async (topic) => {
          // Combine all examples into a single representative text
          const combinedText = topic.examples.join('. ');

          // Generate embedding
          const output = await model(combinedText, { pooling: 'mean', normalize: true });
          const embedding = Array.from(output.data);

          return {
            id: topic.id,
            name: topic.name,
            weight: topic.weight,
            tier: topic.tier,
            embedding: embedding
          };
        })
      );

      this.initialized = true;
      console.log(`✓ SemanticScorer initialized with ${this.topics.length} topics`);
    } catch (error) {
      console.error('Failed to initialize SemanticScorer:', error.message);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Score an article based on semantic similarity to topics
   * @param {Object} article - Article object with title and description
   * @returns {Promise<number>} Score between 0 and 1
   */
  async score(article) {
    try {
      // Lazy initialization
      if (!this.initialized) {
        await this.initialize();
      }

      // Combine title and description for article text
      const articleText = `${article.title || ''} ${article.description || ''}`.trim();

      if (!articleText) {
        return 0;
      }

      // Get embedding for article
      const model = await this.modelCache.getEmbeddingModel();
      const output = await model(articleText, { pooling: 'mean', normalize: true });
      const articleEmbedding = Array.from(output.data);

      // Calculate similarity to each topic
      const similarities = this.topicEmbeddings.map(topic => {
        const similarity = this.cosineSimilarity(articleEmbedding, topic.embedding);

        // Apply topic weight
        const weightedSimilarity = similarity * topic.weight;

        return {
          topic: topic.name,
          similarity: similarity,
          weightedSimilarity: weightedSimilarity,
          tier: topic.tier
        };
      });

      // Get best match
      const bestMatch = similarities.reduce((best, current) =>
        current.weightedSimilarity > best.weightedSimilarity ? current : best
      );

      // Normalize score to 0-1 range
      // Use best weighted similarity, clamped to max expected value
      // Tier 1 topics (weight 2.0) can reach max ~2.0, normalize by this
      const maxExpectedScore = 2.0;
      const normalizedScore = Math.min(1.0, bestMatch.weightedSimilarity / maxExpectedScore);

      return normalizedScore;
    } catch (error) {
      console.error('Error in SemanticScorer.score():', error.message);
      return 0;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array} vecA - First vector
   * @param {Array} vecB - Second vector
   * @returns {number} Similarity score between -1 and 1
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Get detailed scoring breakdown for debugging
   * @param {Object} article - Article object
   * @returns {Promise<Object>} Detailed scoring info
   */
  async getDetailedScore(article) {
    if (!this.initialized) {
      await this.initialize();
    }

    const articleText = `${article.title || ''} ${article.description || ''}`.trim();

    if (!articleText) {
      return { score: 0, matches: [] };
    }

    const model = await this.modelCache.getEmbeddingModel();
    const output = await model(articleText, { pooling: 'mean', normalize: true });
    const articleEmbedding = Array.from(output.data);

    const similarities = this.topicEmbeddings.map(topic => {
      const similarity = this.cosineSimilarity(articleEmbedding, topic.embedding);

      return {
        topic: topic.name,
        id: topic.id,
        similarity: similarity,
        weight: topic.weight,
        weightedSimilarity: similarity * topic.weight,
        tier: topic.tier
      };
    });

    // Sort by weighted similarity
    similarities.sort((a, b) => b.weightedSimilarity - a.weightedSimilarity);

    const bestMatch = similarities[0];
    const maxExpectedScore = 2.0;
    const normalizedScore = Math.min(1.0, bestMatch.weightedSimilarity / maxExpectedScore);

    return {
      score: normalizedScore,
      matches: similarities.slice(0, 5), // Top 5 matches
      bestMatch: bestMatch.topic
    };
  }
}

module.exports = SemanticScorer;
