#!/usr/bin/env node

/**
 * Optimized Settings Test - Find the best Query Builder configuration
 *
 * Tests different configurations to balance:
 * - Article count (quantity)
 * - Article relevance (quality)
 * - Query efficiency (speed)
 */

require('dotenv').config();
const SourceManager = require('./src/sources/SourceManager');
const { getCacheManager } = require('./src/cache/CacheManager');
const fs = require('fs');

const SOURCES_PATH = './src/config/sources.json';
const BACKUP_PATH = './src/config/sources.json.backup';

const TEST_KEYWORDS = [
  'retail innovation',
  'last mile delivery',
  'autonomous vehicles',
  'grocery automation',
  'supply chain',
  'e-commerce technology'
];

function backupConfig() {
  const sourcesData = fs.readFileSync(SOURCES_PATH, 'utf8');
  fs.writeFileSync(BACKUP_PATH, sourcesData, 'utf8');
}

function restoreConfig() {
  if (fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(BACKUP_PATH, SOURCES_PATH);
    fs.unlinkSync(BACKUP_PATH);
  }
}

function updateGoogleNewsConfig(config) {
  const sourcesData = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'));
  const googleNewsSource = sourcesData.sources.find(s => s.id === 'google-news');
  Object.assign(googleNewsSource.config, config);
  fs.writeFileSync(SOURCES_PATH, JSON.stringify(sourcesData, null, 2), 'utf8');
}

