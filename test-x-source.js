#!/usr/bin/env node

/**
 * Quick test for X Source loading
 */

const XSource = require('./src/sources/sources/XSource');

console.log('Testing X Source loading...\n');

const config = {
  id: 'x-test',
  name: 'X Test',
  type: 'x',
  enabled: true,
  priority: 2,
  config: {
    nitterInstance: 'nitter.net',
    accounts: ['RetailDive'],
    searchTerms: []
  }
};

try {
  const xSource = new XSource(config);
  console.log('✓ XSource created successfully');
  console.log('  ID:', xSource.id);
  console.log('  Name:', xSource.name);
  console.log('  Accounts:', xSource.accounts);
  console.log('  Validated:', xSource.validate());
  console.log('\n✓ XSource is working correctly\n');
} catch (error) {
  console.error('✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
