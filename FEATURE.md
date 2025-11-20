# Feature: News Relevanz-Bewertung & Intelligentes Filtering

## Ziel

Implementiere ein intelligentes Relevanz-Bewertungssystem, das nur die wichtigsten und relevantesten News für den Innovation Lead im Retail Bereich filtert und priorisiert.

## Problem Statement

**Aktuell**: Der Bot zeigt alle gefundenen News ohne Qualitäts-Filter
- ❌ Viele irrelevante oder generische Artikel
- ❌ Keine Priorisierung nach Wichtigkeit
- ❌ User muss selbst sortieren und filtern
- ❌ Signal-to-Noise Ratio ist niedrig

**Ziel**: Nur die Top 5-10 wirklich relevanten News
- ✅ Hohe Relevanz für Retail Innovation & Autonomous Delivery
- ✅ Intelligente Priorisierung
- ✅ Filtert Noise und Duplikate
- ✅ User sieht sofort die wichtigsten Updates

## User Persona (aus project_description.md)

**Who**: Innovation Lead im Lebensmitteleinzelhandel, spezialisiert auf autonomous last mile delivery
**Need**: Täglich die wichtigsten Innovation-News, kein Rauschen
**Context**: Morgens um 8 Uhr, schneller Überblick vor dem Arbeitstag

## Kern-Features

### 1. Multi-Dimensionales Relevanz-Scoring

Bewerte jede News nach mehreren Dimensionen:

#### A) **Thematische Relevanz** (40%)
- Keyword-Match Qualität
- Semantische Nähe zu Retail Innovation
- Spezifität (autonomous delivery > generic retail)
- Kontext-Relevanz (B2B > B2C)

#### B) **Quelle & Autorität** (25%)
- Source-Reputation (RetailDive > Generic Blog)
- Autoren-Expertise
- Publisher-Track Record
- Fact-Checking Status

#### C) **Aktualität & Trending** (20%)
- Zeitliche Relevanz (brandneu > 3 Tage alt)
- Trend-Erkennung (viral gehend?)
- Breaking News Detection
- Update zu laufenden Stories

#### D) **Innovation-Impact** (15%)
- Neuheitsgrad (völlig neu vs. Iteration)
- Markt-Impact (große Ankündigung > Gerücht)
- Technologie-Disruption
- Business-Relevanz

### 2. Intelligente Filterung

#### Exclude-Filter (Hard Filters)
- **Spam/Clickbait Detection**: Reißerische Headlines
- **Duplicate Stories**: Gleiche Story von 20 Outlets
- **Off-Topic**: Nicht retail-relevant
- **Promotional Content**: PR ohne News-Wert
- **Paywalled Content**: Nicht zugänglich

#### Quality-Filter (Soft Filters)
- **Minimum Word Count**: Zu kurze Artikel aussortieren
- **Freshness**: Maximal 48h alte News (konfigurierbar)
- **Source Whitelist/Blacklist**: Nur vertrauenswürdige Quellen
- **Language**: Nur DE/EN (konfigurierbar)

### 3. Machine Learning / KI-Unterstützung

#### Phase 1: Rule-based (MVP)
- Keyword-basiertes Scoring
- Source-Authority Mapping
- Zeitbasierte Gewichtung

#### Phase 2: ML-enhanced (Future)
- **Text-Embeddings**: Semantische Ähnlichkeit (Sentence-BERT)
- **Trend-Prediction**: Was wird wichtig?
- **User-Feedback Learning**: Welche News werden geklickt?
- **Topic Modeling**: Automatische Themen-Erkennung

### 4. Adaptive Filtering

Das System lernt und passt sich an:
- **User-Feedback**: "This was helpful" / "Not relevant"
- **Click-Tracking**: Welche News werden gelesen?
- **Time-of-Day**: Morgens vs. Abends unterschiedliche Relevanz
- **Seasonal**: Weihnachts-Retail vs. Sommer-Trends

## Technische Architektur

### Komponenten

```
src/
├── relevance/
│   ├── RelevanceEngine.js       # Haupt-Engine
│   ├── scorers/
│   │   ├── ThematicScorer.js    # Thematische Relevanz
│   │   ├── AuthorityScorer.js   # Quellen-Autorität
│   │   ├── TimelinessScorer.js  # Aktualität
│   │   └── InnovationScorer.js  # Innovation-Impact
│   ├── filters/
│   │   ├── SpamFilter.js        # Spam/Clickbait
│   │   ├── DuplicateFilter.js   # Duplikate
│   │   └── QualityFilter.js     # Qualitäts-Checks
│   └── ranker.js                # Final Ranking
├── ml/ (Phase 2)
│   ├── embeddings.js            # Text-Embeddings
│   ├── classifier.js            # ML-Classifier
│   └── feedback.js              # User-Feedback Loop
└── config/
    └── relevance.json           # Scoring-Konfiguration
```

