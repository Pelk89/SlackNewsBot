#!/usr/bin/env node

/**
 * Test script for Google News optimization features
 *
 * Tests:
 * 1. Query Builder functionality
 * 2. Topic Feeds functionality
 * 3. Dual-mode fetching
 *
 * Usage: node test-google-news-optimization.js
 */

require('dotenv').config();
const GoogleNewsSource = require('./src/sources/sources/GoogleNewsSource');
const { getCacheManager } = require('./src/cache/CacheManager');

async function testQueryBuilder() {
  console.log('\n=== TEST 1: Query Builder Mode ===\n');

  const sourceConfig = {
    id: 'google-news-test',
    name: 'Google News (Query Builder)',
    type: 'google-news',
    config: {
      baseUrl: 'https://news.google.com/rss',
      language: 'en-US',
      country: 'US',
      keywordSearch: { enabled: true },
      queryBuilder: {
        enabled: true,
        dateRange: '7d',
        excludeTerms: ['sale', 'discount', 'recipe'],
        exactPhraseMatching: true,
        maxQueriesPerFetch: 3
      },
      topics: { enabled: false }
    }
  };

  const source = new GoogleNewsSource(sourceConfig);
  const keywords = [
    'retail innovation',
    'retail technology',
    'last mile delivery',
    'autonomous vehicles',
    'grocery automation'
  ];

  console.log(`Keywords (${keywords.length}):`, keywords);
  console.log('');

  const items = await source.fetch(keywords);

  console.log(`\n✓ Fetched ${items.length} items using Query Builder`);

  if (items.length > 0) {
    console.log('\nSample article:');
    const sample = items[0];
    console.log(`  Title: ${sample.title}`);
    console.log(`  Source: ${sample.source}`);
    console.log(`  Link: ${sample.link.substring(0, 80)}...`);
  }

  return items.length;
}

async function testTopicFeeds() {
  console.log('\n=== TEST 2: Topic Feeds Mode ===\n');

  const sourceConfig = {
    id: 'google-news-test',
    name: 'Google News (Topics)',
    type: 'google-news',
    config: {
      baseUrl: 'https://news.google.com/rss',
      language: 'en-US',
      country: 'US',
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
        maxArticlesPerTopic: 10
      }
    }
  };

  const source = new GoogleNewsSource(sourceConfig);
  const keywords = ['ecommerce', 'startups', 'innovation'];  // Different keywords to avoid cache collision

  console.log(`Keywords for filtering:`, keywords);
  console.log('Topics: BUSINESS, TECHNOLOGY');
  console.log('');

  const items = await source.fetch(keywords);

  console.log(`\n✓ Fetched ${items.length} items from topic feeds (after keyword filtering)`);

  if (items.length > 0) {
    console.log('\nSample articles:');
    items.slice(0, 3).forEach((item, i) => {
      console.log(`\n${i + 1}. ${item.title}`);
      console.log(`   Topic: ${item.googleNewsTopic || 'N/A'}`);
      console.log(`   Source: ${item.source}`);
    });
  }

  return items.length;
}

async function testDualMode() {
  console.log('\n=== TEST 3: Dual Mode (Query Builder + Topics) ===\n');

  const sourceConfig = {
    id: 'google-news-test',
    name: 'Google News (Dual Mode)',
    type: 'google-news',
    config: {
      baseUrl: 'https://news.google.com/rss',
      language: 'en-US',
      country: 'US',
      keywordSearch: { enabled: true },
      queryBuilder: {
        enabled: true,
        dateRange: '7d',
        excludeTerms: ['sale', 'discount'],
        maxQueriesPerFetch: 2
      },
      topics: {
        enabled: true,
        feeds: [
          {
            name: 'TECHNOLOGY',
            enabled: true,
            priority: 1,
            url: 'headlines/section/topic/TECHNOLOGY'
          }
        ],
        maxArticlesPerTopic: 10
      }
    }
  };

  const source = new GoogleNewsSource(sourceConfig);
  const keywords = ['retail innovation', 'autonomous delivery'];

  console.log(`Keywords:`, keywords);
  console.log('Modes: Keyword Search (Query Builder) + Topic Feeds (TECHNOLOGY)');
  console.log('');

  const items = await source.fetch(keywords);

  console.log(`\n✓ Fetched ${items.length} items total from both modes`);

  // Count articles by source type
  const keywordArticles = items.filter(item => !item.googleNewsTopic);
  const topicArticles = items.filter(item => item.googleNewsTopic);

  console.log(`  - Keyword search: ${keywordArticles.length} items`);
  console.log(`  - Topic feeds: ${topicArticles.length} items`);

  return items.length;
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Google News Optimization Integration Tests      ║');
  console.log('╚════════════════════════════════════════════════════╝');

  try {
    // Clear cache before testing
    const cacheManager = getCacheManager();
    cacheManager.flush();
    console.log('✓ Cache cleared\n');

    // Run tests
    const count1 = await testQueryBuilder();
    const count2 = await testTopicFeeds();
    const count3 = await testDualMode();

    // Summary
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  Test Summary                                     ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`
  ✓ Query Builder Mode:   ${count1} items
  ✓ Topic Feeds Mode:     ${count2} items
  ✓ Dual Mode:            ${count3} items

  All tests passed! 🎉
`);

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
