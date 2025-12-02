const { pipeline } = require('@xenova/transformers');

/**
 * SemanticScorer - Uses embeddings and sentiment analysis for relevance scoring
 *
 * Architecture:
 * 1. Generates embeddings for article text using multilingual sentence transformer
 * 2. Compares article embedding with pre-computed topic embeddings
 * 3. Applies sentiment analysis to boost positive news, reduce negative news
 *
 * Models:
 * - Embedding: paraphrase-multilingual-MiniLM-L12-v2 (EN+DE support)
 * - Sentiment: nlp-town/bert-base-multilingual-uncased-sentiment (1-5 stars)
 */
class SemanticScorer {
  constructor(config) {
    this.config = config;
    this.embeddingModel = null;
    this.sentimentModel = null;
    this.topics = [];
    this.initialized = false;
  }

  /**
   * Initialize models and topic embeddings
   * Called once at startup or first use (lazy initialization)
   */
  async initialize() {
    if (this.initialized) return;

    console.log('🤖 SemanticScorer: Loading embedding model...');
    this.embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
    );

    console.log('😊 SemanticScorer: Loading sentiment model...');
    this.sentimentModel = await pipeline(
      'sentiment-analysis',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );

    console.log('📚 SemanticScorer: Initializing topic embeddings...');
    await this.initTopicEmbeddings();

    this.initialized = true;
    console.log(`✅ SemanticScorer: Initialized with ${this.topics.length} topics`);
  }

  /**
   * Load topics from config and compute their embeddings
   * Each topic embedding is the average of its example embeddings
   */
  async initTopicEmbeddings() {
    try {
      const path = require('path');
      const topicsPath = path.join(__dirname, '../../../config/topics.json');
      const topicsConfig = require(topicsPath);

      for (const topic of topicsConfig.topics) {
        // Embed each example sentence
        const exampleEmbeddings = [];
        for (const example of topic.examples) {
          const emb = await this.embeddingModel(example, {
            pooling: 'mean',
            normalize: true
          });
          exampleEmbeddings.push(emb.data);
        }

        // Average all example embeddings to create topic embedding
        topic.embedding = this.averageVectors(exampleEmbeddings);
      }

      this.topics = topicsConfig.topics;
    } catch (error) {
      console.error('❌ SemanticScorer: Failed to load topics.json:', error.message);
      console.error('   Make sure config/topics.json exists and is valid JSON');
      throw error;
    }
  }

  /**
   * Compute average of multiple vectors
   * @param {Array<Float32Array>} vectors - Array of embedding vectors
   * @returns {Float32Array} - Averaged vector
   */
  averageVectors(vectors) {
    if (!vectors || vectors.length === 0) {
      throw new Error('Cannot average empty vector array');
    }

    const dim = vectors[0].length;
    const avg = new Float32Array(dim);

    for (let i = 0; i < dim; i++) {
      let sum = 0;
      for (const vec of vectors) {
        sum += vec[i];
      }
      avg[i] = sum / vectors.length;
    }

    return avg;
  }

  /**
   * Compute cosine similarity between two vectors
   * @param {Float32Array} a - First vector
   * @param {Float32Array} b - Second vector
   * @returns {number} - Similarity score between -1 and 1 (typically 0.2-0.9)
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Score an article based on semantic similarity and sentiment
   * @param {Object} article - Article with title and description
   * @returns {Object} - Score (0-1) and metadata
   */
  async score(article) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Generate article embedding from title + description
    const text = `${article.title}. ${article.description || ''}`.trim();

    if (!text || text.length < 10) {
      // Article too short, return low score
      return {
        score: 0.0,
        metadata: {
          topicMatch: 'none',
          topicSimilarity: 0,
          sentiment: 3,
          sentimentLabel: 'NEUTRAL',
          sentimentConfidence: 0,
          reason: 'Article text too short'
        }
      };
    }

    const articleEmbResult = await this.embeddingModel(text, {
      pooling: 'mean',
      normalize: true
    });
    const articleEmb = articleEmbResult.data;

    // Find best matching topic
    let maxScore = 0;
    let bestTopic = null;

    for (const topic of this.topics) {
      const similarity = this.cosineSimilarity(articleEmb, topic.embedding);
      const weightedScore = similarity * topic.weight;

      if (weightedScore > maxScore) {
        maxScore = weightedScore;
        bestTopic = topic;
      }
    }

    // Normalize similarity from typical range [0.2, 0.9] to [0, 1]
    // This makes scores more interpretable and comparable
    const normalized = Math.max(0, Math.min(1, (maxScore - 0.2) / 0.7));

    // Sentiment analysis (for metadata only - does NOT affect scoring)
    // User requirement: Negative news is important and should not be filtered!
    const sentimentResult = await this.sentimentModel(text);
    const sentimentLabel = sentimentResult[0].label; // 'POSITIVE' or 'NEGATIVE'
    const sentimentScore = sentimentResult[0].score;

    // Convert sentiment to stars for metadata (does NOT modify score)
    let stars = 3; // Default neutral

    if (sentimentLabel === 'POSITIVE') {
      stars = Math.min(5, Math.round(3 + (sentimentScore * 2))); // 3-5 stars
    } else if (sentimentLabel === 'NEGATIVE') {
      stars = Math.max(1, Math.round(3 - (sentimentScore * 2))); // 1-3 stars
    }

    // Final score WITHOUT sentiment adjustment
    // Negative news is just as relevant as positive news
    const finalScore = normalized;

    return {
      score: finalScore,
      metadata: {
        topicMatch: bestTopic?.id || 'none',
        topicSimilarity: maxScore,
        sentiment: stars,
        sentimentLabel: sentimentLabel,
        sentimentConfidence: sentimentScore
      }
    };
  }
}

module.exports = SemanticScorer;
