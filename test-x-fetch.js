#!/usr/bin/env node

/**
 * Test X Source actual fetching with different Nitter instances
 */

const XSource = require('./src/sources/sources/XSource');

const nitterInstances = [
  'nitter.net',
  'nitter.privacydev.net',
  'nitter.poast.org',
  'nitter.it',
  'nitter.1d4.us'
];

async function testInstance(instance) {
  console.log(`\n━━━ Testing ${instance} ━━━`);

  const config = {
    id: 'x-test',
    name: `X Test (${instance})`,
    type: 'x',
    enabled: true,
    priority: 2,
    config: {
      nitterInstance: instance,
      accounts: ['RetailDive'],
      searchTerms: [],
      timeout: 10000
    }
  };

  const xSource = new XSource(config);

  try {
    const startTime = Date.now();
    const results = await xSource.fetch([]);
    const duration = Date.now() - startTime;

    console.log(`✓ Success! Found ${results.length} items in ${duration}ms`);

    if (results.length > 0) {
      console.log(`  Latest: ${results[0].title.substring(0, 80)}...`);
    }

    return { instance, success: true, count: results.length, duration };
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
    return { instance, success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 Testing Nitter Instances for X/Twitter Integration\n');

  const results = [];

  for (const instance of nitterInstances) {
    const result = await testInstance(instance);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
  }

  console.log('\n━━━ SUMMARY ━━━');
  console.log(`\nWorking instances:`);
  results.filter(r => r.success).forEach(r => {
    console.log(`  ✓ ${r.instance} - ${r.count} items (${r.duration}ms)`);
  });

  console.log(`\nFailed instances:`);
  results.filter(r => !r.success).forEach(r => {
    console.log(`  ✗ ${r.instance} - ${r.error}`);
  });

  const bestInstance = results
    .filter(r => r.success && r.count > 0)
    .sort((a, b) => b.count - a.count || a.duration - b.duration)[0];

  if (bestInstance) {
    console.log(`\n🏆 Recommended: ${bestInstance.instance}`);
    console.log(`   Update sources.json nitterInstance to: "${bestInstance.instance}"`);
  } else {
    console.log('\n⚠️ No working instances found. X integration may not be available.');
    console.log('   Consider disabling X source or trying again later.');
  }
}

main().catch(console.error);
