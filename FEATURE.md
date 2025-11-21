# Feature: Relevance Calculation Fixes

**Branch**: `feature/relevance-fixes`
**Status**: 🚧 In Development
**Priority**: 🔴 High (Critical Quality Issue)
**Created**: 2025-11-21

---

## 🎯 Problem Statement

The current relevance scoring system (implemented in `feature/news-relevance`) has multiple calculation errors causing:

1. **Low average scores** (52.4%) due to incorrect normalization
2. **Over-aggressive filtering** removing 50% of potentially relevant articles
3. **Incorrect penalization** of business/financial news
4. **Mathematical errors** in confidence calculation
5. **Poor UX** with relevance scores displayed in Slack (visual clutter)

**Current Behavior**:
- Bot delivers 10 articles but scores seem arbitrary
- High-quality articles (perfect match) score only ~69% instead of 85-90%
- Financial/business news gets filtered out completely (<50% threshold)
- Relevance bars in Slack distract from actual content

**Desired Behavior**:
- Accurate relevance scoring (85-95% for perfect matches)
- Less aggressive filtering (keep more relevant articles)
- No relevance display in Slack (clean message format)
- Mathematically correct confidence scores

---

## 🔍 Root Cause Analysis

### Issue #1: ThematicScorer - Incorrect Normalization
**Location**: `src/relevance/scorers/ThematicScorer.js:25`

**Current Code**:
```javascript
let maxPossibleScore = 10; // Normalization baseline
```

**Problem**:
- Hardcoded max=10, but actual maximum with current keywords:
  - Tier 1: 6 keywords × 2.0 = 12.0
  - Tier 2: 7 keywords × 1.0 = 7.0
  - Tier 3: 6 keywords × 0.5 = 3.0
  - **Actual max: 22.0**
- Articles can never score above 45% thematically (10/22)
- With 40% weight, thematic contributes only ~18% to final score instead of 40%

**Fix Required**:
```javascript
// Calculate actual maximum based on keyword configuration
const maxPossibleScore =
  (tier1Keywords.length * 2.0) +
  (tier2Keywords.length * 1.0) +
  (tier3Keywords.length * 0.5);
// = 6*2 + 7*1 + 6*0.5 = 22.0
```

**Impact**: 🔴 Critical - Affects 40% of final score

---

### Issue #2: InnovationScorer - Unbounded Accumulation
**Location**: `src/relevance/scorers/InnovationScorer.js:62-76`

**Current Code**:
```javascript
let score = 0.5; // Base score (neutral)

this.innovationSignals.forEach(signal => {
  if (text.includes(signal)) {
    score += 0.1;
  }
});

this.nonInnovationSignals.forEach(signal => {
  if (text.includes(signal)) {
    score -= 0.15;
  }
});

return Math.max(0, Math.min(1, score));
```

**Problems**:
1. No uniqueness check (multiple matches counted)
2. With 23 innovation signals: max = 0.5 + 2.3 = 2.8 (clamped to 1.0)
3. With 11 non-innovation signals: min = 0.5 - 1.65 = -1.15 (clamped to 0.0)
4. Business news ("earnings", "revenue", "profit") gets -0.45 penalty = 5% score
5. Financial articles completely filtered out (<50% threshold)

**Example**:
- "Walmart Quarterly Earnings Report Shows Revenue Growth"
- Penalties: "earnings" (-0.15), "revenue" (-0.15) = 0.5 - 0.30 = 20%
- But article IS relevant to retail (just not innovation-focused)

**Fix Required**:
1. Count each keyword only once (Set/uniqueness check)
2. Reduce penalty weights (-0.15 → -0.05)
3. Adjust base score (0.5 → 0.6 for neutral)
4. Cap penalties at -0.3 maximum

**Impact**: 🟡 Medium - Affects 15% of final score, but causes over-filtering

---

### Issue #3: TimelinessScorer - Hard Cutoffs
**Location**: `src/relevance/scorers/TimelinessScorer.js:43-48`

**Current Code**:
```javascript
if (hoursAgo <= 6) return 1.0;       // < 6h = perfect
if (hoursAgo <= 12) return 0.9;      // < 12h = excellent
if (hoursAgo <= 24) return 0.7;      // < 24h = good
if (hoursAgo <= 48) return 0.4;      // < 48h = acceptable
return 0.1;                          // > 48h = old news
```

**Problem**:
- Step-function instead of smooth decay
- Article at 5h 59m: 100%
- Article at 6h 01m: 90%
- **10% drop in 2 minutes!**

