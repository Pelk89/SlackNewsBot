# Plan: Google News Optimierung mit Topic Feeds und Advanced Queries

## Übersicht

**Ziel:** Google News Integration verbessern durch:
1. **Bessere Filterung** - Advanced Boolean Queries (AND, OR, NOT, Exact Phrases, Date Filters)
2. **Topic Feeds** - Google News Topics (BUSINESS, TECHNOLOGY, SCIENCE) zusätzlich zu Keyword-Suche
3. **Intelligente Query-Konstruktion** - Keyword-Kombination und Noise-Reduktion

**Aktuelle Situation:**
- ✅ Google News bereits via RSS integriert (`sources.json`)
- ✅ Nutzt `https://news.google.com/rss/search?q={keyword}`
- ⚠️ Nur einfache Keyword-Suche (ein Keyword = eine Query)
- ⚠️ Keine Boolean-Operatoren oder Topic Feeds

**Neue Lösung:**
- ✅ **Query Builder** - Intelligente Kombination mehrerer Keywords mit OR/AND
- ✅ **Topic Feeds** - BUSINESS, TECHNOLOGY, SCIENCE Feeds parallel zu Keywords
- ✅ **Dual Mode** - Keyword-Suche + Topic-Feeds kombiniert
- ✅ **Noise Reduction** - Automatisches Ausschließen irrelevanter Begriffe
- ✅ **Date Filtering** - `when:7d` für frische Artikel

---

## 1. Architektur-Design

### Dual-Mode Fetching

**GoogleNewsSource wird erweitert um zwei parallele Modi:**

1. **Keyword Search Mode** (enhanced)
   - Nutzt neuen `GoogleNewsQueryBuilder`
   - Kombiniert Keywords intelligent mit OR-Operator
   - Fügt Date Filter hinzu (`when:7d`)
   - Schließt Noise-Begriffe aus (`-sale -discount`)
   - Exact Phrase Matching für Multi-Word Keywords

2. **Topic Feed Mode** (neu)
   - Fetcht Google News Topic Feeds parallel
   - Topics: BUSINESS, TECHNOLOGY, SCIENCE
   - URL: `https://news.google.com/rss/headlines/section/topic/{TOPIC}`
   - Unabhängig von Keywords - erweitert Coverage

**Beide Modi laufen parallel und werden merged/dedupliziert**

---

## 2. Query Builder Implementation

### Neue Datei: `src/utils/googleNewsQueryBuilder.js`

**Funktionalität:**

```javascript
class GoogleNewsQueryBuilder {
  // Input: ['retail innovation', 'last mile delivery', 'autonomous vehicles']
  // Output: '"retail innovation" OR "last mile delivery" -sale -discount when:7d'

  buildOptimizedQueries(keywords, maxQueries = 5) {
    // Gruppiert Keywords intelligent
    // Fügt Exact Phrases hinzu (Multi-Word)
    // Kombiniert mit OR-Operator
    // Fügt Exclusions hinzu
    // Fügt Date Filter hinzu
  }
}
```

**Features:**
- ✅ **Exact Phrase Matching**: `"last mile delivery"` statt `last mile delivery`
- ✅ **Boolean OR**: Kombiniert verwandte Keywords in eine Query
- ✅ **Exclusion Terms**: `-sale -discount -recipe` für Noise Reduction
- ✅ **Date Filtering**: `when:7d` für letzte 7 Tage
- ✅ **Query Optimization**: Reduziert 10 Keywords auf 3-5 smarte Queries

**Beispiel:**

```javascript
// Input Keywords:
['retail innovation', 'last mile delivery', 'autonomous vehicles', 'grocery automation']

// Output Queries:
[
  '"retail innovation" OR "last mile delivery" -sale -discount when:7d',
  '"autonomous vehicles" OR "grocery automation" retail -sale when:7d'
]
```

---

## 3. Topic Feeds Configuration

### Google News Topics

**Verfügbare Topics (via RSS):**
- BUSINESS - Business & Wirtschaft
- TECHNOLOGY - Technologie
- SCIENCE - Wissenschaft
- HEALTH - Gesundheit
- WORLD - Weltnachrichten
- NATION - Nationale News

**Empfohlene Topics für Retail Bot:**
- ✅ **BUSINESS** (Priority 1) - Retail ist Business
- ✅ **TECHNOLOGY** (Priority 1) - Innovation & Tech
- ✅ **SCIENCE** (Priority 2) - Automation, Robotics, AI

**Topic Feed URLs:**
```
https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en
https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en
```

### Configuration in `sources.json`

