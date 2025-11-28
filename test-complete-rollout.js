#!/usr/bin/env node

/**
 * Complete End-to-End Rollout Test for Google News Optimization
 *
 * Tests all rollout phases:
 * - Phase 0: Original (baseline)
 * - Phase 1: Query Builder only
 * - Phase 2: Query Builder + Topics
 * - Phase 3: Topics only (edge case)
 */

require('dotenv').config();
const SourceManager = require('./src/sources/SourceManager');
const { getCacheManager } = require('./src/cache/CacheManager');
const fs = require('fs');
const path = require('path');

const SOURCES_PATH = './src/config/sources.json';
const BACKUP_PATH = './src/config/sources.json.backup';

// Test keywords - real retail/tech keywords
const TEST_KEYWORDS = [
  'retail innovation',
  'last mile delivery',
  'autonomous vehicles',
  'grocery automation',
  'supply chain',
  'e-commerce technology'
];

/**
 * Backup current sources.json
 */
function backupConfig() {
  const sourcesData = fs.readFileSync(SOURCES_PATH, 'utf8');
  fs.writeFileSync(BACKUP_PATH, sourcesData, 'utf8');
  console.log('✓ Configuration backed up\n');
}

/**
 * Restore original sources.json
 */
function restoreConfig() {
  if (fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(BACKUP_PATH, SOURCES_PATH);
    fs.unlinkSync(BACKUP_PATH);
    console.log('\n✓ Configuration restored\n');
  }
}

/**
 * Update Google News configuration
 */
function updateGoogleNewsConfig(config) {
  const sourcesData = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'));
  const googleNewsSource = sourcesData.sources.find(s => s.id === 'google-news');

  if (!googleNewsSource) {
    throw new Error('Google News source not found in sources.json');
  }

  // Update configuration
  Object.assign(googleNewsSource.config, config);

  // Write back
  fs.writeFileSync(SOURCES_PATH, JSON.stringify(sourcesData, null, 2), 'utf8');
}

/**
 * Test a specific configuration
 */
