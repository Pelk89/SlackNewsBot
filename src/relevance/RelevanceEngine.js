/**
 * RelevanceEngine - Main orchestrator for news relevance scoring and filtering
 *
 * Pipeline:
 * 1. Hard Filters: Remove spam, duplicates, low-quality articles
 * 2. Scoring: Score each article on multiple dimensions
 * 3. Soft Filters: Remove articles below relevance threshold
 * 4. Ranking: Sort by relevance score
 * 5. Limiting: Return top N articles
 */

const path = require('path');
const fs = require('fs');

// Import scorers
const ThematicScorer = require('./scorers/ThematicScorer');
const AuthorityScorer = require('./scorers/AuthorityScorer');
const TimelinessScorer = require('./scorers/TimelinessScorer');
const InnovationScorer = require('./scorers/InnovationScorer');

// Import filters
const SpamFilter = require('./filters/SpamFilter');
const DuplicateFilter = require('./filters/DuplicateFilter');
const QualityFilter = require('./filters/QualityFilter');

class RelevanceEngine {
  constructor(configPath = null) {
    // Load configuration
    if (!configPath) {
      configPath = path.join(__dirname, 'config', 'relevance.json');
    }

    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load relevance config:', error.message);
      throw new Error('RelevanceEngine requires valid configuration');
    }

    // Initialize scorers
    this.thematicScorer = new ThematicScorer(this.config);
    this.authorityScorer = new AuthorityScorer(this.config);
    this.timelinessScorer = new TimelinessScorer(this.config);
    this.innovationScorer = new InnovationScorer(this.config);

    // Initialize filters
    this.spamFilter = new SpamFilter(this.config);
    this.duplicateFilter = new DuplicateFilter(this.config);
    this.qualityFilter = new QualityFilter(this.config);

    // Extract config values
    this.weights = this.config.scoring.weights;
    this.minRelevanceScore = this.config.scoring.thresholds.minRelevanceScore;
    // Respect MAX_NEWS_ITEMS env variable, fallback to config, then default to 10
    this.maxArticles = parseInt(process.env.MAX_NEWS_ITEMS) || this.config.filtering.maxArticles || 10;