**Fix Required**:
```javascript
// Exponential decay: score = e^(-λt)
// λ = decay constant (0.03 for ~70% at 12h)
const lambda = 0.03;
const score = Math.exp(-lambda * hoursAgo);
return Math.max(0.1, score); // Floor at 10%
```

**Impact**: 🟢 Low - Smoother scoring, less arbitrary cliffs

---

### Issue #4: QualityFilter - Applied Before Scoring
**Location**: `src/relevance/RelevanceEngine.js:81-83`

**Current Pipeline**:
```javascript
// Stage 1: Hard Filters
filtered = this.spamFilter.filter(filtered);
filtered = this.duplicateFilter.filter(filtered);
filtered = this.qualityFilter.filter(filtered);  // ← Applied here

// Stage 2: Score each article
filtered = filtered.map(article => ({
  ...article,
  relevance: this.scoreArticle(article)
}));
```

**Problem**:
- Low-quality articles removed BEFORE scoring
- Article with 14 words is removed (minWordCount: 15)
- Even if it would score 95% on thematic/authority/timeliness
- No opportunity for high relevance to compensate for brevity

**Additional Issue**: Word count includes title
```javascript
// QualityFilter.js:71
const text = `${article.title} ${article.description || ''}`;
const wordCount = this.countWords(text);
return wordCount >= this.minWordCount;
```
- 10-word title + 5-word description = 15 words (passes)
- But description is only 5 words (low quality)

**Fix Required**:
1. Move QualityFilter AFTER scoring (but before threshold)
2. Count only description words (exclude title)
3. OR: Make quality score a factor (not hard filter)

**Impact**: 🟡 Medium - Could recover highly relevant but concise articles

---

### Issue #5: Hard Relevance Threshold Filter
**Location**: `src/relevance/RelevanceEngine.js:95-96`

**Current Code**:
```javascript
filtered = filtered.filter(a => a.relevance.score >= this.minRelevanceScore);
// minRelevanceScore: 0.5 (from relevance.json:10)
```

**Problem**:
- Articles scoring 49.9% are completely discarded
- With broken scoring (avg 52.4%), this removes ~40-50% of articles
- No gradual degradation or ranking
- This is why you initially only got 1 article!

**Fix Required**:
1. Reduce threshold to 30% (0.3) OR remove entirely
2. Rely on top-N selection instead (already have MAX_NEWS_ITEMS=10)
3. Threshold should be for spam/junk only (<20%), not quality control

**Impact**: 🔴 Critical - Main cause of over-filtering

---

### Issue #6: Confidence Calculation - Mathematical Error
**Location**: `src/relevance/RelevanceEngine.js:211-222`

**Current Code**:
```javascript
calculateConfidence(scores) {
  const scoreValues = Object.values(scores);
  const avg = scoreValues.reduce((sum, val) => sum + val, 0) / scoreValues.length;

  const variance = scoreValues.reduce((sum, val) =>
    sum + Math.pow(val - avg, 2), 0) / scoreValues.length;

  // Lower variance = higher confidence
  const confidence = Math.max(0, Math.min(1, 1 - variance));

  return confidence;
}
```

**Problem**:
- `1 - variance` doesn't properly map to confidence
- Variance range for 0-1 scores: 0 to ~0.25 (max spread)
- Small variance (0.01) → confidence 99% (too high!)
- Should use coefficient of variation or normalized std dev

**Fix Required**:
```javascript
// Use standard deviation normalized to mean
const stdDev = Math.sqrt(variance);
const coefficientOfVariation = avg > 0 ? stdDev / avg : 0;
const confidence = Math.max(0, Math.min(1, 1 - coefficientOfVariation));
```

**Impact**: 🟢 Low - Confidence is metadata only, doesn't affect ranking

---

### Issue #7: Slack Display - Visual Clutter
**Location**: `src/services/slackService.js:113-123`

**Current Display**:
```javascript
if (item.relevance) {
  const scorePercent = Math.round(item.relevance.score * 100);
  const relevanceBar = this.formatRelevanceBar(item.relevance.score);

  text += `\n\n📊 Relevance: ${relevanceBar} ${scorePercent}%`;

  if (item.relevance.metadata?.reasoning) {
    text += ` • _${item.relevance.metadata.reasoning}_`;
  }
}
```

**Shows**:
```
📊 Relevance: ████████░░ 80% • highly relevant topic, top-tier source
```

**Problem**:
- Visual clutter in Slack messages
- User doesn't care about scores (just wants good articles)
- Takes up 2 extra lines per article
- Distracts from actual content

**Fix Required**:
```javascript
// Remove entire block (lines 113-123)
// Keep only: title, description, source, date, link
```

**Impact**: 🟢 Low - UX improvement, no functional change