### Geänderte Dateien

- `src/newsService.js` - Integration von RelevanceEngine
- `src/slackService.js` - Zeige Relevanz-Score in Messages
- `src/index.js` - Feedback-Endpoints
- `package.json` - ML/NLP Dependencies

## Scoring-Algorithmus (MVP)

### Thematische Relevanz (40%)

```javascript
class ThematicScorer {
  score(article, userProfile) {
    const text = `${article.title} ${article.description}`.toLowerCase();

    // Tier 1: High-priority keywords (2x weight)
    const tier1Keywords = [
      'autonomous delivery',
      'last mile',
      'grocery automation',
      'retail innovation',
      'autonomous vehicles'
    ];

    // Tier 2: Medium-priority keywords (1x weight)
    const tier2Keywords = [
      'retail technology',
      'e-commerce',
      'supply chain',
      'logistics',
      'delivery robots'
    ];

    // Tier 3: Context keywords (0.5x weight)
    const tier3Keywords = [
      'retail',
      'grocery',
      'supermarket',
      'innovation',
      'technology'
    ];

    let score = 0;

    // Count matches with weights
    tier1Keywords.forEach(kw => {
      if (text.includes(kw)) score += 2.0;
    });

    tier2Keywords.forEach(kw => {
      if (text.includes(kw)) score += 1.0;
    });

    tier3Keywords.forEach(kw => {
      if (text.includes(kw)) score += 0.5;
    });

    // Normalize to 0-1
    return Math.min(score / 10, 1.0);
  }
}
```

### Quellen-Autorität (25%)

```javascript
class AuthorityScorer {
  constructor() {
    // Source Authority Map (0-1)
    this.authorityMap = {
      'retaildive.com': 1.0,          // Retail-specific, high quality
      'supplychaindive.com': 0.95,
      'techcrunch.com': 0.9,
      'bloomberg.com': 0.9,
      'reuters.com': 0.85,
      'theverge.com': 0.8,
      'wired.com': 0.8,
      'lebensmittelzeitung.net': 0.85, // DE retail authority
      'news.google.com': 0.6,         // Aggregator, varies
      'unknown': 0.4                  // Default
    };
  }

  score(article) {
    const domain = this.extractDomain(article.link);
    return this.authorityMap[domain] || this.authorityMap['unknown'];
  }

  extractDomain(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }
}
```

### Aktualität (20%)

```javascript
class TimelinessScorer {
  score(article) {
    const pubDate = new Date(article.pubDate);
    const now = new Date();
    const hoursAgo = (now - pubDate) / (1000 * 60 * 60);

    // Decay function
    if (hoursAgo <= 6) return 1.0;       // < 6h = perfect
    if (hoursAgo <= 12) return 0.9;      // < 12h = excellent
    if (hoursAgo <= 24) return 0.7;      // < 24h = good
    if (hoursAgo <= 48) return 0.4;      // < 48h = acceptable
    return 0.1;                          // > 48h = old news
  }
}
```

### Innovation-Impact (15%)

```javascript
class InnovationScorer {
  score(article) {
    const text = `${article.title} ${article.description}`.toLowerCase();
    let score = 0.5; // Base score

    // Innovation indicators (positive signals)
    const innovationSignals = [
      'breakthrough', 'first', 'launches', 'announces',
      'revolutionary', 'disrupts', 'game-changer',
      'pilot program', 'partnership', 'acquisition',
      'funding', 'investment', 'Series A/B/C'
    ];

    // Non-innovation signals (negative signals)
    const nonInnovationSignals = [
      'opinion', 'analysis', 'commentary',
      'earnings', 'quarterly results', 'stock price'
    ];

    innovationSignals.forEach(signal => {
      if (text.includes(signal)) score += 0.1;
    });

    nonInnovationSignals.forEach(signal => {
      if (text.includes(signal)) score -= 0.15;
    });

    return Math.max(0, Math.min(1, score));
  }
}
```

### Final Score Calculation

```javascript
class RelevanceEngine {
  score(article, userProfile) {
    const scores = {
      thematic: this.thematicScorer.score(article, userProfile),
      authority: this.authorityScorer.score(article),
      timeliness: this.timelinessScorer.score(article),
      innovation: this.innovationScorer.score(article)
    };

    // Weighted sum
    const weights = {
      thematic: 0.40,
      authority: 0.25,
      timeliness: 0.20,
      innovation: 0.15
    };

    const finalScore =
      scores.thematic * weights.thematic +
      scores.authority * weights.authority +
      scores.timeliness * weights.timeliness +
      scores.innovation * weights.innovation;

    return {
      score: finalScore,
      breakdown: scores,
      metadata: {
        confidence: this.calculateConfidence(scores),
        reasoning: this.generateReasoning(scores)
      }
    };
  }
}
```

