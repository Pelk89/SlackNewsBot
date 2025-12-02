# Claude Code Workflow Template

## Übersicht

Dieses Template beschreibt den optimalen Workflow für die Zusammenarbeit mit Claude Code bei Feature-Entwicklung und Code-Änderungen.

## Projekt-Setup

### Voraussetzungen

- Git-Repository initialisiert
- `.env` Datei für Environment-Variablen
- `README.md` mit Projekt-Beschreibung

### Empfohlene Projekt-Struktur

```
project/
├── .env                          # Environment-Variablen (nicht committen)
├── .env.example                  # Template für .env
├── .gitignore                    # Git-Ignore-Regeln
├── README.md                     # Projekt-Dokumentation
├── package.json                  # Dependencies & Scripts
├── src/                          # Source Code
├── config/                       # Konfigurationsdateien
├── scripts/                      # Utility-Scripts
├── test/                         # Tests
├── worktree/                     # Git Worktrees (nicht committen)
└── CLAUDE_WORKFLOW.md            # Diese Datei (Workflow-Referenz)
```

## Workflow: Neues Feature entwickeln

### Phase 1: Planning (Plan Mode)

**Claude startet im Plan Mode.**

#### 1.1 Problem verstehen

Claude liest:
- `README.md` - Projekt-Übersicht
- Relevante Source-Dateien
- Bestehende Konfiguration

Claude fragt:
- Klärungsfragen zum Feature
- Trade-offs und Entscheidungen
- User-Präferenzen

#### 1.2 Exploration

Claude startet **Explore Agents** (parallel):
- Agent 1: Bestehende Implementierungen finden
- Agent 2: Relevante Komponenten explorieren
- Agent 3: Test-Patterns analysieren

**Wichtig:** Claude nutzt Task tool mit `subagent_type=Explore` für Code-Exploration.

#### 1.3 Plan erstellen

Claude erstellt Plan-Datei:
- Lokation: `~/.claude/plans/[plan-id].md`
- Inhalt:
  - Zielsetzung
  - Architektur-Entscheidungen
  - Implementierungs-Schritte
  - Kritische Dateien
  - Testing-Strategie

#### 1.4 Plan-Freigabe

User reviewed Plan → Claude ruft `ExitPlanMode` auf.

---

### Phase 2: Implementation (Execution Mode)

Nach Plan-Freigabe: User startet Execution Mode.

#### 2.1 Worktree erstellen

**Claude erstellt Git-Worktree:**

```bash
git worktree add worktree/[feature-name] -b [feature-name]
```

**Vorteile:**
- Isolierte Entwicklung
- Haupt-Branch bleibt sauber
- Paralleles Arbeiten möglich
- Einfaches Aufräumen bei Abbruch

**Naming Convention:**
- Branch: `feature-name` (kebab-case)
- Worktree-Pfad: `worktree/feature-name`

#### 2.2 Feature-Dokumentation

**Claude erstellt `FEATURE.md` im Worktree:**

```
worktree/[feature-name]/FEATURE.md
```

**Inhalt:**
- Ziel & Problem-Beschreibung
- Lösungsansatz
- Dateistruktur
- Implementierungs-Schritte mit Checkliste
- Workflow für Entwickler
- Testing-Strategie
- Technische Details
- Referenzen zu wichtigen Dateien

**Zweck:**
- Arbeiten in anderem Terminal möglich
- Dokumentation für Team
- Nachvollziehbarkeit

#### 2.3 Template-Dateien erstellen

**Claude erstellt notwendige Template/Config-Dateien:**

Beispiele:
- CSV-Templates
- JSON-Configs
- README-Dateien für neue Verzeichnisse
- Script-Skeletons

**Wichtig:** Nur Templates, keine vollständige Implementierung (User will mitarbeiten).

#### 2.4 Implementation

Claude implementiert Feature in Worktree nach Plan.

**Best Practices:**
- Klein anfangen, iterativ erweitern
- Tests parallel schreiben
- Regelmäßig committen
- Code-Kommentare wo nötig

---

### Phase 3: Testing & Validation

#### 3.1 Unit-Tests

```bash
cd worktree/[feature-name]
npm test
```

#### 3.2 Integration-Tests

End-to-End Tests durchführen.

#### 3.3 Validation

- Funktionalität testen
- Performance prüfen
- Edge-Cases abdecken

---

### Phase 4: Merge & Cleanup

#### 4.1 Review

User reviewed Code im Worktree.

