#!/usr/bin/env node

/**
 * Test script for news sources
 *
 * Usage: node test-sources.js [source-id]
 */

require('dotenv').config();
const SourceManager = require('./src/sources/SourceManager');

async function testSources(specificSourceId = null) {
  console.log('=== News Sources Test ===\n');

  try {
    const manager = new SourceManager();
    const keywords = ['retail', 'technology'];

    console.log(`Test keywords: ${keywords.join(', ')}\n`);

    if (specificSourceId) {
      // Test specific source
      const source = manager.sources.find(s => s.id === specificSourceId);
      if (!source) {
        console.error(`Source "${specificSourceId}" not found`);
        console.log('Available sources:', manager.sources.map(s => s.id).join(', '));
        process.exit(1);
      }

      console.log(`Testing source: ${source.name}\n`);
      const items = await manager.fetchFromSource(source, keywords);
      console.log(`\nResults: ${items.length} items`);

      if (items.length > 0) {
        console.log('\nSample item:');
        console.log(JSON.stringify(items[0], null, 2));
      }
    } else {
      // Test all sources
      console.log('Enabled sources:');
      manager.getEnabledSources().forEach(s => {
        console.log(`  - ${s.name} (${s.id})`);
      });

      console.log('\n--- Fetching from all sources ---\n');
      const news = await manager.fetchAllNews(keywords);

      console.log('\n=== Results ===');
      console.log(`Total items: ${news.length}`);

      const stats = manager.getStats(news);
      console.log(`\nSource breakdown:`);
      Object.entries(stats.sourceBreakdown).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} items`);
      });

      if (news.length > 0) {
        console.log('\n--- Top 3 News Items ---');
        news.slice(0, 3).forEach((item, i) => {
          console.log(`\n${i + 1}. ${item.title}`);
          console.log(`   Source: ${item.source}`);
          console.log(`   Score: ${item.score?.toFixed(3) || 'N/A'}`);
          console.log(`   URL: ${item.link}`);
          if (item.scoreBreakdown) {
            console.log(`   Score breakdown:`, item.scoreBreakdown);
          }
        });
      }
    }

    console.log('\n✓ Test completed successfully\n');
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
const sourceId = process.argv[2];
testSources(sourceId);
