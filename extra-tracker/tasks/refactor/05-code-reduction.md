# Fase 05 — Riduzione Codice

> **Rischio:** Basso
> **Impatto:** Meno codice = meno bug, meno manutenzione, build piu leggero
> **Dipende da:** Fase 02 (strict mode attiva il dead code detection)

---

## 5.1 Componenti Duplicati / Simili

### Skeleton Components
Attualmente ci sono 4 skeleton separati:
- `DeckCardSkeleton`
- `DeckGridSkeleton`
- `FlashcardSkeleton`
- `Skeleton` (base)

**Azione:** Verificare se `DeckCardSkeleton` e `FlashcardSkeleton` sono sufficientemente diversi
da giustificare l'esistenza separata, o se si possono unificare con props varianti.

### Background Components
3 componenti di sfondo diversi:
- `AnimatedBackground`
- `ModernBackground`
- `TimeTrackingBackground`

**Azione:** Verificare quali sono effettivamente usati. Se ne serve solo uno, eliminare gli altri.
Se servono varianti, creare un singolo `Background` con prop `variant`.

---

## 5.2 Hooks Audit

### `src/shared/hooks/` (6 hook)

| Hook | Azione |
|---|---|
| `useFilterMonth` | Verificare consumer |
| `useFormat` | Verificare consumer |
| `useMediaQuery` | Probabilmente usato — keep |
| `usePreload` | Verificare se serve ancora |
| `useScrollToTop` | Potrebbe essere sostituito da React Router `ScrollRestoration` |
| `useSelection` | Verificare consumer |

Per ognuno: `grep -r "useHookName" src/ --include="*.tsx" --include="*.ts"`.
Se 0 consumer -> eliminare.

---

## 5.3 Dead Code Automatico (post Fase 02)

Con `noUnusedLocals: true` e `noUnusedParameters: true` attivi:

1. `npx tsc --noEmit` mostra tutti gli errori
2. Per ogni errore:
   - Import non usato -> rimuovere
   - Variabile non usata -> rimuovere
   - Parametro non usato -> prefixare con `_` se intenzionale, rimuovere se dead
   - Export non usato -> rimuovere se non fa parte dell'API pubblica

---

## 5.4 Service Layer Frontend

### `src/features/study/services/`
Attualmente 4 file di servizio per la feature study:

Verificare:
- Ci sono metodi duplicati tra i service?
- Ci sono metodi mai chiamati?
- Si possono consolidare?

---

## 5.5 `src/data.ts`

File nel root di `src/`. Verificare:
- Cosa contiene (dati hardcoded? configurazione?)
- Se e' ancora usato
- Se va spostato nella feature corretta o eliminato

---

## 5.6 Modelli Backend Inutilizzati

Verificare se tutti i 9 modelli Mongoose sono effettivamente usati:
- `AIUsageLog.js` — usato dal dashboard AI?
- `AuditLog.js` — usato dal audit service?
- `WorkLog.js` / `WorkTodo.js` — usati? (feature tracker e' uno stub frontend)

Se un modello ha zero consumer nel server -> considerare rimozione (o almeno documentare che e' "futuro").

---

## 5.7 Bundle Size Check

Dopo tutte le riduzioni:
```bash
npm run build
# Verificare output size
# Confrontare con size pre-refactor
```

Target:
- Initial bundle < 200KB
- Vendor chunks ben separati (gia implementato in vite.config)

---

## Checklist di Completamento

- [ ] Skeleton components consolidati dove possibile
- [ ] Background components ridotti
- [ ] Hook inutilizzati rimossi
- [ ] Dead code rimosso (compilatore-driven)
- [ ] Service frontend auditati per duplicati
- [ ] `src/data.ts` risolto
- [ ] Modelli backend verificati
- [ ] Bundle size misurato e confrontato pre/post
- [ ] `npm run build` passa
- [ ] Zero regression funzionali
