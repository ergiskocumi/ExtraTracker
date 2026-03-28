# Refactor Plan - Overview

> **Progetto:** extra-tracker
> **Data:** 2026-03-28
> **Obiettivo:** Ridurre codice, eliminare bug/errori logici/TS, allineare all'architettura CLAUDE.md

---

## Stato Attuale del Progetto

| Metrica | Valore |
|---|---|
| File `.tsx` | 256 |
| File `.ts` | 122 |
| File `.js` (server) | 103 |
| **Totale file** | **481** |
| Feature frontend | 6 (auth, dashboard, feedback, settings, study, tracker) |
| Controller backend | 14 |
| Servizi backend | 20+ |
| Repository backend | **Solo 2** (Exam, Folder) |
| File con `any` | 49 |
| `useEffect` usages | 167 in 94 file |
| `console.log` non strutturati (server) | ~25 |

---

## Problemi Critici Identificati

### 1. TypeScript Non-Strict
- `tsconfig.app.json` ha `strict: false` — radice di tutti i problemi di type safety
- `noUnusedLocals: false`, `noUnusedParameters: false` — codice morto non rilevato

### 2. Architettura Backend Incompleta
- Solo 2 repository su ~9 modelli -> servizi accedono direttamente a Mongoose
- Viola la separazione Controller -> Service -> Repository

### 3. Zod Version Mismatch
- Frontend: `zod@^4.2.1`
- Backend: `zod@^3.23.8`

### 4. Console.log Ovunque
- Server: `console.log` raw invece del logger strutturato (`server/utils/logger.js`)
- Frontend: `console.log` sparsi (mitigato da Terser in prod, ma pollutano dev)

### 5. Feature `tracker` Vuota
- Solo `WorkLogContext.tsx` — stub mai completato

### 6. useEffect Abusati
- 167 usages in 94 file, molti probabilmente violano le regole CLAUDE.md

### 7. Route Duplicate
- `/study/:deckId` e `/study/:deckId/session` -> stesso componente

### 8. Path Alias Non Implementati
- CLAUDE.md richiede `@/`, `~features`, `~components` ma vite.config non li ha

---

## Fasi del Refactor

| Fase | Focus | Rischio | File Doc |
|---|---|---|---|
| **01** | Cleanup & Igiene | Basso | `01-cleanup.md` |
| **02** | TypeScript Strict Mode | Medio | `02-typescript-strict.md` |
| **03** | Backend Architecture | Medio | `03-backend-architecture.md` |
| **04** | Frontend Architecture | Medio | `04-frontend-architecture.md` |
| **05** | Riduzione Codice | Basso | `05-code-reduction.md` |

**Regola d'oro:** Ogni fase deve essere completabile indipendentemente. Nessuna fase rompe il build.

---

## Ordine di Esecuzione

```
Fase 01 (Cleanup)  ->  Fase 02 (TS Strict)  ->  Fase 03 (Backend)
                                               ->  Fase 04 (Frontend)
                                                         |
                                                Fase 05 (Riduzione)
```

Fase 03 e 04 possono procedere in parallelo. Fase 05 dipende da 02 (per il dead code detection).

---

## Come Procedere

1. Leggi tutti i file `01-05` in ordine
2. Approva/modifica il piano
3. Implementiamo fase per fase, con commit atomici
4. Ogni fase: build check + test dove serve
