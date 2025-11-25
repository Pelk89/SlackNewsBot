# Feature: CSV-basiertes Keyword-Management mit automatischer Variations-Generierung

## Ziel

Transformation des aktuellen manuellen Keyword-Systems in `relevance.json` zu einem einfachen CSV-basierten Workflow, bei dem nur Basis-Keywords gepflegt werden und das System automatisch alle Variationen generiert.

## Problem

Aktuell müssen in `src/relevance/config/relevance.json` alle Keyword-Variationen manuell gepflegt werden:
- Pluralformen (robot → robots)
- Bindestriche (last mile → last-mile → lastmile)
- Deutsche Übersetzungen (delivery → lieferung, zustellung)

Das ist fehleranfällig und wartungsintensiv.

## Lösung

**Einfache CSV-Datei** (`config/keywords.csv`) mit Basis-Keywords → **Automatische Generierung** aller Variationen → **Auto-generierte** `relevance.json`

## Architektur

### Input: CSV-Datei (User editiert)

```csv
keyword,tier,language,notes
autonomous delivery,1,en,Core topic - autonomous delivery systems
last mile delivery,1,en,Last mile logistics focus
```

### Processing: Generation Script

```bash
npm run generate-keywords
```

### Output: relevance.json (Auto-generiert)

Enthält alle Variationen, Pluralformen, Übersetzungen.

## Dateistruktur

```
config/
├── keywords.csv                      # USER EDITS - Basis-Keywords
├── translations-dictionary.json      # Statisches EN↔DE Wörterbuch
└── README.md                         # Dokumentation

scripts/
├── generate-keywords.js              # Haupt-Script (Orchestrator)
├── lib/
│   ├── csvParser.js                  # CSV parsen & validieren
│   ├── variationGenerator.js         # Plural/Hyphen/Compound generieren
│   ├── translationService.js         # Wörterbuch-basierte Übersetzung
│   └── relevanceJsonBuilder.js       # relevance.json konstruieren
└── validate-keywords.js              # CSV-Validierung

src/relevance/config/
└── relevance.json                    # AUTO-GENERATED (nicht manuell editieren!)
```

## Implementierungs-Schritte

### Phase 1: Setup ✅ DONE
- [x] Worktree erstellt: `worktree/csv-keyword-management`
- [x] Template-CSV erstellt: `config/keywords.csv`
- [x] Wörterbuch erstellt: `config/translations-dictionary.json`
- [x] Dokumentation: `config/README.md`

### Phase 2: Core Libraries

#### 2.1 CSV Parser (`scripts/lib/csvParser.js`)

**Aufgaben:**
- CSV-Datei laden und parsen
- Validierung:
  - Duplikate erkennen
  - Gültige Tiers (1, 2, 3)
  - Gültige Sprachen (en, de)
  - Keine leeren Keywords
- Output: Array von Keyword-Objekten

**Interface:**
```javascript
// Input: CSV-Dateiinhalt
// Output:
[
  { keyword: "autonomous delivery", tier: 1, language: "en", notes: "..." },
  { keyword: "retail technology", tier: 2, language: "en", notes: "..." }
]
```

**Fehlerbehandlung:**
```javascript
// Duplikate
throw new Error("Duplicate keyword 'retail innovation' in rows 5 and 12");

// Ungültiger Tier
throw new Error("Invalid tier '4' for keyword 'delivery robots' (must be 1, 2, or 3)");
```

#### 2.2 Variation Generator (`scripts/lib/variationGenerator.js`)

**Aufgaben:**
- Automatische Plural/Singular-Generierung
- Automatische Bindestrich-Variationen
- Automatische Compound-Word-Variationen

**WICHTIG:** Logik aus bestehendem `src/utils/keywordMatcher.js` (lines 230-277) extrahieren und wiederverwenden!

**Beispiel:**
```javascript
generateVariations("last mile delivery", "en")
// Returns:
[
  "last mile delivery",
  "last-mile delivery",
  "lastmile delivery",
  "last mile deliveries",
  "last-mile deliveries",
  "lastmile deliveries"
]
```

**Algorithmen:**

1. **Plural/Singular** (lines 230-260 in keywordMatcher.js):
   - `robot` → `robots`
   - `delivery` → `deliveries`
   - `robots` → `robot`

2. **Hyphen** (lines 265-277):
   - `last mile` → `last-mile`, `lastmile`
   - `e-commerce` → `e commerce`, `ecommerce`

3. **Compound**:
   - `e-grocery` → `egrocery`, `e grocery`

#### 2.3 Translation Service (`scripts/lib/translationService.js`)

**WICHTIG: Keine API! Statisches Wörterbuch verwenden.**

**Aufgaben:**
- Wörterbuch laden: `config/translations-dictionary.json`
- Wort-für-Wort Übersetzung
- Falls Wort nicht im Wörterbuch → Original beibehalten

