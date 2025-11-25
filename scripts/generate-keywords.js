#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import libraries
const CSVParser = require('./lib/csvParser');
const VariationGenerator = require('./lib/variationGenerator');
const TranslationService = require('./lib/translationService');
const RelevanceJsonBuilder = require('./lib/relevanceJsonBuilder');

// Parse CLI flags
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose')
};

// Paths
const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'config', 'keywords.csv');
const DICT_PATH = path.join(ROOT, 'config', 'translations-dictionary.json');
const RELEVANCE_PATH = path.join(ROOT, 'src', 'relevance', 'config', 'relevance.json');

// Logging helpers
const log = (msg) => console.log(msg);
const verbose = (msg) => flags.verbose && console.log(`  ${msg}`);
const success = (msg) => console.log(`✓ ${msg}`);
const error = (msg) => console.error(`✗ ${msg}`);

async function main() {
  try {
    const startTime = Date.now();

    log('');
    log('=== CSV Keyword Generation ===');
    log('');

    // STEP 1: Parse CSV
    log('1. Parsing CSV...');
    const parser = new CSVParser();
    const { keywords, stats } = parser.parse(CSV_PATH);
    success(`Loaded ${stats.total} keywords from config/keywords.csv`);
    verbose(`Tier 1: ${stats.tier1}, Tier 2: ${stats.tier2}, Tier 3: ${stats.tier3}`);
    log('');

    // STEP 2: Generate variations
    log('2. Generating variations...');
    const variationGen = new VariationGenerator();
    const variationsMap = {};
    let totalVariations = 0;

    for (const kw of keywords) {
      const variations = variationGen.generateVariations(kw.keyword, kw.language);
      variationsMap[kw.keyword] = variations;
      totalVariations += variations.length;

      if (flags.verbose && variations.length > 0) {
        verbose(`${kw.keyword} → ${variations.join(', ')}`);
      }
    }
    success(`Generated ${totalVariations} variations (plural, hyphen, compound)`);
    log('');

    // STEP 3: Generate translations
    log('3. Generating translations...');
    const translator = new TranslationService(DICT_PATH);
    const translationsMap = {};
    let totalTranslations = 0;

    // Build word-level translations from all EN keywords
    const englishKeywords = keywords.filter(k => k.language === 'en');
    const uniqueWords = new Set();

    for (const kw of englishKeywords) {
      kw.keyword.split(' ').forEach(word => uniqueWords.add(word.toLowerCase()));
    }

    for (const word of uniqueWords) {
      const translations = translator.translate(word, 'en', 'de');
      if (translations.length > 0) {
        translationsMap[word] = translations;
        totalTranslations += translations.length;

        if (flags.verbose) {
          verbose(`${word} → ${translations.join(', ')}`);
        }
      }
    }
    success(`Generated ${totalTranslations} translations from dictionary`);
    log('');

    // STEP 4: Build relevance.json
    log('4. Building relevance.json...');
    const builder = new RelevanceJsonBuilder(RELEVANCE_PATH);
    const newConfig = builder.build(keywords, variationsMap, translationsMap);

    // Calculate stats
    const tier1Count = newConfig.keywords.tier1.length;
    const tier2Count = newConfig.keywords.tier2.length;
    const tier3Count = newConfig.keywords.tier3.length;
    const variationsCount = Object.keys(newConfig.keywords.variations).length;
    const synonymsCount = Object.keys(newConfig.keywords.synonyms['en-de']).length;

    success('Built relevance.json with:');
    verbose(`Tier 1: ${tier1Count} keywords`);
    verbose(`Tier 2: ${tier2Count} keywords`);
    verbose(`Tier 3: ${tier3Count} keywords`);
    verbose(`Variations: ${variationsCount} keywords with variations`);
    verbose(`Synonyms: ${synonymsCount} word translations`);
    log('');

    // STEP 5: Write file (or preview)
    if (flags.dryRun) {
      log('5. DRY RUN - Preview (not writing file):');
      log('');
      const preview = builder.write(newConfig, true);

      // Show first 50 lines
      const lines = preview.split('\n');
      console.log(lines.slice(0, 50).join('\n'));
      if (lines.length > 50) {
        console.log(`... (${lines.length - 50} more lines)`);
      }
    } else {
      log('5. Writing file...');
      builder.write(newConfig, false);
      success(`Written to ${path.relative(ROOT, RELEVANCE_PATH)}`);
    }

    // Done
    const duration = Date.now() - startTime;
    log('');
    success(`Completed in ${duration}ms`);

    if (flags.dryRun) {
      log('');
      log('Run without --dry-run to apply changes.');
    }

    process.exit(0);

  } catch (err) {
    error(`Error: ${err.message}`);
    if (flags.verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
