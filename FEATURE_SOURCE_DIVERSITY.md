# Feature: Source Diversity Improvements

**Branch**: `feature/source-diversity`
**Status**: 🚧 In Development  
**Priority**: 🔴 High (Quality Issue)
**Created**: 2025-11-21

---

## 🎯 Problem Statement

Fast alle 10 Artikel kommen von einer einzigen Quelle (z.B. "Retail Innovation Hub" via Google News).

**Aktuelles Verhalten**:
- 10 Artikel täglich
- ~9-10 Artikel von einer Quelle
- 0-1 Artikel von anderen Quellen  
- Keine Diversität trotz 19 aktivierter Quellen

**Desired Behavior**:
- 10 Artikel täglich
- Aus **mindestens 5-7 verschiedenen Quellen**
- Maximal 2-3 Artikel pro Quelle
- Bessere Themen- und Perspektiven-Diversität

---

## 🔍 Root Cause: maxPerSource = 15 (zu hoch)

**Location**: `src/config/sources.json:247`

**Current**:
```json
"diversification": {
  "maxPerSource": 15,
  "minSources": 2
}
```

**Problem**: Bei 10 Artikeln und maxPerSource:15 kann eine Quelle alle Plätze nehmen.

**Solution**: Reduziere auf 2-3 Artikel pro Quelle.

---

## 📋 Quick Fix (Phase 1)

- [ ] Reduce maxPerSource: 15 → 2
- [ ] Test source distribution  
- [ ] Verify 5+ sources in results

**Progress**: 0/3 Tasks

---

## 🎯 Success Criteria

- [ ] 10 Artikel täglich
- [ ] Aus mindestens **5 verschiedenen Quellen**
- [ ] Max 2 Artikel pro Quelle

