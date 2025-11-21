# Keyword Matching Documentation

## Overview

The NewsBot Slack application features an advanced keyword matching system that goes beyond simple substring matching. It supports keyword variations, multi-language synonyms (English ↔ German), fuzzy matching, and automatic variation generation.

### Key Features

- **✅ Exact Matching**: Case-insensitive substring matching
- **🔀 Keyword Variations**: Manual variations (e.g., "retail tech" for "retail technology")
- **🔤 Auto-Generated Variations**:
  - Plural/Singular (robot ↔ robots, delivery ↔ deliveries)
  - Hyphenation (last-mile ↔ last mile ↔ lastmile)
- **🌍 Multi-Language Support**: English ↔ German synonym mapping
- **🎯 Fuzzy Matching**: 80% similarity threshold for typos and variations
- **⚡ Performance Optimized**: Balanced caching for frequent matches

---

## Architecture

### Components

```
src/utils/keywordMatcher.js      # Core matching engine
src/relevance/config/relevance.json  # Configuration (variations, synonyms)
src/relevance/scorers/ThematicScorer.js  # 40% of relevance score
src/sources/scorer.js            # Fallback scoring
src/sources/sources/RSSSource.js  # Pre-filtering RSS feeds
```

### Matching Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `exact` | Simple substring matching | Fast, precise, no variations |
| `variations` | Manual + auto-generated variations | Controlled, predictable |
| `fuzzy` | String similarity (≥80%) | Handles typos, flexible |
| **`hybrid`** | Variations first, then fuzzy | **Recommended for production** |

---

## Configuration

### 1. Matching Options

Edit `.env` to configure matching behavior:

```bash
# Matching mode (exact|variations|fuzzy|hybrid)
KEYWORD_MATCHING_MODE=hybrid

# Fuzzy matching threshold (0.0-1.0, 0.8 = 80% similar)
KEYWORD_FUZZY_THRESHOLD=0.8

# Auto-generate plural/singular (true/false)
KEYWORD_AUTO_PLURAL=true

# Auto-generate hyphenation variations (true/false)
KEYWORD_AUTO_HYPHEN=true
```

### 2. Manual Variations

Add custom variations in `src/relevance/config/relevance.json`:

```json
{
  "keywords": {
    "variations": {
      "last mile delivery": [
        "last-mile delivery",
        "lastmile delivery",
        "last mile"
      ],
      "retail technology": [
        "retail tech",
        "retailtech",
        "retail technologies"
      ]
    }
  }
}
```

### 3. Multi-Language Synonyms

Add English ↔ German synonyms:

```json
{
  "keywords": {
    "synonyms": {
      "en-de": {
        "delivery": ["lieferung", "zustellung"],
        "robots": ["roboter"],
        "last mile": ["letzte meile"],
        "automation": ["automatisierung"]
      }
    }
  }
}
```

**Note**: Reverse lookup (German → English) is automatic.

---

## Examples

### Hyphenation Variations

```javascript
Keyword: "last mile delivery"
Matches:
  ✅ "last mile delivery"     (exact)
  ✅ "last-mile delivery"     (auto-hyphen)
  ✅ "lastmile delivery"      (auto-no-space)
  ✅ "last mile"              (manual variation)
```

### Plural/Singular

```javascript
Keyword: "delivery robots"
Matches:
  ✅ "delivery robots"        (exact)
  ✅ "delivery robot"         (auto-singular)
  ✅ "robot delivery"         (manual variation)
  ✅ "robotic delivery"       (manual variation)
```

### Multi-Language (EN ↔ DE)

```javascript
Keyword: "robots" (English article)
Matches:
  ✅ "robots"                 (exact)
  ✅ "robot"                  (auto-singular)

Keyword: "robots" (German article)
Matches:
  ✅ "Roboter"                (DE synonym)
  ✅ "robots"                 (fallback)
```

### Fuzzy Matching

```javascript
Keyword: "logistics"
Matches:
  ✅ "logistics"              (exact, 100%)
  ✅ "logistic"               (fuzzy, 95%)
  ✅ "logistik"               (fuzzy, 88%)
  ❌ "logic"                  (fuzzy, 75% < 80% threshold)
```