```json
{
  "id": "google-news",
  "type": "google-news",
  "enabled": true,
  "config": {
    "baseUrl": "https://news.google.com/rss",
    "language": "en-US",
    "country": "US",

    "keywordSearch": {
      "enabled": true,
      "priority": 1
    },

    "queryBuilder": {
      "enabled": true,
      "dateRange": "7d",
      "excludeTerms": ["sale", "discount", "recipe", "cooking"],
      "exactPhraseMatching": true,
      "maxQueriesPerFetch": 5
    },

    "topics": {
      "enabled": true,
      "feeds": [
        {
          "name": "BUSINESS",
          "enabled": true,
          "priority": 1,
          "url": "headlines/section/topic/BUSINESS"
        },
        {
          "name": "TECHNOLOGY",
          "enabled": true,
          "priority": 1,
          "url": "headlines/section/topic/TECHNOLOGY"
        },
        {
          "name": "SCIENCE",
          "enabled": true,
          "priority": 2,
          "url": "headlines/section/topic/SCIENCE"
        }
      ],
      "maxArticlesPerTopic": 15
    }
  }
}
```

---

## 4. Code-Änderungen

### 4.1 GoogleNewsSource.js Modifikationen

**Constructor - Query Builder initialisieren:**

```javascript
constructor(config) {
  super(config);
  this.parser = new Parser({...});

  // NEU: Query Builder
  if (this.config.queryBuilder?.enabled !== false) {
    const GoogleNewsQueryBuilder = require('../../utils/googleNewsQueryBuilder');
    this.queryBuilder = new GoogleNewsQueryBuilder(this.config.queryBuilder || {});
  }

  // NEU: Topic Configuration
  this.topicsEnabled = this.config.topics?.enabled || false;
  this.enabledTopics = this.config.topics?.feeds?.filter(t => t.enabled) || [];
}
```

**fetch() - Dual Mode:**

```javascript
async fetch(keywords) {
  return await cacheManager.wrap('rss', cacheKey, async () => {
    const promises = [];

    // Mode 1: Keyword Search (enhanced)
    if (this.config.keywordSearch?.enabled !== false) {
      promises.push(this.fetchKeywordMode(keywords));
    }

    // Mode 2: Topic Feeds (neu)
    if (this.topicsEnabled) {
      promises.push(this.fetchTopicMode());
    }

    const results = await Promise.allSettled(promises);
    const allItems = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    return allItems.map(item => this.normalize(item));
  });
}
```

**fetchKeywordMode() - Mit Query Builder:**

```javascript
async fetchKeywordMode(keywords) {
  if (this.queryBuilder) {
    // Nutzt advanced queries
    const queries = this.queryBuilder.buildOptimizedQueries(keywords, 5);
    const promises = queries.map(query => this.fetchForQuery(query));
    const results = await Promise.all(promises);
    return results.flat();
  } else {
    // Fallback: Original implementation
    const promises = keywords.map(kw => this.fetchForKeyword(kw));
    const results = await Promise.all(promises);
    return results.flat();
  }
}
```

**fetchTopicMode() - Topic Feeds:**

```javascript
async fetchTopicMode() {
  const promises = this.enabledTopics.map(topic => this.fetchTopic(topic));
  const results = await Promise.allSettled(promises);
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

async fetchTopic(topic) {
  const url = `${this.baseUrl}/${topic.url}?hl=${this.language}&gl=${this.country}&ceid=${this.country}:${this.language.split('-')[0]}`;

  const feed = await parseRSSWithRetry(this.parser, url, {
    timeout: 20000,
    retries: 1,
    operationName: `${this.name} topic: ${topic.name}`
  });

  const maxItems = this.config.topics?.maxArticlesPerTopic || 15;

  return feed.items.slice(0, maxItems).map(item => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    description: item.contentSnippet || item.description || '',
    source: this.extractSource(item.title),
    topicSource: `Google News - ${topic.name}`,
    googleNewsTopic: topic.name
  }));
}
```

---

## 5. Performance & Request-Volumen

### Request-Analyse

**Vorher (aktuell):**
- ~10 Keywords = 10 separate RSS Requests
- Gesamt: 10 Requests/Fetch

**Nachher (optimiert):**
- Keywords: 3-5 optimierte Queries (durch OR-Kombination)
- Topics: 3 Topic Feeds (BUSINESS, TECHNOLOGY, SCIENCE)
- Gesamt: **6-8 Requests/Fetch**

**Verbesserung:** -20% bis -40% weniger Requests

### Caching-Strategie

- Keyword Cache: 6 Stunden (wie bisher)
- Topic Cache: 6 Stunden (kann auf 4h reduziert werden für mehr Aktualität)
- Separate Cache Keys für Keyword vs Topics
- Date-based Keys sorgen für tägliche Aktualisierung

**Keine Performance-Verschlechterung erwartet** - Requests laufen parallel

---

## 6. Rollout-Strategie

### Phase 1: Query Builder Only (Tag 1-3)

```json
{
  "queryBuilder": { "enabled": true },
  "topics": { "enabled": false }
}
```

- Testen der advanced queries
- Monitoring: Anzahl queries, Relevanz der Ergebnisse
- Bei Problemen: `"queryBuilder": { "enabled": false }` → Rollback ohne Code-Änderung

### Phase 2: Topics Addition (Tag 4-7)

```json
{
  "queryBuilder": { "enabled": true },
  "topics": {
    "enabled": true,
    "feeds": [
      { "name": "BUSINESS", "enabled": true },
      { "name": "TECHNOLOGY", "enabled": true }
    ]
  }
}
```

