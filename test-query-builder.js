#!/usr/bin/env node

/**
 * Test script for Google News Query Builder
 *
 * Usage: node test-query-builder.js
 */

const { GoogleNewsQueryBuilder } = require('./src/utils/googleNewsQueryBuilder');

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✓ PASSED: ${message}`);
}

function testQueryBuilder() {
  console.log('=== Google News Query Builder Tests ===\n');

  // Test 1: Constructor with defaults
  console.log('Test 1: Constructor with defaults');
  const builder1 = new GoogleNewsQueryBuilder();
  assert(builder1.dateRange === '7d', 'Default date range is 7d');
  assert(builder1.exactPhraseMatching === true, 'Exact phrase matching is enabled by default');
  assert(builder1.maxQueriesPerFetch === 5, 'Default max queries is 5');
  console.log('');

  // Test 2: Constructor with custom options
  console.log('Test 2: Constructor with custom options');
  const builder2 = new GoogleNewsQueryBuilder({
    dateRange: '30d',
    excludeTerms: ['test'],
    exactPhraseMatching: false,
    maxQueriesPerFetch: 3
  });
  assert(builder2.dateRange === '30d', 'Custom date range is set');
  assert(builder2.excludeTerms.length === 1, 'Custom exclude terms are set');
  assert(builder2.exactPhraseMatching === false, 'Exact phrase matching can be disabled');
  console.log('');

  // Test 3: Format keyword - multi-word
  console.log('Test 3: Format keyword - multi-word');
  const formatted1 = builder1.formatKeyword('last mile delivery');
  assert(formatted1 === '"last mile delivery"', 'Multi-word keywords are wrapped in quotes');
  console.log('  Result:', formatted1);
  console.log('');

  // Test 4: Format keyword - single word
  console.log('Test 4: Format keyword - single word');
  const formatted2 = builder1.formatKeyword('retail');
  assert(formatted2 === 'retail', 'Single-word keywords are not wrapped in quotes');
  assert(!formatted2.includes('"'), 'No quotes for single words');
  console.log('  Result:', formatted2);
  console.log('');

  // Test 5: Build query with single keyword
  console.log('Test 5: Build query with single keyword');
  const query1 = builder1.buildQuery(['"retail innovation"']);
  assert(query1.includes('"retail innovation"'), 'Query contains the keyword');
  assert(query1.includes('-sale'), 'Query contains exclusion term -sale');
  assert(query1.includes('-discount'), 'Query contains exclusion term -discount');
  assert(query1.includes('when:7d'), 'Query contains date filter');
  console.log('  Result:', query1);
  console.log('');

  // Test 6: Build query with multiple keywords (OR combination)
  console.log('Test 6: Build query with multiple keywords (OR combination)');
  const query2 = builder1.buildQuery(['"retail innovation"', '"retail technology"']);
  assert(query2.includes('OR'), 'Query contains OR operator');
  assert(query2.includes('"retail innovation"'), 'Query contains first keyword');
  assert(query2.includes('"retail technology"'), 'Query contains second keyword');
  console.log('  Result:', query2);
  console.log('');

  // Test 7: Build optimized queries from keywords
  console.log('Test 7: Build optimized queries from real keywords');
  const keywords = [
    'retail innovation',
    'retail technology',
    'last mile delivery',
    'autonomous vehicles',
    'grocery automation',
    'supply chain optimization'
  ];
  const queries = builder1.buildOptimizedQueries(keywords);

  assert(Array.isArray(queries), 'Result is an array');
  assert(queries.length > 0, 'At least one query is generated');
  assert(queries.length <= 5, 'Number of queries does not exceed max (5)');

  console.log(`  Generated ${queries.length} optimized queries from ${keywords.length} keywords:`);
  queries.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q}`);
    assert(q.includes('when:7d'), `Query ${i + 1} contains date filter`);
    assert(q.includes('-sale'), `Query ${i + 1} contains exclusion terms`);
  });
  console.log('');

  // Test 8: Verify all keywords appear in queries
  console.log('Test 8: Verify all keywords appear in generated queries');
  const allQueries = queries.join(' ');
  keywords.forEach(kw => {
    if (kw.includes(' ')) {
      assert(allQueries.includes(`"${kw}"`), `Keyword "${kw}" appears in quotes in queries`);
    }
  });
  console.log('');

  // Test 9: Handle empty keywords
  console.log('Test 9: Handle empty keywords array');
  const emptyResult = builder1.buildOptimizedQueries([]);
  assert(Array.isArray(emptyResult), 'Empty keywords returns an array');
  assert(emptyResult.length === 0, 'Empty keywords returns empty array');
  console.log('');

  // Test 10: Sequential grouping fallback
  console.log('Test 10: Sequential grouping');
  const seqKeywords = ['kw1', 'kw2', 'kw3', 'kw4', 'kw5', 'kw6'];
  const groups = builder1.groupSequentially(seqKeywords, 3);
  assert(groups.length === 3, 'Creates correct number of groups');
  assert(groups.flat().length === 6, 'All keywords are included in groups');
  console.log('  Groups:', groups);
  console.log('');

  // Test 11: Build query without exclusions
  console.log('Test 11: Build query without exclusions');
  const noExcludeBuilder = new GoogleNewsQueryBuilder({ excludeTerms: [] });
  const queryNoExclude = noExcludeBuilder.buildQuery(['"test"']);
  assert(!queryNoExclude.includes('-sale'), 'No exclusion terms when not configured');
  assert(queryNoExclude.includes('when:7d'), 'Still has date filter');
  console.log('  Result:', queryNoExclude);
  console.log('');

  // Test 12: Build query without date range
  console.log('Test 12: Build query without date range');
  const noDateBuilder = new GoogleNewsQueryBuilder({ dateRange: null });
  const queryNoDate = noDateBuilder.buildQuery(['"test"']);
  assert(!queryNoDate.includes('when:'), 'No date filter when not configured');
  assert(queryNoDate.includes('-sale'), 'Still has exclusion terms');
  console.log('  Result:', queryNoDate);
  console.log('');

  // Test 13: Real-world scenario
  console.log('Test 13: Real-world retail scenario');
  const retailKeywords = [
    'retail innovation',
    'last mile delivery',
    'autonomous delivery',
    'grocery automation',
    'self-checkout',
    'supply chain',
    'warehouse robotics',
    'inventory management',
    'customer experience',
    'omnichannel retail'
  ];

  const retailQueries = builder1.buildOptimizedQueries(retailKeywords);
  console.log(`  Reduced ${retailKeywords.length} keywords to ${retailQueries.length} optimized queries:`);
  retailQueries.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q}`);
  });

  const reduction = ((1 - retailQueries.length / retailKeywords.length) * 100).toFixed(1);
  console.log(`  Query reduction: ${reduction}%`);
  assert(retailQueries.length < retailKeywords.length, 'Optimized queries reduce total query count');
  console.log('');

  console.log('=== All Tests Passed! ===\n');
}

// Run tests
try {
  testQueryBuilder();
  process.exit(0);
} catch (error) {
  console.error('\n✗ Test failed with error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