**Beispiel:**
```javascript
translate("autonomous delivery", "en", "de")
// Returns: ["autonome lieferung", "autonome zustellung", "selbstfahrende lieferung"]
```

**Strategie:**
1. Keyword in Wörter splitten
2. Jedes Wort im Wörterbuch nachschlagen
3. Kombinationen bilden
4. Falls Wort fehlt → Original-Wort verwenden

#### 2.4 relevance.json Builder (`scripts/lib/relevanceJsonBuilder.js`)

**Aufgaben:**
- Bestehende `src/relevance/config/relevance.json` laden
- Nur `keywords`-Sektion ersetzen
- Andere Sektionen bewahren: `scoring`, `filtering`, `sources`
- Neue `relevance.json` schreiben

**Struktur:**
```javascript
{
  "scoring": { ... },           // PRESERVE (nicht ändern)
  "filtering": { ... },         // PRESERVE
  "keywords": {                 // REPLACE (neu generieren)
    "tier1": [...],
    "tier2": [...],
    "tier3": [...],
    "variations": { ... },
    "synonyms": {
      "en-de": { ... }
    },
    "matchingOptions": { ... }
  },
  "sources": { ... }            // PRESERVE
}
```

### Phase 3: Main Script

#### 3.1 Generate Keywords (`scripts/generate-keywords.js`)

**Pipeline:**
```
1. CSV laden & parsen (csvParser)
   ↓
2. Validieren
   ↓
3. Variationen generieren (variationGenerator)
   ↓
4. Übersetzungen generieren (translationService)
   ↓
5. relevance.json bauen (relevanceJsonBuilder)
   ↓
6. Datei schreiben
   ↓
7. Statistiken ausgeben
```

**CLI-Flags:**
- `--dry-run`: Preview, keine Datei-Änderungen
- `--verbose`: Detaillierte Logs

**Output-Beispiel:**
```
✓ Loaded 19 keywords from config/keywords.csv
✓ Validation passed
✓ Generated 156 variations (plural, hyphen, compound)
✓ Generated 48 translations from dictionary
✓ Built relevance.json with:
  - Tier 1: 6 keywords → 52 variations
  - Tier 2: 7 keywords → 78 variations
  - Tier 3: 6 keywords → 26 variations
✓ Written to src/relevance/config/relevance.json
```

#### 3.2 Validate Keywords (`scripts/validate-keywords.js`)

**Nur Validierung, keine Generierung:**
- CSV-Syntax prüfen
- Duplikate finden
- Gültige Tiers/Sprachen
- Exit-Code 0 (OK) oder 1 (Fehler)

### Phase 4: Integration

#### 4.1 package.json Scripts

```json
{
  "scripts": {
    "generate-keywords": "node scripts/generate-keywords.js",
    "generate-keywords:dry-run": "node scripts/generate-keywords.js --dry-run",
    "validate-keywords": "node scripts/validate-keywords.js",
    "prestart": "npm run generate-keywords"
  }
}
```

**`prestart` Hook:**
- Läuft automatisch vor `npm start`
- Regeneriert Keywords falls CSV geändert wurde
- Schnell wenn keine Änderungen (~100ms)

### Phase 5: Testing

#### 5.1 Unit Tests

Erstelle: `test-keyword-generation.js`

**Tests:**
- CSV-Parser: Gültig/ungültig CSVs
- Variation-Generator: Plural, Hyphen, Compound
- Translation-Service: Wörterbuch-Lookup
- JSON-Builder: Struktur-Validierung

#### 5.2 Integration Test

**End-to-End:**
```bash
# 1. CSV ändern
echo "test keyword,2,en,Test" >> config/keywords.csv

# 2. Generieren
npm run generate-keywords

# 3. Testen dass KeywordMatcher funktioniert
npm test
```

### Phase 6: Migration

#### 6.1 Migration Script

Erstelle: `scripts/migrate-to-csv.js`

**Aufgabe:**
- Bestehende `relevance.json` lesen
- Tier1/2/3 Keywords extrahieren
- In CSV schreiben

**Usage:**
```bash
node scripts/migrate-to-csv.js
# Creates: config/keywords.csv (from existing relevance.json)
```

### Phase 7: Documentation

#### 7.1 README.md Update

Sektion hinzufügen:

```markdown
## Keyword Management

Keywords are managed via `config/keywords.csv`.

### Adding Keywords

1. Edit `config/keywords.csv`
2. Run `npm run generate-keywords`
3. Test: `npm test`

### CSV Format

- keyword: Base keyword
- tier: 1 (high), 2 (medium), 3 (context)
- language: en or de
- notes: Optional description
```

## Workflow für Entwickler

### Erstmaliges Setup

