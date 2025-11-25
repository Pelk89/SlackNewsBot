# Keyword Configuration

## keywords.csv

Diese Datei enthält die Basis-Keywords für die News-Suche.

### Format

```csv
keyword,tier,language,notes
```

**Spalten:**
- `keyword`: Das Basis-Keyword (ohne Variationen)
- `tier`: Priorität (1 = hoch, 2 = mittel, 3 = niedrig)
  - Tier 1: 2.0x Gewicht - Kern-Themen
  - Tier 2: 1.0x Gewicht - Verwandte Themen
  - Tier 3: 0.5x Gewicht - Kontext-Keywords
- `language`: Sprache (`en` oder `de`)
- `notes`: Optional - Beschreibung für Dokumentation

### Beispiel

```csv
autonomous delivery,1,en,Core topic - autonomous delivery systems
Lieferroboter,1,de,German keyword for delivery robots
retail technology,2,en,General retail technology
```

### Automatische Generierung

Das System generiert automatisch:
- **Plural/Singular**: robot ↔ robots, delivery ↔ deliveries
- **Bindestrich-Variationen**: last mile ↔ last-mile ↔ lastmile
- **Übersetzungen**: Aus translations-dictionary.json

### Workflow

1. Keywords in `keywords.csv` hinzufügen/ändern
2. `npm run generate-keywords` ausführen
3. System generiert automatisch `relevance.json` mit allen Variationen

## translations-dictionary.json

Statisches Wörterbuch für EN ↔ DE Übersetzungen.

### Erweiterung

Um neue Übersetzungen hinzuzufügen:

```json
{
  "en-to-de": {
    "neues wort": ["übersetzung1", "übersetzung2"]
  }
}
```

### Hinweise

- Wort-für-Wort Übersetzung
- Falls Wort nicht im Wörterbuch → bleibt Original
- Keine API-Kosten, komplett offline
