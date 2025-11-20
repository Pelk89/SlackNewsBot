# Feature: Erweiterte News-Quellen

## Ziel

Erweitere die News-Aggregation um zusätzliche Quellen neben Google News, um qualitativ bessere und diversifizierte News über Retail Innovation zu erhalten.

## Beschreibung

Aktuell nutzt der Bot nur Google News RSS. Dieses Feature fügt hinzu:

- **NewsAPI Integration**: Zugriff auf 80,000+ News-Quellen
- **Spezifische RSS Feeds**: RetailDive, TechCrunch, etc.
- **News-Aggregation**: Kombiniere mehrere Quellen intelligent
- **Relevanz-Scoring**: Bewerte und ranke News nach Relevanz
- **Source-Diversität**: Vermeide Dominanz einzelner Quellen

## Aufgaben

### 1. NewsAPI Integration
- [ ] NewsAPI Account erstellen (Free Tier: 100 requests/day)
- [ ] NewsAPI Client implementieren
- [ ] Keyword-basierte Suche
- [ ] Source-Filter (retail-fokussierte Publikationen)
- [ ] Rate-Limiting beachten

### 2. RSS Feed Parser erweitern
- [ ] Multiple RSS Feeds gleichzeitig parsen
- [ ] Feed-Validierung (ist Feed noch aktiv?)
- [ ] OPML Import/Export für Feed-Listen
- [ ] Podcast-RSS Support (optional)

### 3. Source-spezifische Feeds
- [ ] **RetailDive** RSS Feed
- [ ] **TechCrunch** (Retail/Logistics Section)
- [ ] **Reuters Business** (Retail)
- [ ] **Bloomberg Retail**
- [ ] **The Verge** (Logistics/Delivery)
- [ ] **Supply Chain Dive**
- [ ] Deutsche Quellen: **Lebensmittel Zeitung**, **EHI**

### 4. News-Aggregation Engine
- [ ] SourceManager Klasse (verwaltet alle Quellen)
- [ ] Paralleles Fetching von allen Quellen
- [ ] Normalisierung (einheitliches News-Format)
- [ ] Deduplication über mehrere Quellen hinweg
- [ ] Error Handling pro Source (eine Source down = kein Totalausfall)

### 5. Relevanz-Scoring System
- [ ] Scoring-Algorithmus basierend auf:
  - Keyword-Match Qualität
  - Source-Autorität (RetailDive > Generic Blog)
  - Freshness (neuere News = höherer Score)
  - Engagement (Social Shares, falls verfügbar)
- [ ] Konfigurierbare Score-Gewichtung
- [ ] Top N News basierend auf Score

### 6. Source-Diversität
- [ ] Limitiere News pro Source (max. 3 aus einer Quelle)
- [ ] Favorisiere unterschiedliche Perspektiven
- [ ] Geo-Diversität (US, EU, APAC News)

## Technische Details

### News-Quellen Übersicht

| Quelle | Typ | API/RSS | Kosten | Fokus |
|--------|-----|---------|--------|-------|
| **Google News** | RSS | RSS | Free | Breit |
| **NewsAPI** | API | REST | Free Tier | 80k+ Sources |
| **RetailDive** | RSS | RSS | Free | Retail Specific |
| **TechCrunch** | RSS | RSS | Free | Tech/Startups |
| **Reuters** | RSS | RSS | Free | Business News |
| **Bloomberg** | RSS | RSS | Free | Financial |
| **The Verge** | RSS | RSS | Free | Tech/Logistics |

### Neue Dateien

```
src/
├── sources/
│   ├── SourceManager.js        # Haupt-Manager
│   ├── sources/
│   │   ├── GoogleNewsSource.js
│   │   ├── NewsAPISource.js
│   │   ├── RSSSource.js        # Generic RSS
│   │   └── BaseSource.js       # Abstract Base
│   ├── aggregator.js           # News Aggregation
│   └── scorer.js               # Relevanz-Scoring
├── config/
│   └── sources.json            # Source-Konfigurationen
└── utils/
    └── deduplicator.js         # Verbesserte Deduplication
```

### Geänderte Dateien

- `src/newsService.js` - Integration von SourceManager
- `src/slackService.js` - Zeige Source-Name pro News
- `package.json` - Neue Dependencies
- `.env.example` - NewsAPI Key
- `README.md` - Setup für neue Sources

### Dependencies

```json
{
  "newsapi": "^2.4.1",           // NewsAPI Client
  "rss-parser": "^3.13.0",       // Already installed
  "feedparser": "^2.2.10",       // Alternativer RSS Parser
  "node-fetch": "^3.3.2",        // HTTP Requests
  "similarity": "^1.2.1"         // Text-Similarity für Dedup
}
```