## Filtering Pipeline

```javascript
class NewsFilterPipeline {
  async filter(articles) {
    let filtered = articles;

    // Stage 1: Hard Filters (Exclude)
    filtered = this.spamFilter.filter(filtered);      // Remove spam
    filtered = this.duplicateFilter.filter(filtered); // Remove duplicates
    filtered = this.qualityFilter.filter(filtered);   // Minimum quality

    // Stage 2: Score
    filtered = filtered.map(article => ({
      ...article,
      relevance: this.relevanceEngine.score(article)
    }));

    // Stage 3: Soft Filters (Threshold)
    filtered = filtered.filter(a =>
      a.relevance.score >= this.config.minRelevanceScore
    );

    // Stage 4: Rank and Limit
    filtered.sort((a, b) => b.relevance.score - a.relevance.score);
    filtered = filtered.slice(0, this.config.maxArticles);

    return filtered;
  }
}
```

## Spam/Clickbait Detection

```javascript
class SpamFilter {
  isSpam(article) {
    const title = article.title.toLowerCase();

    // Clickbait patterns
    const clickbaitPatterns = [
      /you won't believe/i,
      /shocking/i,
      /this one trick/i,
      /what happened next/i,
      /number \d+ will shock you/i,
      /doctors hate (him|her|them)/i
    ];

    // Excessive capitalization
    const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length;
    if (capsRatio > 0.5) return true;

    // Excessive punctuation
    const exclamationCount = (title.match(/!/g) || []).length;
    if (exclamationCount > 2) return true;

    // Check patterns
    return clickbaitPatterns.some(pattern => pattern.test(title));
  }

  filter(articles) {
    return articles.filter(article => !this.isSpam(article));
  }
}
```

## User Feedback Loop

```javascript
// src/ml/feedback.js
class FeedbackSystem {
  async recordFeedback(articleId, feedback) {
    // Store: { articleId, userId, rating, timestamp }
    await this.db.storeFeedback({
      articleId,
      rating: feedback.rating,      // 1-5 stars
      helpful: feedback.helpful,    // boolean
      timestamp: new Date()
    });

    // Adjust future scoring
    await this.adjustWeights(articleId, feedback);
  }

  async adjustWeights(articleId, feedback) {
    // If consistently low-rated, reduce similar articles
    const article = await this.getArticle(articleId);

    if (feedback.rating < 3) {
      // Reduce weight of this source/keywords
      this.config.adjustSourceAuthority(article.source, -0.05);
    } else if (feedback.rating >= 4) {
      // Increase weight
      this.config.adjustSourceAuthority(article.source, +0.05);
    }
  }
}
```

## Konfiguration

### relevance.json

```json
{
  "scoring": {
    "weights": {
      "thematic": 0.40,
      "authority": 0.25,
      "timeliness": 0.20,
      "innovation": 0.15
    },
    "thresholds": {
      "minRelevanceScore": 0.5,
      "minAuthorityScore": 0.4,
      "maxAgeHours": 48
    }
  },
  "filtering": {
    "maxArticles": 8,
    "deduplicationSimilarity": 0.85,
    "minWordCount": 100,
    "languages": ["en", "de"]
  },
  "keywords": {
    "tier1": [
      "autonomous delivery",
      "last mile delivery",
      "grocery automation",
      "retail innovation",
      "delivery robots"
    ],
    "tier2": [
      "retail technology",
      "supply chain automation",
      "e-grocery",
      "logistics innovation",
      "warehouse automation"
    ],
    "tier3": [
      "retail",
      "grocery",
      "supermarket",
      "food delivery"
    ]
  },
  "sources": {
    "whitelist": [
      "retaildive.com",
      "supplychaindive.com",
      "techcrunch.com"
    ],
    "authorityMap": {
      "retaildive.com": 1.0,
      "techcrunch.com": 0.9,
      "bloomberg.com": 0.9
    }
  }
}
```

### .env Variablen

```env
# Relevance Scoring
RELEVANCE_MIN_SCORE=0.5
RELEVANCE_MAX_ARTICLES=8
RELEVANCE_MAX_AGE_HOURS=48

# ML/AI (Phase 2)
OPENAI_API_KEY=sk-...              # Optional: GPT for summarization
HUGGINGFACE_API_KEY=hf_...         # Optional: Embeddings
```