---

## 📋 Tasks

### Phase 1: Critical Fixes (Score Calculation)
- [ ] **Fix ThematicScorer normalization** (Issue #1)
  - Calculate actual max from keyword config
  - Dynamic normalization based on tier weights
  - Test with multi-keyword articles

- [ ] **Fix InnovationScorer accumulation** (Issue #2)
  - Add uniqueness check (Set for matched keywords)
  - Reduce penalty weights (-0.15 → -0.05)
  - Adjust base score (0.5 → 0.6)
  - Cap penalties at -0.3 max

- [ ] **Fix TimelinessScorer cutoffs** (Issue #3)
  - Replace step-function with exponential decay
  - Test smooth transitions (5h → 6h → 7h)

- [ ] **Lower relevance threshold** (Issue #5)
  - Change minRelevanceScore: 0.5 → 0.3
  - Or remove threshold entirely (rely on top-N)
  - Test with broader article set

**Progress**: 0/4 Tasks ░░░░░░░░░░ 0%

---

### Phase 2: Filter & Pipeline Improvements
- [ ] **Move QualityFilter after scoring** (Issue #4)
  - Reorder pipeline: Filter → Score → Quality → Threshold → Top-N
  - OR: Convert to quality score factor

- [ ] **Fix word count calculation**
  - Count only description (exclude title)
  - Or: reduce minWordCount to 5-10 words

- [ ] **Fix confidence calculation** (Issue #6)
  - Use coefficient of variation
  - Test with high/low variance score sets

**Progress**: 0/3 Tasks ░░░░░░░░░░ 0%

---

### Phase 3: UX & Testing
- [ ] **Remove relevance display from Slack** (Issue #7)
  - Delete lines 113-123 in slackService.js
  - Clean message format (title, description, source, date only)

- [ ] **Integration Testing**
  - Run test-relevance.js with fixes
  - Verify scores are in 70-95% range for perfect matches
  - Verify 10 articles delivered (not 1)
  - Verify no over-filtering of business news

- [ ] **Documentation**
  - Update IMPLEMENTATION_SUMMARY_NEWS_RELEVANCE.md
  - Document new scoring formulas
  - Add examples of before/after scores

**Progress**: 0/3 Tasks ░░░░░░░░░░ 0%

---

## 📊 Expected Outcomes

### Before Fixes:
```
Article: "Amazon Launches Autonomous Delivery Robot"
- Thematic: 40% (4.0/10, capped)
- Authority: 90% (TechCrunch)
- Timeliness: 100% (2h old)
- Innovation: 70% (0.5 + 0.2)
Final: 69% ← Too low for perfect match!
```

### After Fixes:
```
Article: "Amazon Launches Autonomous Delivery Robot"
- Thematic: 82% (18.0/22, uncapped)
- Authority: 90% (TechCrunch)
- Timeliness: 100% (2h old, smooth decay)
- Innovation: 80% (unique keywords, reduced penalties)
Final: 88% ← Perfect! ✓
```

### Filtering Impact:
- **Before**: 50% threshold → removes 40-50% of articles → 1 article delivered
- **After**: 30% threshold → removes only spam/junk → 10 articles delivered

### Slack Message:
**Before**:
```
🤖 *Amazon Launches Autonomous Delivery Robot*
New robot fleet for last mile logistics...

🔗 techcrunch.com | 📅 2 hours ago

📊 Relevance: ████████░░ 69% • highly relevant topic, top-tier source
```

**After**:
```
🤖 *Amazon Launches Autonomous Delivery Robot*
New robot fleet for last mile logistics...

🔗 techcrunch.com | 📅 2 hours ago
```

---

## 🔗 References

- **Detailed Analysis**: See Project Coordinator investigation (2025-11-21)
- **Original Implementation**: `feature/news-relevance` (merged 2025-11-20)
- **Config Files**:
  - `config/relevance.json` - Scoring weights & thresholds
  - `config/sources.json` - Source authority ratings
- **Testing**:
  - `test-relevance.js` - Relevance engine testing
  - `test-integration.js` - Full pipeline testing

---

## 🎯 Success Criteria

- [ ] Perfect match articles score 85-95%
- [ ] Average score increases from 52.4% to ~70%
- [ ] Bot delivers 10 articles consistently (not 1)
- [ ] Business/financial news not over-penalized (<30% only if truly irrelevant)
- [ ] Slack messages clean (no relevance bars)
- [ ] All tests pass (test-relevance.js, test-integration.js)

---

**Total Tasks**: 10
**Estimated Effort**: 2-3 hours
**Priority**: 🔴 High - Critical quality issue affecting user experience