### Source-Konfiguration (sources.json)

```json
{
  "sources": [
    {
      "id": "google-news",
      "name": "Google News",
      "type": "rss",
      "enabled": true,
      "priority": 1,
      "config": {
        "baseUrl": "https://news.google.com/rss/search",
        "keywords": ["retail innovation", "autonomous delivery"]
      }
    },
    {
      "id": "newsapi",
      "name": "NewsAPI",
      "type": "api",
      "enabled": true,
      "priority": 2,
      "config": {
        "apiKey": "${NEWS_API_KEY}",
        "language": "en",
        "sources": "techcrunch,reuters,bloomberg"
      }
    },
    {
      "id": "retaildive",
      "name": "Retail Dive",
      "type": "rss",
      "enabled": true,
      "priority": 3,
      "config": {
        "feedUrl": "https://www.retaildive.com/feeds/news/"
      }
    },
    {
      "id": "techcrunch-logistics",
      "name": "TechCrunch Logistics",
      "type": "rss",
      "enabled": true,
      "priority": 2,
      "config": {
        "feedUrl": "https://techcrunch.com/tag/logistics/feed/"
      }
    }
  ],
  "scoring": {
    "keywordMatch": 0.4,
    "sourceAuthority": 0.3,
    "freshness": 0.2,
    "engagement": 0.1
  },
  "diversification": {
    "maxPerSource": 3,
    "minSources": 2
  }
}
```

### Code-Beispiel: SourceManager

```javascript
// src/sources/SourceManager.js
class SourceManager {
  constructor(config) {
    this.sources = this.loadSources(config);
    this.aggregator = new NewsAggregator();
    this.scorer = new RelevanceScorer(config.scoring);
  }

  async fetchAllNews(keywords) {
    // Fetch von allen enabled Sources parallel
    const promises = this.sources
      .filter(s => s.enabled)
      .map(source => this.fetchFromSource(source, keywords));

    const results = await Promise.allSettled(promises);

    // Sammle alle erfolgreichen Results
    const allNews = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Aggregiere und dedupliziere
    const aggregated = this.aggregator.deduplicate(allNews);

    // Score und sortiere
    const scored = this.scorer.scoreNews(aggregated, keywords);

    // Diversifiziere
    const diversified = this.diversify(scored);

    return diversified;
  }

  async fetchFromSource(source, keywords) {
    try {
      const sourceInstance = this.createSourceInstance(source);
      return await sourceInstance.fetch(keywords);
    } catch (error) {
      console.error(`Error fetching from ${source.name}:`, error);
      return []; // Graceful degradation
    }
  }
}
```

### Code-Beispiel: NewsAPI Source

```javascript
// src/sources/sources/NewsAPISource.js
const NewsAPI = require('newsapi');

class NewsAPISource extends BaseSource {
  constructor(config) {
    super(config);
    this.client = new NewsAPI(config.apiKey);
  }

  async fetch(keywords) {
    const query = keywords.join(' OR ');

    const response = await this.client.v2.everything({
      q: query,
      language: this.config.language || 'en',
      sortBy: 'publishedAt',
      pageSize: 20
    });

    return response.articles.map(article => ({
      title: article.title,
      description: article.description,
      link: article.url,
      pubDate: article.publishedAt,
      source: article.source.name,
      sourceId: this.id,
      image: article.urlToImage
    }));
  }
}
```

## Relevanz-Scoring Algorithmus

```javascript
// src/sources/scorer.js
class RelevanceScorer {
  scoreNews(newsItem, keywords) {
    const scores = {
      keyword: this.scoreKeywordMatch(newsItem, keywords),
      authority: this.scoreSourceAuthority(newsItem.sourceId),
      freshness: this.scoreFreshness(newsItem.pubDate),
      engagement: this.scoreEngagement(newsItem)
    };

    // Gewichteter Score
    const totalScore =
      scores.keyword * this.weights.keywordMatch +
      scores.authority * this.weights.sourceAuthority +
      scores.freshness * this.weights.freshness +
      scores.engagement * this.weights.engagement;

    return {
      ...newsItem,
      score: totalScore,
      scoreBreakdown: scores
    };
  }

  scoreKeywordMatch(newsItem, keywords) {
    // TF-IDF ähnlich
    const text = `${newsItem.title} ${newsItem.description}`.toLowerCase();
    let matches = 0;

    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        matches++;
      }
    });

    return matches / keywords.length;
  }

  scoreSourceAuthority(sourceId) {
    const authorityMap = {
      'retaildive': 1.0,
      'bloomberg': 0.9,
      'techcrunch': 0.85,
      'reuters': 0.9,
      'google-news': 0.7
    };
    return authorityMap[sourceId] || 0.5;
  }

  scoreFreshness(pubDate) {
    const hours = (Date.now() - new Date(pubDate)) / (1000 * 60 * 60);
    if (hours < 6) return 1.0;
    if (hours < 24) return 0.8;
    if (hours < 48) return 0.5;
    return 0.3;
  }
}
```

