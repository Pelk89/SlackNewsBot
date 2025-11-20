# Feature: Configurable Settings

**Branch**: `feature/configurable-settings`
**Status**: 🚧 In Development
**Priority**: 🟡 Medium (User Experience Improvement)

## 🎯 Ziel

Ermöglicht flexible Konfiguration der täglichen News-Anzahl und Keywords ohne Code-Änderungen.

## 📋 Problem

Aktuell gibt es Inkonsistenzen in der Konfiguration:
- `MAX_NEWS_ITEMS=10` in `.env` wird ignoriert
- `maxArticles: 8` in `relevance.json` überschreibt die Env-Variable
- User bekommt nur 8 statt gewünschte 10 Artikel
- Keywords sind über zwei Systeme verteilt:
  - `NEWS_KEYWORDS` in `.env` (für SourceManager)
  - `tier1/tier2/tier3` in `relevance.json` (für RelevanceEngine)

## ✨ Lösung

### 1. MAX_NEWS_ITEMS Environment Variable Respektieren

**Änderung in `RelevanceEngine.js`**:
```javascript
// Vorher: Hardcoded aus Config
this.maxArticles = this.config.filtering.maxArticles; // 8

// Nachher: Env > Config > Default
this.maxArticles = parseInt(process.env.MAX_NEWS_ITEMS) ||
                   this.config.filtering.maxArticles || 10;
```

**Flow**:
1. Liest `MAX_NEWS_ITEMS` aus Env (z.B. 10)
2. Fallback auf `relevance.json` Config
3. Default: 10 Artikel

### 2. Default in relevance.json auf 10 erhöhen

**Änderung in `relevance.json`**:
```json
"filtering": {
  "maxArticles": 10  // vorher: 8
}
```

### 3. Keywords (bereits konfigurierbar)

Keywords sind bereits über `NEWS_KEYWORDS` in `.env` konfigurierbar:
```env
NEWS_KEYWORDS=retail innovation,autonomous delivery,last mile delivery
```

Die tier-basierten Keywords in `relevance.json` werden für das **Scoring** verwendet (nicht für das Fetching).

## 📊 Vorher/Nachher

### Vorher
```
MAX_NEWS_ITEMS=10 in .env
↓
NewsService: fetchAllNews()
↓
RelevanceEngine: maxArticles=8 (hardcoded)
↓
User bekommt: 8 Artikel ❌
```

### Nachher
```
MAX_NEWS_ITEMS=10 in .env
↓
NewsService: fetchAllNews()
↓
RelevanceEngine: maxArticles=10 (from env)
↓
User bekommt: 10 Artikel ✅
```

## 🔧 Implementation

### Dateien geändert
- [x] `src/relevance/RelevanceEngine.js` - Env Variable Support
- [x] `src/relevance/config/relevance.json` - Default 8→10

### Dateien zu ändern
- [ ] `README.md` - Dokumentation aktualisieren
- [ ] `.env.example` - Kommentar hinzufügen

## 🧪 Testing

### Manueller Test
```bash
# In worktree/configurable-settings
export MAX_NEWS_ITEMS=10
npm test
# Erwartung: "Limit to top 10: 10 → 10"
```

### Test mit verschiedenen Werten
```bash
# 5 Artikel
MAX_NEWS_ITEMS=5 npm test

# 15 Artikel
MAX_NEWS_ITEMS=15 npm test

# Default (ohne env)
npm test  # sollte 10 nutzen
```

## 📖 Nutzung

### Artikel-Anzahl konfigurieren
```env
# In .env
MAX_NEWS_ITEMS=10  # Täglich 10 Artikel (empfohlen)
MAX_NEWS_ITEMS=5   # Nur Top 5
MAX_NEWS_ITEMS=15  # Mehr Auswahl
```

### Keywords konfigurieren
```env
# In .env
NEWS_KEYWORDS=retail innovation,autonomous delivery,grocery tech
```

## 🎯 Nächste Schritte

1. [x] RelevanceEngine ändern
2. [x] relevance.json Default anpassen
3. [ ] Tests durchführen
4. [ ] README aktualisieren
5. [ ] Feature mergen in main

## 💡 Weitere Verbesserungen (Optional)

- [ ] Config-Validierung (z.B. MAX_NEWS_ITEMS zwischen 1-50)
- [ ] Separate Limits für verschiedene Kanäle (Multi-Channel)
- [ ] Web-UI für Konfiguration
- [ ] Runtime-Config Reload ohne Neustart

---

**Letzte Änderung**: 20. November 2025
