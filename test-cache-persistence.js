#!/usr/bin/env node

/**
 * Test Cache Persistence
 * Simulates multiple job runs in the same process to verify cache persistence
 */

const { getCacheManager } = require('./src/cache/CacheManager');
const NewsService = require('./src/newsService');

async function runTest() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Cache Persistence (same process, multiple runs)');
  console.log('='.repeat(60));

  const cacheManager = getCacheManager();
  const newsService = new NewsService();

  // First run
  console.log('\n📍 RUN #1 - Expected: All Cache MISS');
  console.log('-'.repeat(60));
  const result1 = await newsService.fetchRetailInnovationNews();
  console.log(`✓ Fetched ${result1.length} articles`);
  cacheManager.logStats();

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Second run (same process, should hit cache)
  console.log('\n📍 RUN #2 - Expected: Cache HIT (same process)');
  console.log('-'.repeat(60));
  const result2 = await newsService.fetchRetailInnovationNews();
  console.log(`✓ Fetched ${result2.length} articles`);
  cacheManager.logStats();

  // Verify cache hit rate
  const stats = cacheManager.getStats();
  const hitRate = parseFloat(stats.hitRate);

  console.log('\n' + '='.repeat(60));
  console.log('📊 Final Cache Analysis:');
  console.log('='.repeat(60));
  console.log(`Hit Rate: ${stats.hitRate}`);
  console.log(`Total Keys Cached: ${stats.sizes.total}`);

  if (hitRate > 0) {
    console.log('\n✅ SUCCESS: Cache is working! HIT rate > 0%');
    console.log('   ℹ️  In production (Docker), cache persists between daily jobs');
    console.log('   ℹ️  In npm test, cache resets because each test starts new process');
  } else {
    console.log('\n❌ PROBLEM: No cache hits detected!');
  }

  console.log('='.repeat(60));
}

// Run test
runTest()
  .then(() => {
    console.log('\n✓ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
