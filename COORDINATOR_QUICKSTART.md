# 🤖 Projektkoordinator - Schnellstart

Der AI Projektkoordinator (Claude) übernimmt die Verwaltung der Git Worktrees und koordiniert Merges.

## ⚡ Schnellstart

### 1. Koordinator aktivieren

Erwähne einfach `@coordinator` oder stelle eine Frage zu den Features:

```
"@coordinator status"
"Status der Features?"
"Was ist bereit zum Mergen?"
```

### 2. Status prüfen

Der Koordinator zeigt dir automatisch:
- ✅ Welche Features merge-bereit sind
- 🚧 Welche Features in Entwicklung sind
- ⚠️ Welche Features Probleme haben
- 💡 Konkrete Handlungsempfehlungen

### 3. Features mergen

```
"@coordinator merge improvements"
"Merge feature error-handling"
"Merge alles was bereit ist"
```

### 4. Features synchronisieren

```
"@coordinator sync alle features"
"Sync news-sources mit main"
```

### 5. Cleanup

```
"@coordinator cleanup"
"Räume gemergede Features auf"
```

## 📋 Typischer Workflow

### Morgens: Status-Check

```
You: "@coordinator status"

Coordinator:
📊 PROJEKT STATUS

✅ MERGE-BEREIT:
  • feature/improvements (5 commits, clean)
  • feature/error-handling (3 commits, clean)

🚧 IN ENTWICKLUNG:
  • feature/multi-channel (2 commits, uncommitted changes)

⚠️ ACHTUNG:
  • feature/news-sources ist 4 commits behind main

💡 EMPFEHLUNG:
  1. Merge improvements & error-handling
  2. Sync news-sources mit main
```

### Feature mergen

```
You: "Merge improvements"

Coordinator:
🔀 MERGE FEATURE: improvements

→ Prüfe Feature-Status...
  ✓ Worktree ist clean
  ✓ 5 neue Commits vorhanden
  ✓ Keine Konflikte

→ Wechsle zu main branch...
→ Hole neueste Änderungen...
→ Merge feature/improvements in main...

✓ Merge erfolgreich!

📊 STATISTIK:
  12 Dateien geändert
  +240 Zeilen, -15 Zeilen

🎉 Feature erfolgreich gemerged!

Nächste Schritte:
- Cleanup von worktree/improvements? (ja/nein)
- Sync andere Features mit neuem main? (ja/nein)
```

### Batch-Merge

```
You: "Merge alles was bereit ist"

Coordinator:
🚀 MERGE ALL READY FEATURES

2 Feature(s) bereit:
  - improvements
  - error-handling

Alle Features mergen? (y/n): y

→ Merge improvements...
  ✓ Erfolgreich

→ Merge error-handling...
  ✓ Erfolgreich

🎉 Alle Features erfolgreich gemerged!
```

## 🎯 Nützliche Fragen

Der Koordinator versteht natürliche Sprache:

```
"Welche Features sind bereit?"
"Kann ich improvements mergen?"
"Sync alle Features"
"Was muss ich heute mergen?"
"Cleanup gemergede Branches"
"Ist news-sources aktuell?"
"Zeig mir den Status von error-handling"
```

## ⚠️ Bei Problemen

### Merge-Konflikte

```
Coordinator:
✗ Merge failed - Konflikte gefunden

Betroffene Dateien:
  - src/newsService.js
  - package.json

Bitte löse die Konflikte manuell:
  1. cd /path/to/project
  2. git status (zeigt Konfliktdateien)
  3. Öffne Dateien und löse Konflikte
  4. git add <dateien>
  5. git commit

Dann sage mir: "Merge fortsetzen"
```

### Uncommitted Changes

```
Coordinator:
⚠️ Worktree ist nicht clean

Uncommitted: 3 Dateien
Untracked: 2 Dateien

Optionen:
1. "Committe Changes erst" → Ich warte
2. "Force merge" → Ich merge trotzdem (nicht empfohlen)
3. "Stash changes" → Ich stashe zuerst

Was möchtest du tun?
```

## 🔧 Erweiterte Nutzung

### Spezifischen Status prüfen

```
"Status von improvements"
"Ist error-handling bereit?"
"Wie viele commits hat news-sources?"
```

### Squash Merge

```
"Merge improvements mit squash"
"Squash merge error-handling"
```

### Dry-Run

```
"Was würde passieren wenn ich improvements merge?"
"Zeig mir was in error-handling geändert wurde"
```

## 📚 Mehr Informationen

- **Vollständige Rollenbeschreibung**: `.claude/PROJECT_COORDINATOR_ROLE.md`
- **Worktree-Dokumentation**: `WORKTREES.md`
- **Agent-Konfiguration**: `.claude/README.md`

## 💡 Tipps

1. **Frag früh, frag oft**: Der Koordinator hilft dir den Überblick zu behalten
2. **Nutze natürliche Sprache**: Du musst keine exakten Befehle kennen
3. **Lass den Koordinator entscheiden**: Er kennt den Status aller Features
4. **Vertraue dem Koordinator**: Er prüft alles bevor er merged
5. **Sync regelmäßig**: Verhindert große Merge-Konflikte später

---

**Bereit? Aktiviere den Koordinator mit: `@coordinator status`** 🚀