#### 4.2 Merge

```bash
# Im Haupt-Verzeichnis
git checkout main
git merge [feature-name]
```

#### 4.3 Worktree entfernen

```bash
git worktree remove worktree/[feature-name]
git branch -d [feature-name]
```

Oder behalten für weitere Entwicklung.

---

## Claude-Anweisungen

### Wenn User dieses Template referenziert

**User sagt:** "Folge dem Claude Workflow Template" oder verweist auf diese Datei.

**Claude-Verhalten:**

1. **Plan Mode aktivieren**
   - Problem/Feature verstehen
   - Explore Agents starten (parallel)
   - Klärungsfragen stellen
   - Plan erstellen in `~/.claude/plans/`
   - `ExitPlanMode` nach User-Approval

2. **Nach Plan-Approval: Worktree Setup**
   ```bash
   git worktree add worktree/[feature-name] -b [feature-name]
   ```

3. **FEATURE.md erstellen**
   - Vollständige Feature-Dokumentation
   - Implementierungs-Checkliste
   - Technische Details
   - Workflow-Anleitung

4. **Template-Dateien erstellen**
   - Nur Templates/Configs
   - User soll mitarbeiten können

5. **Nicht in Main-Branch arbeiten**
   - Alle Änderungen nur im Worktree
   - Main-Branch bleibt unberührt

6. **User informieren**
   ```
   Worktree erstellt: worktree/[feature-name]
   Branch: [feature-name]
   Dokumentation: FEATURE.md

   Sie können jetzt parallel arbeiten:
   cd worktree/[feature-name]
   ```

---

## Kommunikations-Pattern

### Claude → User

**Bei Unklarheiten:**
- AskUserQuestion tool nutzen
- Konkrete Optionen anbieten (nicht zu viele)
- Trade-offs erklären

**Bei Fortschritt:**
- Klare Status-Updates
- Checklisten aktualisieren
- Nächste Schritte kommunizieren

**Bei Problemen:**
- Problem klar beschreiben
- Lösungsvorschläge anbieten
- User um Input bitten

### User → Claude

**Feature-Anfrage:**
```
"Ich möchte Feature X implementieren"
→ Claude startet Plan Mode
```

**Workflow aktivieren:**
```
"Folge dem Claude Workflow Template"
→ Claude arbeitet nach diesem Template
```

**Plan-Approval:**
```
"Plan approved" oder "OK, implementiere"
→ Claude verlässt Plan Mode, startet Implementation
```

---

## Worktree-Strategie

### Wann Worktree erstellen?

✅ **JA - Worktree erstellen:**
- Neues Feature entwickeln
- Breaking Changes
- Experimentelle Änderungen
- Größere Refactorings
- Parallel an mehreren Features arbeiten

❌ **NEIN - Kein Worktree:**
- Kleine Bug-Fixes (direkt in Main)
- Typo-Korrekturen
- Dokumentations-Updates
- Triviale Änderungen

### Worktree-Organisation

```
worktree/
├── feature-a/               # Feature A in Entwicklung
├── feature-b/               # Feature B in Entwicklung
├── bugfix-123/              # Bugfix isoliert testen
└── experiment-xyz/          # Experiment (kann verworfen werden)
```

### Cleanup-Strategie

**Nach Merge:**
```bash
git worktree remove worktree/[name]
git branch -d [name]
```

**Bei Abbruch:**
```bash
git worktree remove worktree/[name] --force
git branch -D [name]  # Force delete
```

**Alle Worktrees auflisten:**
```bash
git worktree list
```

---

## Tool-Nutzung für Claude

### Plan Mode

- **Explore**: `Task tool` mit `subagent_type=Explore`
- **Plan**: `Task tool` mit `subagent_type=Plan`
- **Fragen**: `AskUserQuestion`
- **Plan-Datei**: `Write` nach `~/.claude/plans/[id].md`
- **Beenden**: `ExitPlanMode`

### Execution Mode

- **Worktree**: `Bash` tool für `git worktree add`
- **Dateien**: `Write`, `Edit`, `Read` (nur im Worktree!)
- **Tests**: `Bash` tool für `npm test`, etc.
- **Status**: TodoWrite für Fortschritt

### Wichtige Regeln

❌ **NICHT in Plan Mode:**
- Code implementieren
- Dateien ändern (außer Plan-Datei)
- Commits erstellen
- Non-readonly Tools (außer Plan-Datei)

