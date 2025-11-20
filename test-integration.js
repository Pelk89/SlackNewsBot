#!/usr/bin/env node

/**
 * Integration test for NewsService with SourceManager
 */

require('dotenv').config();
const NewsService = require('./src/newsService');

async function testIntegration() {
  console.log('=== NewsService Integration Test ===\n');

  try {
    const newsService = new NewsService();

    console.log('Testing fetchRetailInnovationNews()...\n');

    const news = await newsService.fetchRetailInnovationNews();

    console.log('\n=== Results ===');
    console.log(`Total news items: ${news.length}`);
    console.log(`Max configured: ${newsService.maxItems}`);

    if (news.length > 0) {
      console.log('\n--- Sample News Items ---');

      news.slice(0, 5).forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.title}`);
        console.log(`   Source: ${item.source} (${item.sourceId})`);
        console.log(`   Published: ${new Date(item.pubDate).toLocaleString('de-DE')}`);
        console.log(`   Score: ${item.score?.toFixed(3) || 'N/A'}`);
        console.log(`   URL: ${item.link.substring(0, 80)}...`);
      });

      console.log('\n--- Source Distribution ---');
      const sources = {};
      news.forEach(item => {
        sources[item.sourceId] = (sources[item.sourceId] || 0) + 1;
      });

      Object.entries(sources)
        .sort((a, b) => b[1] - a[1])
        .forEach(([source, count]) => {
          console.log(`  ${source}: ${count} items`);
        });

      console.log('\n--- Score Distribution ---');
      const avgScore = news.reduce((sum, item) => sum + (item.score || 0), 0) / news.length;
      const maxScore = Math.max(...news.map(item => item.score || 0));
      const minScore = Math.min(...news.map(item => item.score || 0));

      console.log(`  Average score: ${avgScore.toFixed(3)}`);
      console.log(`  Max score: ${maxScore.toFixed(3)}`);
      console.log(`  Min score: ${minScore.toFixed(3)}`);
    }

    console.log('\n✓ Integration test completed successfully\n');

  } catch (error) {
    console.error('\n✗ Integration test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testIntegration();