```bash
cd worktree/csv-keyword-management

# CSV anpassen (bereits Template vorhanden)
nano config/keywords.csv

# Erste Generierung
npm run generate-keywords

# Testen
npm test
```

### Development Loop

```bash
# 1. CSV editieren
nano config/keywords.csv

# 2. Dry-run (Preview)
npm run generate-keywords:dry-run

# 3. Generieren
npm run generate-keywords

# 4. Testen
npm test

# 5. Committen
git add config/ src/relevance/config/relevance.json scripts/
git commit -m "feat: CSV-based keyword management"
```

## Integration mit bestehendem System

### Keine Code-Änderungen!

Das bestehende System bleibt **vollständig unverändert**:
- `src/utils/keywordMatcher.js` - Keine Änderungen
- `src/relevance/scorers/ThematicScorer.js` - Keine Änderungen
- `src/relevance/RelevanceEngine.js` - Keine Änderungen

### Datenfluss

```
CSV (User editiert)
    ↓
generate-keywords.js (vor Start)
    ↓
relevance.json (auto-generiert)
    ↓
RelevanceEngine → ThematicScorer → KeywordMatcher (unverändert)
    ↓
Artikel-Matching (Laufzeit)
```

## Technische Details

### Dependencies

**Neu hinzufügen:**
Keine! Nur Node.js Standard-Library:
- `fs` - Datei-Operationen
- `path` - Pfad-Operationen
- `csv-parser` - Optional, oder manuell parsen

### Dateien die NICHT geändert werden

- `src/utils/keywordMatcher.js` - Bleibt unverändert
- `src/relevance/scorers/*.js` - Bleiben unverändert
- `src/relevance/RelevanceEngine.js` - Bleibt unverändert
- `src/newsService.js` - Bleibt unverändert

### Dateien die AUTO-GENERIERT werden

- `src/relevance/config/relevance.json` - Wird überschrieben
  - **WICHTIG:** Nicht manuell editieren!
  - Wird bei jedem `npm start` neu generiert

## Checkliste

### Implementierung

- [ ] `scripts/lib/csvParser.js` implementieren
- [ ] `scripts/lib/variationGenerator.js` implementieren
- [ ] `scripts/lib/translationService.js` implementieren
- [ ] `scripts/lib/relevanceJsonBuilder.js` implementieren
- [ ] `scripts/generate-keywords.js` implementieren
- [ ] `scripts/validate-keywords.js` implementieren
- [ ] `scripts/migrate-to-csv.js` implementieren

### Testing

- [ ] Unit-Tests für alle Lib-Module
- [ ] Integration-Test: CSV → relevance.json
- [ ] Kompatibilitäts-Test: KeywordMatcher funktioniert
- [ ] End-to-End Test: Artikel-Matching funktioniert

### Integration

- [ ] package.json Scripts hinzufügen
- [ ] `prestart` Hook aktivieren
- [ ] Migration durchführen
- [ ] README.md aktualisieren

### Validation

- [ ] Bestehende relevance.json → CSV migrieren
- [ ] Neu generieren und Äquivalenz prüfen
- [ ] Alle bestehenden Tests laufen durch
- [ ] Slack-Bot funktioniert wie vorher

## Erfolgs-Kriterien

✅ **Einfachheit:** CSV-Datei ist leicht zu editieren
✅ **Automatisierung:** Variationen werden automatisch generiert
✅ **Kompatibilität:** Bestehendes System funktioniert unverändert
✅ **Keine Abhängigkeiten:** Keine neuen npm-Packages erforderlich
✅ **Offline:** Keine API-Calls, komplett offline
✅ **Performance:** Generierung dauert < 5 Sekunden

## Hilfe & Debugging

### Logs aktivieren

```bash
npm run generate-keywords --verbose
```

### Dry-run (keine Änderungen)

```bash
npm run generate-keywords:dry-run
```

### Nur validieren

```bash
npm run validate-keywords
```

### Bestehende relevance.json vergleichen

```bash
# Backup erstellen
cp src/relevance/config/relevance.json src/relevance/config/relevance.json.backup

# Neu generieren
npm run generate-keywords

# Vergleichen
diff src/relevance/config/relevance.json.backup src/relevance/config/relevance.json
```

## Referenzen

### Wichtige Dateien zum Lesen

1. `src/utils/keywordMatcher.js` (lines 230-277) - Variations-Logik
2. `src/relevance/config/relevance.json` - Ziel-Struktur
3. `src/relevance/scorers/ThematicScorer.js` (lines 20-29) - Tier-System
4. `src/relevance/RelevanceEngine.js` (lines 29-35) - Config-Loading

### Plan-Datei

Vollständiger Plan: `/.claude/plans/fizzy-inventing-harbor.md`

---

**Start implementing in this worktree!**
Branch: `csv-keyword-management`