async function testConfiguration(phaseName, config, keywords) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${phaseName}`);
  console.log(`${'='.repeat(60)}\n`);

  // Update configuration
  updateGoogleNewsConfig(config);

  // Clear cache to force fresh fetch
  const cacheManager = getCacheManager();
  cacheManager.flush();

  // Create new SourceManager instance (fresh config)
  const manager = new SourceManager();
  const googleNewsSource = manager.sources.find(s => s.id === 'google-news');

  if (!googleNewsSource) {
    throw new Error('Google News source not found');
  }

  console.log('Configuration:');
  console.log(`  Query Builder: ${config.queryBuilder?.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Topics:        ${config.topics?.enabled ? 'ENABLED' : 'DISABLED'}`);
  if (config.topics?.enabled) {
    console.log(`  Topic Feeds:   ${config.topics.feeds.filter(f => f.enabled).map(f => f.name).join(', ')}`);
  }
  console.log(`\nKeywords (${keywords.length}):`, keywords.join(', '));
  console.log('');

  // Measure fetch time
  const startTime = Date.now();
  const items = await manager.fetchFromSource(googleNewsSource, keywords);
  const fetchTime = Date.now() - startTime;

  // Results
  console.log(`\n📊 Results:`);
  console.log(`  Items fetched:  ${items.length}`);
  console.log(`  Fetch time:     ${(fetchTime / 1000).toFixed(2)}s`);

  if (items.length > 0) {
    // Count unique sources
    const sources = new Set(items.map(item => item.source));
    console.log(`  Unique sources: ${sources.size}`);

    // Check if any items have topic metadata
    const topicItems = items.filter(item => item.googleNewsTopic);
    if (topicItems.length > 0) {
      console.log(`  Topic articles: ${topicItems.length}`);
      const topics = new Set(topicItems.map(item => item.googleNewsTopic));
      console.log(`  Topics found:   ${Array.from(topics).join(', ')}`);
    }

    // Sample articles
    console.log(`\n📰 Sample Articles (top 3):`);
    items.slice(0, 3).forEach((item, i) => {
      console.log(`\n  ${i + 1}. ${item.title.substring(0, 70)}...`);
      console.log(`     Source: ${item.source}`);
      if (item.googleNewsTopic) {
        console.log(`     Topic:  ${item.googleNewsTopic}`);
      }
      console.log(`     Date:   ${new Date(item.pubDate).toLocaleDateString()}`);
    });
  }

  return {
    phase: phaseName,
    itemCount: items.length,
    fetchTime,
    config: { ...config }
  };
}

/**
 * Main test runner
 */
async function runCompleteTest() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Google News Optimization - Complete Rollout Test         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Backup original configuration
  backupConfig();

  const results = [];

  try {
    // Phase 0: Baseline (original configuration)
    results.push(await testConfiguration(
      'Phase 0: BASELINE (Original Configuration)',
      {
        keywordSearch: { enabled: true },
        queryBuilder: { enabled: false },
        topics: { enabled: false }
      },
      TEST_KEYWORDS
    ));

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 1: Query Builder Only
    results.push(await testConfiguration(
      'Phase 1: QUERY BUILDER ONLY',
      {
        keywordSearch: { enabled: true },
        queryBuilder: {
          enabled: true,
          dateRange: '7d',
          excludeTerms: ['sale', 'discount', 'recipe', 'cooking'],
          exactPhraseMatching: true,
          maxQueriesPerFetch: 5,
          similarityThreshold: 0.4
        },
        topics: { enabled: false }
      },
      TEST_KEYWORDS
    ));

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 2: Query Builder + Topics (BUSINESS, TECHNOLOGY)
    results.push(await testConfiguration(
      'Phase 2: QUERY BUILDER + TOPICS (2 topics)',
      {
        keywordSearch: { enabled: true },
        queryBuilder: {
          enabled: true,
          dateRange: '7d',
          excludeTerms: ['sale', 'discount', 'recipe', 'cooking'],
          exactPhraseMatching: true,
          maxQueriesPerFetch: 5,
          similarityThreshold: 0.4
        },
        topics: {
          enabled: true,
          feeds: [
            {
              name: 'BUSINESS',
              enabled: true,
              priority: 1,
              url: 'headlines/section/topic/BUSINESS'
            },
            {
              name: 'TECHNOLOGY',
              enabled: true,
              priority: 1,
              url: 'headlines/section/topic/TECHNOLOGY'
            }
          ],
          maxArticlesPerTopic: 15
        }
      },
      TEST_KEYWORDS
    ));

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 3: Full rollout (all 3 topics)
    results.push(await testConfiguration(
      'Phase 3: FULL ROLLOUT (Query Builder + 3 Topics)',
      {
        keywordSearch: { enabled: true },
        queryBuilder: {
          enabled: true,
          dateRange: '7d',
          excludeTerms: ['sale', 'discount', 'recipe', 'cooking'],
          exactPhraseMatching: true,
          maxQueriesPerFetch: 5,
          similarityThreshold: 0.4
        },
        topics: {
          enabled: true,
          feeds: [
            {
              name: 'BUSINESS',
              enabled: true,
              priority: 1,
              url: 'headlines/section/topic/BUSINESS'
            },
            {
              name: 'TECHNOLOGY',
              enabled: true,
              priority: 1,
              url: 'headlines/section/topic/TECHNOLOGY'
            },
            {
              name: 'SCIENCE',
              enabled: true,
              priority: 2,
              url: 'headlines/section/topic/SCIENCE'
            }
          ],
          maxArticlesPerTopic: 15
        }
      },
      TEST_KEYWORDS
    ));

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Edge Case: Topics Only (no keyword search)
    results.push(await testConfiguration(
      'Edge Case: TOPICS ONLY (no keyword search)',
      {
        keywordSearch: { enabled: false },
        queryBuilder: { enabled: false },
        topics: {
          enabled: true,
          feeds: [
            {
              name: 'BUSINESS',
              enabled: true,
              priority: 1,
              url: 'headlines/section/topic/BUSINESS'
            },
            {
              name: 'TECHNOLOGY',
              enabled: true,
              priority: 1,
              url: 'headlines/section/topic/TECHNOLOGY'
            }
          ],
          maxArticlesPerTopic: 15
        }
      },
      TEST_KEYWORDS
    ));

    // Summary Report
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  SUMMARY REPORT                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Phase Comparison:\n');
    console.log('┌─────────────────────────────────────────┬──────────┬────────────┐');
    console.log('│ Phase                                   │ Articles │ Fetch Time │');
    console.log('├─────────────────────────────────────────┼──────────┼────────────┤');

    results.forEach(result => {
      const phase = result.phase.padEnd(39);
      const count = result.itemCount.toString().padStart(8);
      const time = `${(result.fetchTime / 1000).toFixed(2)}s`.padStart(10);
      console.log(`│ ${phase} │ ${count} │ ${time} │`);
    });

    console.log('└─────────────────────────────────────────┴──────────┴────────────┘\n');

    // Calculate improvements
    const baseline = results[0];
    const phase1 = results[1];
    const phase2 = results[2];
    const phase3 = results[3];

    console.log('Performance Improvements:\n');

    if (phase1) {
      const improvement = ((phase1.itemCount - baseline.itemCount) / baseline.itemCount * 100).toFixed(1);
      console.log(`  Phase 1 vs Baseline: ${improvement > 0 ? '+' : ''}${improvement}% articles`);
    }

    if (phase2) {
      const improvement = ((phase2.itemCount - baseline.itemCount) / baseline.itemCount * 100).toFixed(1);
      console.log(`  Phase 2 vs Baseline: ${improvement > 0 ? '+' : ''}${improvement}% articles`);
    }

    if (phase3) {
      const improvement = ((phase3.itemCount - baseline.itemCount) / baseline.itemCount * 100).toFixed(1);
      console.log(`  Phase 3 vs Baseline: ${improvement > 0 ? '+' : ''}${improvement}% articles`);
    }

    console.log('\n✅ All phases tested successfully!\n');
    console.log('Recommendation:');
    console.log('  1. Start with Phase 1 (Query Builder only)');
    console.log('  2. Monitor for 2-3 days');
    console.log('  3. Enable Phase 2 (add BUSINESS + TECHNOLOGY topics)');
    console.log('  4. Monitor for 3-5 days');
    console.log('  5. Enable Phase 3 (add SCIENCE topic)');
    console.log('');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    // Always restore original configuration
    restoreConfig();
  }
}

// Run the complete test
runCompleteTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
