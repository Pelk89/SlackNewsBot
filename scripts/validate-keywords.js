#!/usr/bin/env node

const CSVParser = require('./lib/csvParser');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'config', 'keywords.csv');

try {
  console.log('Validating config/keywords.csv...');

  const parser = new CSVParser();
  const { keywords, stats } = parser.parse(CSV_PATH);

  console.log(`✓ Validation passed`);
  console.log(`  Total: ${stats.total} keywords`);
  console.log(`  Tier 1: ${stats.tier1}`);
  console.log(`  Tier 2: ${stats.tier2}`);
  console.log(`  Tier 3: ${stats.tier3}`);

  process.exit(0);
} catch (err) {
  console.error(`✗ Validation failed: ${err.message}`);
  process.exit(1);
}