## Slack Message Format (mit Relevanz)

```javascript
// Erweiterte Slack Message mit Relevanz-Score
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `*🔥 Top ${articles.length} Retail Innovation News* (relevance-filtered)`
      }
    },
    ...articles.map((article, i) => ({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `*${i+1}. <${article.link}|${article.title}>*
${article.description}

📊 Relevance: ${this.formatRelevanceBar(article.relevance.score)}
🏆 Authority: ${article.source} (${(article.relevance.breakdown.authority * 100).toFixed(0)}%)
⏰ ${this.formatTime(article.pubDate)}

_Why relevant: ${article.relevance.metadata.reasoning}_`
      },
      "accessory": {
        "type": "button",
        "text": { "type": "plain_text", "text": "👍 Helpful" },
        "action_id": `feedback_${article.id}`
      }
    }))
  ]
}
```

## Testing & Validation

### Test-Szenarien

```bash
# 1. Score bekannte gute News (Sollte > 0.7)
npm run test:relevance -- --article "https://retaildive.com/news/amazon-autonomous-delivery"

# 2. Score bekannte irrelevante News (Sollte < 0.3)
npm run test:relevance -- --article "https://generic-blog.com/10-cat-facts"

# 3. Spam Detection
npm run test:spam -- "YOU WON'T BELIEVE THIS SHOCKING TRICK!!!"

# 4. Duplicate Detection
npm run test:duplicates -- --batch ./test-data/duplicate-stories.json

# 5. Full Pipeline
npm run test:pipeline -- --fetch-real
```

### Metriken

Track diese Metriken:

- **Precision**: Wie viele gezeigte News sind relevant?
- **Recall**: Wie viele relevante News wurden gefunden?
- **User Satisfaction**: Feedback-Ratings
- **Click-Through-Rate**: Werden News gelesen?
- **Filter-Rate**: Wie viel % wird ausgefiltert?

## Dependencies

```json
{
  "natural": "^6.5.0",              // NLP, TF-IDF
  "string-similarity": "^4.0.4",    // Duplicate detection
  "compromise": "^14.10.0",         // Text analysis
  "stopword": "^2.0.8",             // Remove stopwords
  "@tensorflow/tfjs-node": "^4.15.0", // ML (Phase 2)
  "sentence-transformers": "^1.0.0"   // Embeddings (Phase 2)
}
```

## Merge-Kriterien

✅ Relevanz-Scoring funktioniert und ist kalibriert
✅ Spam-Filter entfernt Clickbait zuverlässig
✅ Duplicate-Detection funktioniert
✅ Top 8 News sind konsistent hochwertig
✅ Performance < 2s für Scoring+Filtering
✅ Konfiguration ist flexibel anpassbar
✅ User-Feedback System funktioniert
✅ Dokumentation vollständig

## Rollout-Plan

### Phase 1: MVP (Week 1-2)
- ✅ Rule-based Scoring implementieren
- ✅ Basic Filters (Spam, Duplicates)
- ✅ Konfigurierbare Thresholds
- ✅ Testing & Kalibrierung

### Phase 2: Enhancement (Week 3-4)
- 📊 User-Feedback Integration
- 📈 A/B Testing verschiedener Scoring-Gewichte
- 🎯 Feintuning basierend auf Feedback

### Phase 3: ML (Future)
- 🤖 Text-Embeddings für semantische Ähnlichkeit
- 🧠 ML-Classifier trainieren
- 📚 Topic Modeling
- 🔮 Trend-Prediction

## Success Metrics

**Ziel nach 2 Wochen**:
- ✅ User-Feedback: > 80% "helpful" ratings
- ✅ Durchschnittlicher Relevanz-Score: > 0.7
- ✅ Filter-Rate: 60-80% der Roh-News werden gefiltert
- ✅ Zero Spam in Top 8

## Notizen

- Start konservativ (höhere Thresholds), dann iterativ lockern
- User-Feedback ist Gold - erfasse es von Tag 1
- Authority-Map muss regelmäßig aktualisiert werden
- Consider: Personalisierung pro User (falls mehrere Users)

## Branch Info

- **Branch**: `feature/news-relevance`
- **Base**: `main`
- **Worktree**: `worktree/news-relevance/`
- **Priority**: 🔴 **KRITISCH** - Kernfunktionalität für User-Value

---

**Entwickelt von**: [Dein Name/Team]
**Start Datum**: 20. November 2025
**Status**: 🚧 Bereit zur Entwicklung
**Geschätzte Dauer**: 1-2 Wochen (MVP), 3-4 Wochen (Full)
