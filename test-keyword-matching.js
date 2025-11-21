#!/usr/bin/env node

/**
 * Test Suite for Keyword Matching
 * Tests KeywordMatcher functionality with variations, synonyms, and fuzzy matching
 */

const { KeywordMatcher } = require('./src/utils/keywordMatcher');
const relevanceConfig = require('./src/relevance/config/relevance.json');

console.log('='.repeat(80));
console.log('🧪 Keyword Matching Test Suite');
console.log('='.repeat(80));

// Initialize KeywordMatcher with config from relevance.json
const matcher = new KeywordMatcher({
  variations: relevanceConfig.keywords.variations,
  synonyms: relevanceConfig.keywords.synonyms,
  ...relevanceConfig.keywords.matchingOptions
});

// Test cases
const testCases = [
  // === Exact Match Tests ===
  {
    category: 'Exact Match',
    text: 'New delivery robots transform last mile logistics',
    keyword: 'delivery robots',
    language: 'en',
    expected: true,
    description: 'Should match exact keyword'
  },

  // === Hyphenation Variation Tests ===
  {
    category: 'Hyphenation',
    text: 'Innovations in last-mile delivery technology',
    keyword: 'last mile delivery',
    language: 'en',
    expected: true,
    description: 'Should match "last-mile" when searching for "last mile"'
  },
  {
    category: 'Hyphenation',
    text: 'Last mile delivery solutions',
    keyword: 'last-mile delivery',
    language: 'en',
    expected: true,
    description: 'Should match "last mile" when searching for "last-mile"'
  },
  {
    category: 'Hyphenation',
    text: 'E-commerce retailers adopt new technologies',
    keyword: 'e-commerce',
    language: 'en',
    expected: true,
    description: 'Should match "e-commerce" exactly'
  },

  // === Plural/Singular Tests ===
  {
    category: 'Plural/Singular',
    text: 'A new delivery robot was deployed today',
    keyword: 'delivery robots',
    language: 'en',
    expected: true,
    description: 'Should match singular "robot" when searching for plural "robots"'
  },
  {
    category: 'Plural/Singular',
    text: 'Multiple robots working in warehouses',
    keyword: 'robot',
    language: 'en',
    expected: true,
    description: 'Should match plural "robots" when searching for singular "robot"'
  },

  // === Manual Variation Tests ===
  {
    category: 'Manual Variations',
    text: 'Retail tech companies innovate rapidly',
    keyword: 'retail technology',
    language: 'en',
    expected: true,
    description: 'Should match "retail tech" variation'
  },
  {
    category: 'Manual Variations',
    text: 'Automated supply chain solutions',
    keyword: 'supply chain automation',
    language: 'en',
    expected: true,
    description: 'Should match "automated supply chain" variation'
  },

  // === German Synonym Tests ===
  {
    category: 'DE Synonyms',
    text: 'Neue Roboter revolutionieren die Logistik',
    keyword: 'robots',
    language: 'de',
    expected: true,
    description: 'Should match German "Roboter" when searching for English "robots"'
  },
  {
    category: 'DE Synonyms',
    text: 'Automatisierung im Einzelhandel nimmt zu',
    keyword: 'automation',
    language: 'de',
    expected: true,
    description: 'Should match German "Automatisierung" when searching for "automation"'
  },
  {
    category: 'DE Synonyms',
    text: 'Innovationen in der letzten Meile',
    keyword: 'last mile',
    language: 'de',
    expected: true,
    description: 'Should match German "letzte Meile" when searching for "last mile"'
  },
  {
    category: 'DE Synonyms',
    text: 'Lieferung per Drohne wird Realität',
    keyword: 'delivery',
    language: 'de',
    expected: true,
    description: 'Should match German "Lieferung" when searching for "delivery"'
  },

  // === Fuzzy Matching Tests ===
  {
    category: 'Fuzzy Match',
    text: 'Robotic systems in retail warehouses',
    keyword: 'robotics',
    language: 'en',
    expected: true,
    description: 'Should fuzzy match "Robotic" to "robotics"'
  },
  {
    category: 'Fuzzy Match',
    text: 'Logistic innovations reshape industry',
    keyword: 'logistics',
    language: 'en',
    expected: true,
    description: 'Should fuzzy match "Logistic" to "logistics"'
  },

  // === Negative Tests (Should NOT match) ===
  {
    category: 'Negative',
    text: 'Fashion trends dominate social media',
    keyword: 'retail technology',
    language: 'en',
    expected: false,
    description: 'Should NOT match unrelated content'
  },
  {
    category: 'Negative',
    text: 'Sports news and entertainment',
    keyword: 'delivery robots',
    language: 'en',
    expected: false,
    description: 'Should NOT match completely different topic'
  },

  // === Multi-word Keyword Tests ===
  {
    category: 'Multi-word',
    text: 'Warehouse automation systems improve efficiency',
    keyword: 'warehouse automation',
    language: 'en',
    expected: true,
    description: 'Should match multi-word keyword'
  },
  {
    category: 'Multi-word',
    text: 'Supply chain automation reduces costs',
    keyword: 'supply chain automation',
    language: 'en',
    expected: true,
    description: 'Should match complex multi-word keyword'
  }
];

// Run tests
let passed = 0;
let failed = 0;
const results = {};

console.log('\n📋 Running tests...\n');

testCases.forEach((testCase, index) => {
  const result = matcher.matches(testCase.text, testCase.keyword, { language: testCase.language });
  const success = result.matched === testCase.expected;

  if (success) {
    passed++;
  } else {
    failed++;
  }

  // Group results by category
  if (!results[testCase.category]) {
    results[testCase.category] = { passed: 0, failed: 0, tests: [] };
  }

  results[testCase.category].tests.push({
    description: testCase.description,
    success,
    matchType: result.matchType,
    similarity: result.similarity,
    expected: testCase.expected,
    actual: result.matched
  });

  if (success) {
    results[testCase.category].passed++;
  } else {
    results[testCase.category].failed++;
  }
});

// Display results by category
for (const [category, data] of Object.entries(results)) {
  const categorySuccess = data.failed === 0;
  const icon = categorySuccess ? '✅' : '❌';
  const status = categorySuccess ? 'PASSED' : 'FAILED';

  console.log(`${icon} ${category}: ${data.passed}/${data.passed + data.failed} ${status}`);

  // Show details for failed tests
  data.tests.forEach(test => {
    if (!test.success) {
      console.log(`   ❌ ${test.description}`);
      console.log(`      Expected: ${test.expected}, Got: ${test.actual}`);
      console.log(`      Match Type: ${test.matchType}, Similarity: ${test.similarity.toFixed(2)}`);
    }
  });
}

// Overall summary
console.log('\n' + '='.repeat(80));
console.log('📊 Test Summary');
console.log('='.repeat(80));
console.log(`Total Tests: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);

// Cache statistics
matcher.logCacheStats();

// Show some example variations
console.log('\n' + '='.repeat(80));
console.log('🔍 Example Keyword Variations');
console.log('='.repeat(80));

const exampleKeywords = ['last mile delivery', 'delivery robots', 'retail technology'];
exampleKeywords.forEach(keyword => {
  const variations = matcher.getVariations(keyword, 'en');
  console.log(`\n"${keyword}" →`);
  console.log(`   EN: [${variations.join(', ')}]`);

  const deVariations = matcher.getVariations(keyword, 'de');
  console.log(`   DE: [${deVariations.join(', ')}]`);
});

console.log('\n' + '='.repeat(80));

// Exit with appropriate code
if (failed > 0) {
  console.log('\n❌ Some tests failed!\n');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!\n');
  process.exit(0);
}