## Testing

### Test-Szenarien

```bash
# 1. Test einzelne Source
node -e "
  const source = new NewsAPISource(config);
  source.fetch(['retail']).then(console.log);
"

# 2. Test Aggregation aller Quellen
npm run test -- --source-test

# 3. Test Scoring
# → Verifiziere dass hochrelevante News höhere Scores haben

# 4. Test Deduplication
# → Gleiche Story von mehreren Quellen sollte nur 1x erscheinen

# 5. Test Diversification
# → Max. 3 News pro Source
```

### Zu testende Szenarien
- [ ] Alle konfigurierten Sources werden erfolgreich abgefragt
- [ ] Fehler in einer Source stoppt nicht das Gesamtsystem
- [ ] NewsAPI Rate-Limit wird eingehalten
- [ ] Deduplication funktioniert über Quellen hinweg
- [ ] Scoring bevorzugt relevante News
- [ ] Diversification verhindert Source-Dominanz

## Konfiguration

### Neue .env Variablen

```env
# NewsAPI
NEWS_API_KEY=your_newsapi_key_here

# Source-Konfiguration
NEWS_SOURCES_CONFIG=./config/sources.json

# Scoring
SCORE_WEIGHT_KEYWORD=0.4
SCORE_WEIGHT_AUTHORITY=0.3
SCORE_WEIGHT_FRESHNESS=0.2
SCORE_WEIGHT_ENGAGEMENT=0.1

# Diversification
MAX_NEWS_PER_SOURCE=3
MIN_SOURCES_REQUIRED=2
```

## RSS Feed URLs (Beispiele)

```javascript
const RSS_FEEDS = {
  retailDive: 'https://www.retaildive.com/feeds/news/',
  techCrunch: 'https://techcrunch.com/feed/',
  techCrunchLogistics: 'https://techcrunch.com/tag/logistics/feed/',
  theVerge: 'https://www.theverge.com/rss/index.xml',
  supplyChainDive: 'https://www.supplychaindive.com/feeds/news/',
  lebensmittelZeitung: 'https://www.lebensmittelzeitung.net/rss/news',
  retailTouchPoints: 'https://www.retailtouchpoints.com/feed'
};
```

## Migration

### Phase 1: Parallel-Betrieb
- Google News bleibt primäre Quelle
- Neue Quellen werden parallel gefetched
- A/B Test welche Quellen bessere News liefern

### Phase 2: Vollständige Integration
- SourceManager wird Standard
- Google News nur noch eine von vielen Quellen
- Scoring-basiertes Ranking

## Merge-Kriterien

✅ Mindestens 3 zusätzliche Quellen funktionieren
✅ NewsAPI Integration funktioniert
✅ Aggregation und Deduplication stabil
✅ Scoring-System liefert relevante Results
✅ Performance ist akzeptabel (< 5s Fetch-Zeit)
✅ Fehler-Handling pro Source
✅ Dokumentation vollständig

## Performance-Überlegungen

- **Paralleles Fetching**: Alle Quellen parallel = schneller
- **Caching**: Cache News für 15min um API-Calls zu sparen
- **Rate Limiting**: NewsAPI hat Limits (100/day im Free Tier)
- **Timeouts**: Single Source timeout = 5s, dann skip

## Kosten

| Service | Free Tier | Paid |
|---------|-----------|------|
| Google News RSS | ∞ | - |
| NewsAPI | 100 req/day | $449/mo (unlimited) |
| RSS Feeds | ∞ | - |

**Empfehlung**: Start mit Free Tier NewsAPI (reicht für täglichen Bot)

## Notizen

- RetailDive ist die beste Quelle für Retail-spezifische News
- NewsAPI Free Tier reicht für 1x täglich fetchen
- Scoring-Gewichte können später feingetuned werden
- Consider: User-Feedback Loop (welche News werden geklickt?)

## Branch Info

- **Branch**: `feature/news-sources`
- **Base**: `main`
- **Worktree**: `worktree/news-sources/`

---

**Entwickelt von**: [Dein Name/Team]
**Start Datum**: 20. November 2025
**Status**: 🚧 In Planung
**Priorität**: 🟢 Mittel-Hoch (verbessert News-Qualität signifikant)