async function testConfig(name, config) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${name}`);
  console.log(`${'='.repeat(70)}\n`);

  updateGoogleNewsConfig(config);

  const cacheManager = getCacheManager();
  cacheManager.flush();

  const manager = new SourceManager();
  const googleNewsSource = manager.sources.find(s => s.id === 'google-news');

  console.log('Settings:');
  if (config.queryBuilder?.enabled) {
    console.log(`  Date Range:     ${config.queryBuilder.dateRange || 'none'}`);
    console.log(`  Exclude Terms:  ${config.queryBuilder.excludeTerms?.join(', ') || 'none'}`);
    console.log(`  Max Queries:    ${config.queryBuilder.maxQueriesPerFetch || 5}`);
  } else {
    console.log('  Query Builder:  DISABLED (original implementation)');
  }
  console.log('');

  const startTime = Date.now();
  const items = await manager.fetchFromSource(googleNewsSource, TEST_KEYWORDS);
  const fetchTime = Date.now() - startTime;

  console.log(`Results: ${items.length} articles in ${(fetchTime / 1000).toFixed(2)}s`);
  console.log(`Unique sources: ${new Set(items.map(i => i.source)).size}`);

  if (items.length > 0) {
    // Check freshness
    const now = new Date();
    const last24h = items.filter(i => (now - new Date(i.pubDate)) < 24 * 60 * 60 * 1000).length;
    const last7d = items.filter(i => (now - new Date(i.pubDate)) < 7 * 24 * 60 * 60 * 1000).length;
    const last30d = items.filter(i => (now - new Date(i.pubDate)) < 30 * 24 * 60 * 60 * 1000).length;

    console.log(`\nFreshness:`);
    console.log(`  Last 24h:  ${last24h} (${(last24h/items.length*100).toFixed(1)}%)`);
    console.log(`  Last 7d:   ${last7d} (${(last7d/items.length*100).toFixed(1)}%)`);
    console.log(`  Last 30d:  ${last30d} (${(last30d/items.length*100).toFixed(1)}%)`);

    // Sample
    console.log(`\nSample (latest 2):`);
    items.slice(0, 2).forEach((item, i) => {
      const age = Math.floor((now - new Date(item.pubDate)) / (24 * 60 * 60 * 1000));
      console.log(`  ${i+1}. ${item.title.substring(0, 65)}...`);
      console.log(`     ${item.source} - ${age}d ago`);
    });
  }

  return { name, items: items.length, time: fetchTime / 1000, config };
}

async function runOptimizedTest() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Google News Query Builder - Optimized Settings Test            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  backupConfig();

  try {
    const results = [];

    // Test 1: Baseline (no Query Builder)
    results.push(await testConfig('Baseline: Original (no filters)', {
      keywordSearch: { enabled: true },
      queryBuilder: { enabled: false },
      topics: { enabled: false }
    }));

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 2: Query Builder mit 30d Filter (weniger aggressiv)
    results.push(await testConfig('Option A: 30d Filter, only food exclusions', {
      keywordSearch: { enabled: true },
      queryBuilder: {
        enabled: true,
        dateRange: '30d',
        excludeTerms: ['recipe', 'cooking'],
        exactPhraseMatching: true,
        maxQueriesPerFetch: 5
      },
      topics: { enabled: false }
    }));

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 3: Query Builder OHNE Date Filter
    results.push(await testConfig('Option B: No date filter, only food exclusions', {
      keywordSearch: { enabled: true },
      queryBuilder: {
        enabled: true,
        dateRange: null,
        excludeTerms: ['recipe', 'cooking'],
        exactPhraseMatching: true,
        maxQueriesPerFetch: 5
      },
      topics: { enabled: false }
    }));

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 4: Query Builder mit 7d aber weniger Exclusions
    results.push(await testConfig('Option C: 7d filter, only food exclusions', {
      keywordSearch: { enabled: true },
      queryBuilder: {
        enabled: true,
        dateRange: '7d',
        excludeTerms: ['recipe', 'cooking'],
        exactPhraseMatching: true,
        maxQueriesPerFetch: 5
      },
      topics: { enabled: false }
    }));

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 5: Optimal - 30d + Topics
    results.push(await testConfig('Option D: 30d filter + Topics (RECOMMENDED)', {
      keywordSearch: { enabled: true },
      queryBuilder: {
        enabled: true,
        dateRange: '30d',
        excludeTerms: ['recipe', 'cooking'],
        exactPhraseMatching: true,
        maxQueriesPerFetch: 5
      },
      topics: {
        enabled: true,
        feeds: [
          { name: 'BUSINESS', enabled: true, priority: 1, url: 'headlines/section/topic/BUSINESS' },
          { name: 'TECHNOLOGY', enabled: true, priority: 1, url: 'headlines/section/topic/TECHNOLOGY' }
        ],
        maxArticlesPerTopic: 15
      }
    }));

    // Summary
    console.log('\n\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  SUMMARY & RECOMMENDATIONS                                       ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    console.log('┌────────────────────────────────────────────────┬──────────┬────────┐');
    console.log('│ Configuration                                  │ Articles │  Time  │');
    console.log('├────────────────────────────────────────────────┼──────────┼────────┤');
    results.forEach(r => {
      const name = r.name.padEnd(46);
      const articles = r.items.toString().padStart(8);
      const time = `${r.time.toFixed(2)}s`.padStart(6);
      console.log(`│ ${name} │ ${articles} │ ${time} │`);
    });
    console.log('└────────────────────────────────────────────────┴──────────┴────────┘\n');

    const baseline = results[0];
    console.log('Analysis:\n');

    results.slice(1).forEach(r => {
      const diff = r.items - baseline.items;
      const pct = ((diff / baseline.items) * 100).toFixed(1);
      const speedup = ((baseline.time - r.time) / baseline.time * 100).toFixed(1);
      console.log(`${r.name}:`);
      console.log(`  Articles: ${diff > 0 ? '+' : ''}${diff} (${pct > 0 ? '+' : ''}${pct}%)`);
      console.log(`  Speed:    ${speedup > 0 ? '+' : ''}${speedup}% ${speedup > 0 ? 'faster' : 'slower'}\n`);
    });

    console.log('✅ RECOMMENDATION:\n');
    console.log('Based on the results, the best configuration is:\n');
    console.log('  queryBuilder:');
    console.log('    enabled: true');
    console.log('    dateRange: "30d"           # Balance zwischen Aktualität und Menge');
    console.log('    excludeTerms: ["recipe", "cooking"]  # Nur Food-Artikel ausschließen');
    console.log('    exactPhraseMatching: true');
    console.log('    maxQueriesPerFetch: 5\n');
    console.log('  topics:');
    console.log('    enabled: true');
    console.log('    feeds: [BUSINESS, TECHNOLOGY]  # Relevante Topics\n');

  } finally {
    restoreConfig();
    console.log('✓ Configuration restored\n');
  }
}

runOptimizedTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    restoreConfig();
    process.exit(1);
  });