    console.log('RelevanceEngine initialized with weights:', this.weights);
  }

  /**
   * Main method: Score and filter articles
   * @param {Array} articles - Array of raw article objects
   * @returns {Array} Filtered and scored articles, sorted by relevance
   */
  async scoreAndFilter(articles) {
    console.log(`\n=== RelevanceEngine Processing ${articles.length} articles ===`);

    let filtered = [...articles];

    // Stage 1: Hard Filters
    console.log('\n--- Stage 1: Hard Filters ---');
    const beforeSpam = filtered.length;
    filtered = this.spamFilter.filter(filtered);
    console.log(`Spam filter: ${beforeSpam} → ${filtered.length}`);

    const beforeDuplicates = filtered.length;
    filtered = this.duplicateFilter.filter(filtered);
    console.log(`Duplicate filter: ${beforeDuplicates} → ${filtered.length}`);

    const beforeQuality = filtered.length;
    filtered = this.qualityFilter.filter(filtered);
    console.log(`Quality filter: ${beforeQuality} → ${filtered.length}`);

    // Stage 2: Score each article
    console.log('\n--- Stage 2: Scoring ---');
    filtered = filtered.map(article => ({
      ...article,
      relevance: this.scoreArticle(article)
    }));

    // Stage 3: Soft Filter (relevance threshold)
    console.log('\n--- Stage 3: Relevance Threshold ---');
    const beforeThreshold = filtered.length;
    filtered = filtered.filter(a => a.relevance.score >= this.minRelevanceScore);
    console.log(`Threshold filter (>=${this.minRelevanceScore}): ${beforeThreshold} → ${filtered.length}`);

    // Stage 4: Rank by score
    console.log('\n--- Stage 4: Ranking ---');
    filtered.sort((a, b) => b.relevance.score - a.relevance.score);

    // Log top scores
    if (filtered.length > 0) {
      console.log('Top scores:');
      filtered.slice(0, 5).forEach((article, i) => {
        console.log(`  ${i + 1}. ${article.relevance.score.toFixed(3)} - ${article.title.substring(0, 60)}...`);
      });
    }

    // Stage 5: Limit to top N
    console.log('\n--- Stage 5: Limiting ---');
    const beforeLimit = filtered.length;
    filtered = filtered.slice(0, this.maxArticles);
    console.log(`Limit to top ${this.maxArticles}: ${beforeLimit} → ${filtered.length}`);

    console.log(`\n=== Final: ${filtered.length} high-relevance articles ===\n`);

    return filtered;
  }

  /**
   * Score a single article
   * @param {Object} article - Article object
   * @returns {Object} Relevance object with score and breakdown
   */
  scoreArticle(article) {
    // Get individual scores
    const scores = {
      thematic: this.thematicScorer.score(article),
      authority: this.authorityScorer.score(article),
      timeliness: this.timelinessScorer.score(article),
      innovation: this.innovationScorer.score(article)
    };

    // Calculate weighted final score
    const finalScore =
      scores.thematic * this.weights.thematic +
      scores.authority * this.weights.authority +
      scores.timeliness * this.weights.timeliness +
      scores.innovation * this.weights.innovation;

    // Generate reasoning
    const reasoning = this.generateReasoning(scores, article);

    // Calculate confidence
    const confidence = this.calculateConfidence(scores);

    return {
      score: finalScore,
      breakdown: scores,
      metadata: {
        confidence: confidence,
        reasoning: reasoning,
        source: this.authorityScorer.getSourceName(article),
        age: this.timelinessScorer.getFormattedAge(article)
      }
    };
  }

  /**
   * Generate human-readable reasoning for the score
   * @param {Object} scores - Breakdown of individual scores
   * @param {Object} article - Article object
   * @returns {string} Reasoning text
   */
  generateReasoning(scores, article) {
    const reasons = [];

    // Thematic
    if (scores.thematic >= 0.7) {
      reasons.push('highly relevant topic');
    } else if (scores.thematic >= 0.4) {
      reasons.push('relevant topic');
    }

    // Authority
    const tier = this.authorityScorer.getAuthorityTier(article);
    if (tier === 'excellent') {
      reasons.push('top-tier source');
    } else if (tier === 'good') {
      reasons.push('reputable source');
    }

    // Timeliness
    const ageCategory = this.timelinessScorer.getAgeCategory(article);
    if (ageCategory === 'breaking') {
      reasons.push('breaking news');
    } else if (ageCategory === 'recent') {
      reasons.push('recent news');
    }

    // Innovation
    if (scores.innovation >= 0.7) {
      reasons.push('high innovation impact');
    } else if (scores.innovation >= 0.5) {
      reasons.push('innovation-related');
    }

    if (reasons.length === 0) {
      return 'meets basic relevance criteria';
    }

    return reasons.join(', ');
  }

  /**
   * Calculate confidence score
   * @param {Object} scores - Breakdown of individual scores
   * @returns {number} Confidence (0-1)
   */
  calculateConfidence(scores) {
    // Confidence is higher when scores are consistent
    const scoreValues = Object.values(scores);
    const avg = scoreValues.reduce((sum, val) => sum + val, 0) / scoreValues.length;

    // Calculate variance
    const variance = scoreValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / scoreValues.length;

    // Lower variance = higher confidence
    const confidence = Math.max(0, Math.min(1, 1 - variance));

    return confidence;
  }

  /**
   * Get statistics about the filtering process
   * @param {Array} originalArticles - Original article list
   * @param {Array} filteredArticles - Filtered article list
   * @returns {Object} Statistics
   */
  getFilteringStats(originalArticles, filteredArticles) {
    const filterRate = originalArticles.length > 0
      ? ((originalArticles.length - filteredArticles.length) / originalArticles.length) * 100
      : 0;

    const avgScore = filteredArticles.length > 0
      ? filteredArticles.reduce((sum, a) => sum + a.relevance.score, 0) / filteredArticles.length
      : 0;

    return {
      originalCount: originalArticles.length,
      filteredCount: filteredArticles.length,
      removedCount: originalArticles.length - filteredArticles.length,
      filterRate: filterRate.toFixed(1) + '%',
      averageScore: avgScore.toFixed(3),
      topScore: filteredArticles.length > 0 ? filteredArticles[0].relevance.score.toFixed(3) : 'N/A'
    };
  }
}

module.exports = RelevanceEngine;