✅ **NUR in Execution Mode:**
- Code schreiben
- Dateien ändern
- Tests ausführen
- Commits erstellen

---

## Best Practices

### Für Claude

1. **Immer zuerst planen** (außer triviale Tasks)
2. **Parallel explorieren** (mehrere Explore Agents)
3. **User einbeziehen** (Fragen stellen, nicht raten)
4. **Worktrees nutzen** (isolation ist gut)
5. **Dokumentieren** (FEATURE.md ist wichtig)
6. **Klein anfangen** (iterativ erweitern)
7. **Tests schreiben** (parallel zur Implementation)

### Für User

1. **Plan reviewen** vor Execution Mode
2. **Fragen beantworten** (Trade-offs entscheiden)
3. **Parallel arbeiten** (anderes Terminal nutzen)
4. **Regelmäßig testen** (nicht bis zum Ende warten)
5. **Feedback geben** (Claude lernt aus Feedback)

---

## Troubleshooting

### Problem: Claude arbeitet nicht im Worktree

**Lösung:**
```
"Arbeite im Worktree: worktree/[feature-name]"
```

### Problem: Plan Mode verlassen aber nichts passiert

**Lösung:**
```
"Starte Implementation gemäß Plan"
```

### Problem: Worktree existiert schon

**Lösung:**
```bash
git worktree remove worktree/[name]
# Dann neu erstellen
```

### Problem: Merge-Konflikte

**Lösung:**
```bash
cd worktree/[name]
git rebase main
# Konflikte lösen
```

---

## Beispiel-Session

### User startet

```
User: "Ich möchte CSV-basiertes Keyword-Management implementieren.
       Folge dem Claude Workflow Template."
```

### Claude Ablauf

1. **Plan Mode aktiviert**
   - Liest README.md, relevante Dateien
   - Startet 2 Explore Agents (parallel)
   - Stellt Klärungsfragen via AskUserQuestion
   - Erstellt Plan in ~/.claude/plans/xyz.md
   - Ruft ExitPlanMode auf

2. **User approved Plan**
   ```
   User: "Plan approved, implementiere"
   ```

3. **Worktree erstellen**
   ```bash
   git worktree add worktree/csv-keyword-management -b csv-keyword-management
   ```

4. **FEATURE.md erstellen**
   ```
   worktree/csv-keyword-management/FEATURE.md
   - Vollständige Dokumentation
   - Implementierungs-Checkliste
   - Code-Beispiele
   ```

5. **Templates erstellen**
   ```
   worktree/csv-keyword-management/config/keywords.csv
   worktree/csv-keyword-management/config/translations-dictionary.json
   worktree/csv-keyword-management/config/README.md
   ```

6. **User informieren**
   ```
   Claude: "Worktree erstellt: worktree/csv-keyword-management
            Branch: csv-keyword-management
            Dokumentation: FEATURE.md
            Templates: config/keywords.csv, config/translations-dictionary.json

            Sie können jetzt im anderen Terminal arbeiten:
            cd worktree/csv-keyword-management
            cat FEATURE.md"
   ```

7. **Implementation**
   - Claude implementiert gemäß Plan
   - User arbeitet parallel
   - Tests werden geschrieben
   - Regelmäßige Commits

8. **Testing & Merge**
   - Tests durchführen
   - User reviewed Code
   - Merge zu Main
   - Worktree cleanup (optional)

---

## Template-Dateien

### .gitignore Ergänzungen

```gitignore
# Claude Workflow
worktree/
.claude/

# Environment
.env
.env.local
```

### package.json Scripts

```json
{
  "scripts": {
    "test": "node test/run-tests.js",
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  }
}
```

---

## Zusammenfassung

**Dieser Workflow garantiert:**

✅ Strukturierte Planung vor Implementation
✅ Isolierte Feature-Entwicklung (Worktrees)
✅ Dokumentation für Team
✅ Paralleles Arbeiten möglich
✅ Sauberer Main-Branch
✅ Testbare Increments
✅ Klare Kommunikation
✅ Einfaches Cleanup

**Aktivierung:**

User sagt einfach: **"Folge dem Claude Workflow Template"**

Claude weiß dann genau:
1. Plan Mode starten
2. Explorieren & Fragen stellen
3. Plan erstellen & approval einholen
4. Worktree erstellen
5. FEATURE.md schreiben
6. Templates bereitstellen
7. Implementation starten

---

**Version:** 1.0
**Projekt:** NewsBot Slack (Referenz-Implementation)
**Datum:** 2025-11-25