---

## How It Works

### Hybrid Matching Flow

```
1. Check exact match
   ↓ (no match)
2. Check manual variations
   ↓ (no match)
3. Generate auto-variations (plural/hyphen)
   ↓ (no match)
4. Check synonyms (if language detected)
   ↓ (no match)
5. Fuzzy match (≥80% similarity)
   ↓
6. Return result: { matched, matchType, similarity }
```

### Language Detection

Simple heuristic based on common words:

```javascript
German indicators: der, die, das, und, ist, für, mit, auf, von, den
English indicators: the, and, is, for, with, on, at, to, from

Article language = most common indicator words
```

### Performance: Balanced Caching

- **Cache Size**: Max 500 entries (balanced, not too large)
- **Cache Key**: `text:keyword:mode`
- **Cache Hit Rate**: Typically 40-60% after warm-up
- **Memory Usage**: ~50-100KB (minimal)

---

## Usage

### Direct Usage (Advanced)

```javascript
const { getKeywordMatcher } = require('./src/utils/keywordMatcher');

const matcher = getKeywordMatcher();

// Check if text matches keyword
const result = matcher.matches(
  'Neue Roboter für die letzte Meile',
  'delivery robots',
  { language: 'de' }
);

console.log(result);
// {
//   matched: true,
//   matchType: 'variation',  // exact|variation|fuzzy
//   similarity: 0.95,
//   matchedVariation: 'roboter'
// }
```

### Get All Variations

```javascript
const matcher = getKeywordMatcher();

// English variations
const enVariations = matcher.getVariations('last mile delivery', 'en');
// ['last mile delivery', 'last-mile delivery', 'lastmile delivery', 'last mile']

// German variations (includes synonyms)
const deVariations = matcher.getVariations('delivery', 'de');
// ['delivery', 'deliveries', 'lieferung', 'zustellung']
```

---

## Testing

Run the keyword matching test suite:

```bash
node test-keyword-matching.js
```

**Test Coverage**:
- ✅ Exact matching
- ✅ Hyphenation variations
- ✅ Plural/singular variations
- ✅ Manual variations
- ✅ German synonyms
- ✅ Fuzzy matching
- ✅ Negative tests (should NOT match)
- ✅ Multi-word keywords

**Expected Output**:
```
✅ Exact Match: 1/1 PASSED
✅ Hyphenation: 3/3 PASSED
✅ Plural/Singular: 2/2 PASSED
✅ Manual Variations: 2/2 PASSED
✅ DE Synonyms: 4/4 PASSED
✅ Fuzzy Match: 2/2 PASSED
✅ Negative: 2/2 PASSED
✅ Multi-word: 2/2 PASSED

📊 Test Summary
Total Tests: 18
✅ Passed: 18
❌ Failed: 0
Success Rate: 100.00%
```

---

## Integration Points

### 1. ThematicScorer (Primary - 40% of score)

```javascript
// src/relevance/scorers/ThematicScorer.js

const matchResult = this.keywordMatcher.matches(text, keyword, { language });
if (matchResult.matched) {
  // Weight by similarity (exact=1.0, variation=0.95, fuzzy=0.8-1.0)
  score += tierWeight * matchResult.similarity;
}
```

### 2. RelevanceScorer (Fallback)

```javascript
// src/sources/scorer.js

const titleMatch = this.keywordMatcher.matches(title, keyword, { language });
if (titleMatch.matched) {
  matchScore += 1.0 * titleMatch.similarity;  // Title match worth more
}
```

### 3. RSSSource Filtering (Pre-filter)

```javascript
// src/sources/sources/RSSSource.js

return items.filter(item => {
  const text = `${item.title} ${item.description}`;
  const language = this._detectLanguage(text);

  return keywords.some(keyword => {
    const matchResult = this.keywordMatcher.matches(text, keyword, { language });
    return matchResult.matched;
  });
});
```

---

## Performance Tuning

### Optimize for Speed

