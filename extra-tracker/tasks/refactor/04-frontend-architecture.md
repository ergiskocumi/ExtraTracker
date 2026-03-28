# Fase 04 — Frontend Architecture

> **Rischio:** Medio
> **Impatto:** Allinea il frontend alla dottrina Suspense-First e Feature-Based
> **Stima:** ~94 file con useEffect da auditare, struttura da riorganizzare

---

## 4.1 Audit useEffect (167 usages in 94 file)

### Regola CLAUDE.md
- **VIETATO:** Calcoli stato derivato, gestione eventi utente, data transformation
- **PERMESSO:** Sync con sistemi esterni (API, WebSocket, DOM listeners)

### Classificazione da Fare

Per ogni `useEffect` nel codebase:

| Categoria | Azione | Esempio |
|---|---|---|
| **Stato derivato** | Sostituire con `useMemo` | `useEffect(() => { setFiltered(items.filter(...)) }, [items])` |
| **Gestione eventi** | Spostare in handler | `useEffect(() => { if (clicked) doSomething() }, [clicked])` |
| **Data transform** | Calcolare inline o `useMemo` | `useEffect(() => { setFormatted(format(data)) }, [data])` |
| **Sync esterno** | **KEEP** | `useEffect(() => { window.addEventListener(...) }, [])` |
| **Data fetching** | Migrare a `useSuspenseQuery` | `useEffect(() => { fetch(...).then(setData) }, [])` |

### File con piu useEffect (priorita audit):

Concentrarsi sui file con 3+ useEffect — sono i piu probabili violatori.
Usare `grep -c "useEffect" src/**/*.tsx | sort -t: -k2 -nr | head -20` per identificarli.

---

## 4.2 Feature `tracker` — Decisione

### Stato Attuale
- `src/features/tracker/context/WorkLogContext.tsx` — unico file
- Il backend ha route per worklogs (`/api/worklogs`) e todos (`/api/workspace/todos`)
- `WorkLogContext` e' montato nel root `App.tsx` wrapper

### Opzioni

**Opzione A — Eliminare (Consigliata se non usata)**
- Rimuovere `src/features/tracker/` interamente
- Rimuovere il `<WorkLogProvider>` da `App.tsx`
- Mantenere le route backend (API puo servire in futuro)

**Opzione B — Completare**
- Creare pagina tracker con UI
- Non consigliato nel contesto di un refactor (aggiunge codice invece di ridurlo)

### Azione: Verificare prima se `WorkLogContext` ha consumer reali nel frontend.
```bash
grep -r "useWorkLog\|WorkLogContext" src/ --include="*.tsx" --include="*.ts"
```
Se nessun consumer reale -> Opzione A.

---

## 4.3 Path Alias

### Problema
CLAUDE.md richiede alias ma `vite.config.ts` e `tsconfig.app.json` non li configurano.
Il codebase usa import relativi ovunque (`../../../shared/components/...`).

### Configurazione

**`vite.config.ts`:**
```typescript
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**`tsconfig.app.json`:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Strategia di Migrazione
**NON** fare un bulk rename di tutti gli import in una volta.
1. Configurare gli alias
2. Usarli solo per **nuovi file** e file che stiamo gia toccando nel refactor
3. Gradualmente migrare i restanti

> **Nota:** Rinominare 300+ file di import in un colpo e' rischioso e crea conflitti git enormi.
> Meglio farlo incrementalmente.

---

## 4.4 Study Feature — Scomposizione

### Problema
La feature `study` ha **50+ componenti** in ~20 directory. E' troppo grande per essere una singola feature.

### Struttura Attuale (semplificata):
```
src/features/study/
├── components/
│   ├── Cards/           # Flashcard components
│   ├── Deck/            # Deck list/detail
│   ├── DeckSections/    # Folder/tag sections
│   ├── Exams/           # Exam view/creation
│   ├── Modals/          # Various modals (ExamSolver, etc.)
│   ├── PDF/             # PDF viewer
│   ├── Session/         # Study session UI
│   ├── Study/           # Quiz/review modes
│   └── Cinema/          # Cinema mode
├── hooks/               # 8 hooks
├── pages/               # 4 pages
└── services/            # 4 service files
```

### Proposta di Scomposizione

```
src/features/
├── study/               # Core: deck CRUD, dashboard mazzi
│   ├── components/Deck/
│   ├── components/DeckSections/
│   ├── components/Cards/
│   ├── hooks/
│   ├── pages/DecksDashboardPage, DeckDetailPage
│   └── services/studyService.ts
│
├── study-session/       # Sessione di studio (flashcard review)
│   ├── components/Session/
│   ├── components/Study/  (QuizMode, ReviewMode, etc.)
│   ├── pages/StudySessionPage
│   └── hooks/
│
├── exams/               # Esami e quiz
│   ├── components/Exams/
│   ├── components/Modals/ExamSolver/
│   └── services/examService.ts
│
├── cinema/              # Modalita cinema/lettura
│   ├── components/Cinema/
│   └── pages/CinemaPage
│
└── pdf/                 # PDF viewer (se usato cross-feature)
    ├── components/PDF/
    └── hooks/
```

### Attenzione
Questa scomposizione e' la piu rischiosa della fase 04. Valutare se:
- Le sub-feature condividono troppo stato -> potrebbe non valere la pena
- I benefici superano il costo del refactor

**Consiglio:** Fare prima le fasi 4.1-4.3, poi decidere sulla 4.4 con il codebase gia piu pulito.

---

## 4.5 Suspense-First Migration

### Stato Attuale
Il progetto usa `@tanstack/react-query` con `useSuspenseQuery` in alcuni punti,
ma potrebbe avere pattern `isLoading` sparsi.

### Audit
Cercare nel codebase:
```
grep -r "isLoading\|isError\|isFetching" src/ --include="*.tsx"
```

Ogni istanza va valutata:
- Se viene da `useQuery` -> migrare a `useSuspenseQuery` + `<Suspense>` boundary
- Se viene da stato locale (form submission) -> OK, puo restare

---

## Checklist di Completamento

- [ ] Audit completo dei 167 useEffect (classificati e fixati)
- [ ] Feature `tracker` risolta (eliminata o giustificata)
- [ ] Path alias configurati in vite.config e tsconfig
- [ ] Valutazione scomposizione feature `study` completata
- [ ] Pattern `isLoading` migrati a Suspense dove appropriato
- [ ] `npm run build` passa senza errori
- [ ] Nessun regression visivo (test manuale)
