# Fase 02 — TypeScript Strict Mode

> **Rischio:** Medio
> **Impatto:** Elimina la radice dei problemi di type safety
> **Stima:** ~49 file da fixare + dead code rimosso automaticamente

---

## 2.1 Attivazione Strict Mode

### Modifica `tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Cosa attiva `strict: true`:
- `strictNullChecks` — niente piu `undefined is not a function`
- `strictFunctionTypes` — parametri funzione type-safe
- `strictBindCallApply` — bind/call/apply tipizzati
- `strictPropertyInitialization` — proprieta classe inizializzate
- `noImplicitAny` — mai piu `any` implicito
- `noImplicitThis` — `this` sempre tipizzato
- `alwaysStrict` — `"use strict"` ovunque

### Strategia Incrementale
Se il numero di errori e' troppo alto (>200), usare approccio progressivo:
1. Prima attivare solo `noUnusedLocals` + `noUnusedParameters` (pulizia dead code)
2. Poi `strictNullChecks` (il piu impattante)
3. Poi `strict: true` completo

---

## 2.2 File Critici con `any` (Priorita Alta)

Questi file sono nel critical path dell'app — fixarli per primi.

### Tier 1 — Infrastruttura (fixare PRIMA)
| File | Problema |
|---|---|
| `src/shared/services/apiClient.ts` | `as any` — backbone di tutte le chiamate API |
| `src/features/study/services/studyService.ts` | `any` nei response types — servizio piu usato |

### Tier 2 — Pagine Core
| File | Problema |
|---|---|
| `src/features/study/pages/StudySessionPage.tsx` | `any` in state/effects |
| `src/features/study/pages/DeckDetailPage.tsx` | `any` casts |

### Tier 3 — Componenti
| File | Problema |
|---|---|
| `src/features/study/components/Exams/ExamDetailView.tsx` | `any` casts |
| `src/features/study/components/PDF/PDFReader.tsx` | `any` in event handlers |
| `src/features/study/hooks/useDeckHandlers.ts` | `any` |
| `src/features/study/components/Modals/ExamSolver/components/ReviewAnswers.tsx` | `any` |

### Pattern di Fix:
```typescript
// PRIMA
const handleResponse = (data: any) => { ... }

// DOPO — definire il tipo reale
interface DeckResponse {
  id: string;
  name: string;
  cards: Card[];
}
const handleResponse = (data: DeckResponse) => { ... }
```

---

## 2.3 Zod v3/v4 Mismatch

### Situazione
- **Frontend:** `zod@^4.2.1` (nuova API)
- **Backend:** `zod@^3.23.8` (vecchia API)

### Decisione: Allineare Server a Zod v4

**Motivo:** Zod v4 ha API migliore, frontend gia aggiornato, i breaking changes nel server sono gestibili.

### File server da aggiornare:
- `server/config/envSchema.js` — schema validazione env
- `server/validators/authValidators.js` — schema auth
- `server/validators/studyValidators.js` — schema study

### Breaking Changes Zod v3 -> v4:
- `z.object().strict()` -> verificare compatibilita
- `.refine()` / `.transform()` -> verificare API
- Import path potrebbe cambiare

---

## 2.4 Dead Code Detection

Con `noUnusedLocals: true` e `noUnusedParameters: true`, il compiler segnalera automaticamente:
- Import non usati
- Variabili dichiarate ma mai lette
- Parametri di funzione non usati (prefixare con `_` se intenzionale)

### Azione:
1. Abilitare i flag
2. Eseguire `npx tsc --noEmit`
3. Fixare tutti gli errori
4. Commit

---

## Checklist di Completamento

- [ ] `tsconfig.app.json` aggiornato con `strict: true`
- [ ] `noUnusedLocals: true` e `noUnusedParameters: true` abilitati
- [ ] Tutti i 49 file con `any` fixati (tipo reale o `unknown` + type guard)
- [ ] Dead code rimosso (import, variabili, parametri)
- [ ] Zod v4 allineato su server
- [ ] `npx tsc --noEmit` passa con 0 errori
- [ ] `npm run build` passa senza errori
