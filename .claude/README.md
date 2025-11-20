# Claude AI Agent Konfiguration

Dieses Verzeichnis enthält Rollenbeschreibungen und Konfigurationen für AI Agents (Claude), die spezifische Aufgaben im Projekt übernehmen.

## 📋 Verfügbare Rollen

### 🤖 Projektkoordinator

**Datei**: `PROJECT_COORDINATOR_ROLE.md`

**Zweck**: Koordiniert die parallele Feature-Entwicklung in Git Worktrees und managed Merges in den main Branch.

**Aktivierung**:
- Erwähne `@coordinator` im Chat
- Frage nach "Status der Features"
- Sage "Merge Feature X"
- Frage "Was ist bereit zum Mergen?"

**Verantwortlichkeiten**:
1. **Status-Überwachung**: Prüft regelmäßig den Status aller Feature-Worktrees
2. **Merge-Management**: Führt koordinierte Merges in main durch
3. **Synchronisation**: Hält alle Features mit main synchron
4. **Cleanup**: Räumt gemergede Features auf
5. **Reporting**: Gibt klare, strukturierte Status-Reports

**Beispiel-Interaktionen**:

```
User: "@coordinator status"

Koordinator:
📊 PROJEKT STATUS

✅ MERGE-BEREIT:
  • feature/improvements (5 commits, clean)

🚧 IN ENTWICKLUNG:
  • feature/error-handling (2 commits, uncommitted changes)

💡 EMPFEHLUNG: Merge improvements jetzt?
```

```
User: "Merge improvements"

Koordinator:
[Prüft Status]
[Führt Merge durch]
✓ Feature improvements erfolgreich gemerged!
5 commits, 12 Dateien geändert

Nächste Schritte:
- Cleanup von worktree/improvements?
- Sync andere Features mit neuem main?
```

## 🎯 Wie man eine neue Rolle hinzufügt

1. Erstelle eine neue `.md` Datei in diesem Verzeichnis
2. Definiere die Rolle klar:
   - **Identität**: Wer ist der Agent?
   - **Verantwortung**: Was sind die Hauptaufgaben?
   - **Workflows**: Wie soll der Agent arbeiten?
   - **Kommunikation**: Wie soll der Agent kommunizieren?
   - **Kommandos**: Welche Tools/Befehle nutzt der Agent?

3. Füge Aktivierungs-Trigger hinzu (z.B. `@rolename`)
4. Dokumentiere in dieser README

## 📖 Best Practices für Rollenbeschreibungen

### ✅ Gute Rollenbeschreibung

- **Klar definierte Verantwortlichkeiten**: Agent weiß genau was zu tun ist
- **Konkrete Workflows**: Schritt-für-Schritt Anleitungen
- **Beispiele**: Zeige konkrete Interaktionen
- **Kommandos**: Liste alle relevanten Git/Shell Befehle
- **Kommunikationsstil**: Definiere wie der Agent antwortet
- **Eskalations-Regeln**: Wann soll User gefragt werden?

### ❌ Schlechte Rollenbeschreibung

- Vage Aufgabenbeschreibung
- Keine konkreten Workflows
- Keine Beispiele
- Fehlende Tool-Kommandos
- Unklare Verantwortlichkeiten

## 🔄 Workflow: Agent als Koordinator nutzen

### Tägliche Entwicklung

```bash
# 1. Starte deinen Tag
User: "@coordinator status"
→ Bekomme Übersicht über alle Features

# 2. Arbeite in einem Worktree
cd worktree/improvements
# ... entwickle ...
git commit -m "Add feature X"

# 3. Prüfe ob bereit zum Mergen
User: "@coordinator ist improvements bereit?"
→ Bekomme Status-Check

# 4. Merge wenn bereit
User: "@coordinator merge improvements"
→ Koordinator führt Merge durch

# 5. Synchronisiere andere Features
User: "@coordinator sync alle"
→ Alle Features werden mit main gesynct
```

### Batch-Operationen

```bash
# Merge alle bereiten Features auf einmal
User: "Merge alles was bereit ist"
→ Koordinator identifiziert und merged alle

# Synchronisiere alles
User: "@coordinator sync alle features"
→ Alle Features werden aktualisiert

# Cleanup
User: "@coordinator cleanup"
→ Gemergede Features werden aufgeräumt
```

## 🛠️ Entwicklung mit mehreren Agents

Du kannst mehrere Agents gleichzeitig nutzen:

```
Terminal 1: Feature Developer Agent
- Arbeitet in worktree/improvements
- Entwickelt neue Features

Terminal 2: Code Reviewer Agent
- Reviewed Code in worktree/error-handling
- Gibt Feedback

Terminal 3: Projektkoordinator
- Überwacht alle Worktrees
- Merged bereite Features
- Hält alles synchron
```

## 📝 Rollenbeschreibung Template

Nutze dieses Template für neue Rollen:

```markdown
# Rolle: [Rollenname]

## Identität & Verantwortung
[Wer ist der Agent? Was ist die Hauptaufgabe?]

## Projekt-Kontext
[Relevante Projekt-Informationen]

## Hauptaufgaben
1. [Aufgabe 1]
2. [Aufgabe 2]
...

## Workflows

### Workflow 1: [Name]
[Schritt-für-Schritt Anleitung]

## Kommunikationsrichtlinien
[Wie soll der Agent kommunizieren?]

## Kommandos-Referenz
[Relevante Shell/Git Befehle]

## Eskalation
[Wann User fragen?]

## Initialisierung
[Was passiert bei Aktivierung?]
```

## 🔐 Sicherheitshinweise

- Agents sollten NIEMALS destruktive Befehle ohne Bestätigung ausführen
- Bei Konflikten oder Problemen: Immer User informieren
- Keine Force-Pushes ohne explizite Anfrage
- Keine Branch-Löschungen ohne Bestätigung

## 📚 Weitere Ressourcen

- **Git Worktrees Docs**: `../WORKTREES.md`
- **Projekt README**: `../README.md`
- **Improvements**: `../Improvements.md`

---

**Happy Coordinating! 🚀**
