# Fase 01 — Cleanup & Igiene

> **Rischio:** Basso
> **Impatto:** Rimuove rumore, nessuna logica toccata
> **Stima:** ~30 file toccati

---

## 1.1 Console.log -> Logger strutturato (Server)

Il server ha un logger strutturato in `server/utils/logger.js` ma molti file usano `console.log` raw.

### File da fixare:

| File | console.log | Azione |
|---|---|---|
| `server/ENVIRONMENTS/index.js` | 3 | -> `logger.info()` |
| `server/config/redis.js` | 7 | -> `logger.info/error()` |
| `server/services/emailService.js` | 5 | -> `logger.info()` |
| `server/middleware/rateLimiter.js` | 2 | -> `logger.info()` |
| `server/services/study/quizHelpers.js` | 4 | -> `logger.debug()` |
| `server/services/study/trueFalseGenerator.js` | 2 | -> `logger.debug()` |

### Pattern di sostituzione:
```javascript
// PRIMA
console.log('Redis connected');
console.error('Redis connection failed:', err);

// DOPO
const logger = require('../utils/logger');
logger.info('Redis connected');
logger.error('Redis connection failed', { error: err.message });
```

---

## 1.2 Console.log (Frontend)

Terser li strappa in prod, ma pollutano il dev. Rimuovere o sostituire con `logger`.

| File | console.log | Azione |
|---|---|---|
| `src/features/study/services/studyService.ts` | 7 | Rimuovere |
| `src/shared/context/TutorialContext.tsx` | 6 | Rimuovere |
| `src/features/study/hooks/useDeckHandlers.ts` | 2 | Rimuovere |
| `src/features/study/components/Exams/ExamCompletionModal.tsx` | 5 | Rimuovere |
| `src/features/study/components/Modals/ExamSolver/useExamSolver.ts` | 2 | Rimuovere |
| `src/features/study/components/PDF/FluidPDFViewer.tsx` | 1 non-guarded | Rimuovere |

---

## 1.3 Route Duplicata

**Problema:** `/study/:deckId` e `/study/:deckId/session` rendono entrambe `StudySessionPage`.

**Azione:** Rimuovere `/study/:deckId` e tenere solo `/study/:deckId/session`.
Verificare tutti i `navigate()` e `<Link>` che puntano alla route rimossa e aggiornarli.

---

## 1.4 TODO / Dead Code

| File | Riga | Problema | Azione |
|---|---|---|---|
| `ExamDetailView.tsx` | 239 | `onClick={() => {/* TODO */}}` | Rimuovere bottone morto |
| `FolderSectionHeader.tsx` | 164 | TODO "Studia tutti i deck" | Rimuovere commento |
| `useDeckHandlers.ts` | 171 | TODO pinned backend | Keep (legittimo reminder) |

---

## 1.5 Spostare file fuori posizione

### `src/lib/` -> `src/shared/utils/`
- `src/lib/sanitizeContent.ts` -> `src/shared/utils/sanitizeContent.ts`
- `src/lib/utils.ts` -> `src/shared/utils/utils.ts`
- Aggiornare tutti gli import

### `src/hooks/useSSE.ts` -> feature consumer
- Identificare quale feature usa `useSSE`
- Spostarlo in `src/features/{feature}/hooks/useSSE.ts`
- Aggiornare gli import

---

## Checklist di Completamento

- [ ] Tutti i `console.log` server sostituiti con `logger`
- [ ] Tutti i `console.log` frontend rimossi
- [ ] Route duplicata rimossa
- [ ] Dead code/TODO rimossi
- [ ] File in `src/lib/` spostati in `src/shared/utils/`
- [ ] `useSSE.ts` spostato nella feature corretta
- [ ] `npm run build` passa senza errori
- [ ] App funziona correttamente (test manuale)