- Start mit 2 Topics
- Monitoring: Artikel-Diversität, Topic-Qualität
- Bei Erfolg: SCIENCE Topic hinzufügen

### Phase 3: Fine-Tuning (Tag 8-14)

- Optimierung der `excludeTerms`
- Anpassung `maxArticlesPerTopic`
- Eventuell zusätzliche Topics

**Rollback immer möglich via Config - kein Code-Deployment nötig**

---

## 7. Erwartete Verbesserungen

### Quantitativ

| Metrik | Vorher | Nachher | Verbesserung |
|--------|--------|---------|--------------|
| Relevante Artikel/Tag | 8-12 | 15-20 | +50-60% |
| Keyword Queries | 10 | 3-5 | -50% |
| Request Volumen | 10 | 6-8 | -20% |
| Topic Diversität | 3-4 | 6-8 | +100% |
| Cache Hit Rate | 40% | 60%+ | +50% |

### Qualitativ

- ✅ **Bessere Coverage** - Topic Feeds finden Artikel die Keywords verpassen
- ✅ **Weniger Noise** - Exclusion Terms filtern Retail-Sales/Discount-Artikel
- ✅ **Frischere Artikel** - `when:7d` Filter sorgt für Aktualität
- ✅ **Authoritative Sources** - Topic Feeds bevorzugen etablierte Publisher
- ✅ **Weniger Wartung** - OR-Kombination reduziert Anzahl Keywords die gepflegt werden müssen

---

## 8. Implementierungs-Schritte

### Schritt 1: Query Builder (1-2h)
1. Erstelle `src/utils/googleNewsQueryBuilder.js`
2. Implementiere `buildOptimizedQueries()`
3. Exact Phrase Formatting
4. Boolean OR Kombination
5. Date Filter & Exclusions

### Schritt 2: GoogleNewsSource Enhancement (2-3h)
1. Modifiziere Constructor
2. Implementiere `fetchKeywordMode()` mit QueryBuilder
3. Füge `fetchForQuery()` hinzu
4. Test mit real keywords

### Schritt 3: Topic Feeds (2-3h)
1. Implementiere `fetchTopicMode()`
2. Implementiere `fetchTopic()`
3. Topic Config zu `sources.json` hinzufügen
4. Test mit real topics

### Schritt 4: Integration (1-2h)
1. Modifiziere `fetch()` für Dual Mode
2. Merge & Deduplizierung
3. Caching testen
4. End-to-End Test

### Schritt 5: Configuration & Testing (1-2h)
1. Config in `sources.json` vervollständigen
2. Environment Variables dokumentieren
3. Integration Tests
4. Manual Testing mit echten Daten

**Geschätzter Zeitaufwand: 7-12 Stunden**

---

## 9. Kritische Dateien

### Zu Erstellen:
- `/Users/A1CA160/Documents/develop/NewsBotSlack/src/utils/googleNewsQueryBuilder.js`

### Zu Modifizieren:
- `/Users/A1CA160/Documents/develop/NewsBotSlack/src/sources/sources/GoogleNewsSource.js`
- `/Users/A1CA160/Documents/develop/NewsBotSlack/src/config/sources.json`
- `/Users/A1CA160/Documents/develop/NewsBotSlack/.env.example`

### Optional (Testing):
- `/Users/A1CA160/Documents/develop/NewsBotSlack/tests/sources/GoogleNewsSource.test.js`

---

## 10. Risiken & Mitigation

| Risiko | Impact | Wahrscheinlichkeit | Mitigation |
|--------|--------|-------------------|------------|
| Google ändert RSS Format | Hoch | Niedrig | Existing retry/error handling; fallback zu keywords |
| Topic URLs werden invalid | Mittel | Niedrig | Easy config update; monitoring |
| Query Builder zu aggressiv | Mittel | Mittel | Feature flag für disable; gradual rollout |
| Performance Verschlechterung | Mittel | Niedrig | Parallel fetching; independent caching |
| Duplikate zwischen Modi | Niedrig | Mittel | Existing deduplication in aggregator |

**Alle Risiken durch Config-basiertes Rollback mitigierbar**

---

## Zusammenfassung

**Was wird besser:**
1. ✅ **50% weniger Keyword Queries** durch intelligente OR-Kombination
2. ✅ **50-60% mehr relevante Artikel** durch Topic Feeds
3. ✅ **Bessere Qualität** durch Noise Reduction (exclude terms)
4. ✅ **Frischere Artikel** durch Date Filtering (`when:7d`)
5. ✅ **Mehr Diversität** durch Topic Feeds (BUSINESS, TECH, SCIENCE)
6. ✅ **Einfaches Rollback** via Configuration (keine Code-Änderungen nötig)

**Aufwand:**
- Development: 7-12 Stunden
- Testing: 2-3 Tage
- Rollout: Gestaffelt über 1-2 Wochen

**ROI:**
- Einmalig 7-12h Investment
- Dauerhaft bessere News-Qualität
- Weniger manuelle Keyword-Pflege
- Robustere News-Aggregation
