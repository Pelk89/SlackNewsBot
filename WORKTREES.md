# Git Worktrees - Feature Development

Dieses Projekt nutzt Git Worktrees für parallele Feature-Entwicklung. Jedes Feature hat seinen eigenen Worktree mit eigenem Branch.

## 🤖 Projektkoordinator (AI Agent)

Das Projekt hat einen **AI Projektkoordinator** (Claude), der die Worktree-Verwaltung übernimmt. Die Rollenbeschreibung findest du in `.claude/PROJECT_COORDINATOR_ROLE.md`.

**Aktivierung**: Erwähne `@coordinator` oder frage nach dem "Status der Features"

**Hauptaufgaben**:
- 📊 Status-Überwachung aller Feature-Worktrees
- 🔀 Koordiniertes Mergen von Features in main
- 🔄 Synchronisation aller Features mit main
- 🧹 Cleanup nach erfolgreichem Merge

**Beispiele**:
```
"@coordinator status"                    # Zeige Status aller Features
"@coordinator merge improvements"        # Merge ein spezifisches Feature
"@coordinator sync alle features"        # Synchronisiere alle mit main
"Merge alles was bereit ist"            # Batch-Merge
```

## 📁 Worktree-Struktur

```
NewsBotSlack/                           # Main worktree (Branch: main)
└── worktree/
    ├── improvements/                   # Branch: feature/improvements
    ├── error-handling/                 # Branch: feature/error-handling
    ├── multi-channel/                  # Branch: feature/multi-channel
    └── news-sources/                   # Branch: feature/news-sources
```

## 🎯 Feature-Beschreibungen

### 1. **feature/improvements** (`worktree/improvements/`)
Implementierung der Verbesserungen aus `Improvements.md`:
- Performance-Optimierungen
- Code-Refactoring
- Bestehende Feature-Verbesserungen

### 2. **feature/error-handling** (`worktree/error-handling/`)
Erweitertes Error Handling & Logging:
- Strukturiertes Logging (Winston/Pino)
- Error Notifications
- Retry-Mechanismen
- Monitoring & Alerting

### 3. **feature/multi-channel** (`worktree/multi-channel/`)
Multi-Channel Support für Slack:
- Mehrere Webhooks/Channels konfigurieren
- Channel-spezifische Keywords
- Unterschiedliche Zeitpläne pro Channel

### 4. **feature/news-sources** (`worktree/news-sources/`)
Erweiterte News-Quellen:
- NewsAPI Integration
- Spezifische RSS Feeds (RetailDive, TechCrunch)
- Multiple Quellen aggregieren
- News-Scoring & Relevanz-Ranking

## 🚀 Verwendung

### Worktree-Liste anzeigen
```bash
git worktree list
```

### In einem Worktree arbeiten
```bash
# Wechsle zum Worktree-Verzeichnis
cd worktree/improvements

# Normales Git-Arbeiten
git status
git add .
git commit -m "Add improvements"
```

### Neues Worktree erstellen
```bash
git worktree add worktree/feature-name -b feature/feature-name
```

### Worktree entfernen
```bash
# Erst das Verzeichnis löschen
rm -rf worktree/feature-name

# Dann den Worktree aufräumen
git worktree prune
```

### Änderungen ins Main mergen
```bash
# Im Hauptverzeichnis
git checkout main
git merge feature/improvements
```

## 📝 Workflow-Empfehlung

### 1. Feature entwickeln
```bash
cd worktree/improvements
# Entwickle dein Feature
git add .
git commit -m "Implement feature X"
git push -u origin feature/improvements
```

### 2. Pull Request erstellen (optional)
- Erstelle PR von `feature/improvements` nach `main`
- Code Review durchführen
- Nach Approval mergen

### 3. Lokales Merge
```bash
cd /Users/A1CA160/Documents/develop/NewsBotSlack
git checkout main
git merge feature/improvements
git push
```

### 4. Feature-Branch aufräumen (nach Merge)
```bash
# Worktree entfernen
git worktree remove worktree/improvements

# Branch löschen (lokal)
git branch -d feature/improvements

# Branch löschen (remote, falls gepusht)
git push origin --delete feature/improvements
```

## ⚙️ Vorteile von Worktrees

✅ **Paralleles Arbeiten**: Mehrere Features gleichzeitig entwickeln ohne Branch-Wechsel
✅ **Keine Konflikte**: Jeder Worktree hat eigenen Working Directory
✅ **Schnelles Testen**: Zwischen Features wechseln ohne Stashing
✅ **CI/CD freundlich**: Builds in verschiedenen Worktrees parallel
✅ **Agent-freundlich**: Verschiedene AI Agents können in verschiedenen Worktrees arbeiten

## 🛠️ Nützliche Befehle

```bash
# Status aller Worktrees
git worktree list

# Details zu einem Worktree
git worktree list --porcelain

# Verwaiste Worktrees aufräumen
git worktree prune

# Worktree sperren (vor versehentlichem Löschen schützen)
git worktree lock worktree/improvements

# Worktree entsperren
git worktree unlock worktree/improvements

# Worktree reparieren (falls verschoben)
git worktree repair
```

## 📋 Best Practices

1. **Ein Feature = Ein Worktree**: Halte Worktrees fokussiert auf ein spezifisches Feature
2. **Regelmäßig committen**: Committe häufig in deinem Feature-Branch
3. **Main aktuell halten**: Merge regelmäßig `main` in deine Feature-Branches
4. **Aufräumen**: Lösche Worktrees nach erfolgreichem Merge
5. **Naming Convention**: Nutze `feature/`, `bugfix/`, `refactor/` Präfixe

## 🔄 Sync zwischen Branches

```bash
# In deinem Feature-Worktree
cd worktree/improvements

# Hole neueste Änderungen von main
git fetch origin
git merge origin/main

# Oder mit Rebase (für saubere History)
git rebase origin/main
```

## 🆘 Troubleshooting

**Problem**: Worktree kann nicht gelöscht werden
```bash
git worktree unlock worktree/name
git worktree remove worktree/name --force
```

**Problem**: "already checked out" Fehler
```bash
# Ein Branch kann nur in einem Worktree gleichzeitig ausgecheckt sein
# Wechsle den Branch im anderen Worktree oder nutze einen neuen Branch
```

**Problem**: Änderungen zwischen Worktrees teilen
```bash
# Committe im ersten Worktree
cd worktree/feature-a
git commit -am "Changes"

# Im zweiten Worktree
cd ../feature-b
git fetch  # Lokale Branches sind automatisch verfügbar
git merge feature/feature-a  # Falls du die Änderungen mergen willst
```

---

**Happy Feature Development! 🚀**