```bash
# Use exact matching only (fastest)
KEYWORD_MATCHING_MODE=exact
KEYWORD_AUTO_PLURAL=false
KEYWORD_AUTO_HYPHEN=false
```

### Optimize for Recall (Find more articles)

```bash
# Use fuzzy matching (finds more matches)
KEYWORD_MATCHING_MODE=fuzzy
KEYWORD_FUZZY_THRESHOLD=0.7  # Lower threshold = more matches
```

### Balanced (Recommended)

```bash
# Hybrid mode with auto-generation
KEYWORD_MATCHING_MODE=hybrid
KEYWORD_FUZZY_THRESHOLD=0.8
KEYWORD_AUTO_PLURAL=true
KEYWORD_AUTO_HYPHEN=true
```

---

## Troubleshooting

### Too Many False Positives

**Symptom**: Irrelevant articles are being matched

**Solution**:
1. Increase fuzzy threshold: `KEYWORD_FUZZY_THRESHOLD=0.85`
2. Switch to `variations` mode: `KEYWORD_MATCHING_MODE=variations`
3. Remove broad manual variations from `relevance.json`

### Too Few Matches

**Symptom**: Relevant articles are being missed

**Solution**:
1. Lower fuzzy threshold: `KEYWORD_FUZZY_THRESHOLD=0.75`
2. Add more manual variations to `relevance.json`
3. Verify synonyms are configured correctly for your language

### Poor Performance

**Symptom**: Slow keyword matching

**Solution**:
1. Check cache hit rate: Cache should be >40%
2. Reduce manual variations (less to check)
3. Use `exact` mode for time-critical operations

---

## Maintenance

### Adding New Keywords

1. Add to tier in `src/relevance/config/relevance.json`:
   ```json
   {
     "keywords": {
       "tier1": [
         "your new keyword"
       ]
     }
   }
   ```

2. Add variations (optional):
   ```json
   {
     "keywords": {
       "variations": {
         "your new keyword": ["variation 1", "variation 2"]
       }
     }
   }
   ```

3. Add synonyms (if multi-language):
   ```json
   {
     "keywords": {
       "synonyms": {
         "en-de": {
           "your keyword": ["german translation"]
         }
       }
     }
   }
   ```

4. Test with `node test-keyword-matching.js`

### Monitoring

Check cache performance regularly:

```javascript
const { getKeywordMatcher } = require('./src/utils/keywordMatcher');
const matcher = getKeywordMatcher();

matcher.logCacheStats();
// 📊 KeywordMatcher Cache Statistics:
//    Size: 234/500
//    Hit Rate: 47.32% (890 hits / 990 misses)
```

**Target Hit Rate**: 40-60% (optimal balance)

---

## FAQ

**Q: Does keyword order matter?**
A: No. "delivery robots" and "robots delivery" are treated the same via manual variations.

**Q: Can I use regex patterns?**
A: No. Use fuzzy matching or add specific variations instead.

**Q: How do I disable fuzzy matching?**
A: Set `KEYWORD_MATCHING_MODE=variations` (or `exact`)

**Q: What languages are supported?**
A: Currently English (en) and German (de). To add more languages:
1. Add synonyms in `relevance.json` under `"en-fr"`, `"en-es"`, etc.
2. Update language detection in KeywordMatcher

**Q: How does caching work?**
A: Balanced cache (max 500 entries). Most frequent matches are cached for performance.

**Q: Can I clear the cache?**
A: Yes: `matcher.clearCache()` (advanced usage only)

---

## References

- **string-similarity**: [NPM Package](https://www.npmjs.com/package/string-similarity) (used for fuzzy matching)
- **Relevance Engine**: [RELEVANCE_ENGINE.md](./RELEVANCE_ENGINE.md)
- **Retry & Cache**: [RETRY_CACHE.md](./RETRY_CACHE.md)

---

## Changelog

### v1.0.0 (2025-11-21)
- ✨ Initial release
- ✅ Hybrid matching (variations + fuzzy)
- ✅ English ↔ German synonyms
- ✅ Auto-generation (plural, hyphen)
- ✅ Balanced caching
- ✅ Comprehensive test suite
