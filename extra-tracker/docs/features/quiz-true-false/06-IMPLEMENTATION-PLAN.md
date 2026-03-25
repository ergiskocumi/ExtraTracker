# Implementation Plan: Quiz Vero/Falso

## Panoramica Fasi

| Fase | Focus | Stima Effort | Dipendenze |
|------|-------|-------------|------------|
| **1** | Data Layer (minimo) | Basso | Nessuna |
| **2** | AI Generation Backend | Medio | Fase 1 |
| **3** | API Endpoints | Medio | Fase 2 |
| **4** | Frontend: Componenti base | Medio | Fase 3 |
| **5** | Frontend: Integrazione UX | Medio | Fase 4 |
| **6** | Polish + Testing | Basso | Fase 5 |

---

## Fase 1: Data Layer (Minimo)

### Obiettivo
Aggiungere `totalPages` al Deck model. Nessuna modifica strutturale pesante necessaria.

### Tasks

#### 1.1 Aggiungere `totalPages` al Deck Schema
**File**: `server/models/Deck.js`
- Aggiungere: `totalPages: { type: Number, default: 0 }`

#### 1.2 Popolamento durante PDF upload
**File**: servizio di upload PDF (identificare il file esatto)
- `pdf-parse` gia' restituisce `numpages` → salvare in `deck.totalPages`
- Per deck esistenti con PDF: lazy-fill al primo accesso

#### 1.3 Esporre info testo al frontend
Il frontend ha bisogno di sapere se il deck ha testo estratto e quanto e' lungo, ma `extractedText` e' `select: false`.

**Opzione**: Aggiungere un campo virtuale o includere `extractedTextLength` nella response del deck.
**Alternativa semplice**: Usare `deck.pdfUrl` come proxy (se ha PDF → ha extractedText). Il backend puo' verificare internamente.

### Deliverable
- `totalPages` salvato per nuovi upload
- Frontend puo' sapere se un deck ha PDF

---

## Fase 2: AI Generation Backend

### Obiettivo
Creare il servizio di generazione AI per statements V/F, riutilizzando la pipeline di chunking esistente.

### Tasks

#### 2.1 Nuovo servizio `trueFalseGenerator.js`
**File**: `server/services/study/trueFalseGenerator.js`

Funzioni:
- `generateTrueFalseStatements(extractedText, questionCount, telemetry)` → orchestratore principale
- `_generateTrueFalseFromChunk(textChunk, questionCount, previousStatements, telemetry)` → singolo chunk
- `_validateTrueFalseOutput(output, requestedCount)` → validazione
- `_mapStatementsToCards(statements)` → mappatura a formato Card per session

Implementazione:
- Riutilizzare `_splitTextIntoChunks()` da `quizHelpers.js`
- System prompt + User prompt come da `04-AI-PROMPT-DESIGN.md`
- JSON schema per structured output OpenAI
- Integrazione con `aiUsageService.runTrackedChatCompletion()`
- Retry con temperature escalation (0.4 → 0.5 → 0.6, max 2 retry)
- 1.5s delay tra chunks (rate limiting API, come MCQ)

#### 2.2 Costanti
**File**: `server/services/study/constants.js`
- `TF_MIN_TEXT_CHARS = 500`
- `TF_CHARS_PER_STATEMENT = 1000` (budget testo per statement)
- `TF_MIN_STATEMENTS = 3`
- `TF_MAX_STATEMENTS = 50`
- `TF_TEMPERATURE = 0.4`

#### 2.3 Test manuale
- Testare con PDF reali di diverse dimensioni
- Verificare qualita' statements (bilanciamento, plausibilita')
- Verificare retry su output malformato
- Verificare costo/token per 10 e 20 domande

### Deliverable
- Servizio di generazione V/F funzionante
- Integrazione con tracking AI usage
- Validazione output robusta

---

## Fase 3: API Endpoints

### Obiettivo
Esporre le API per il frontend.

### Tasks

#### 3.1 `POST /api/study/:deckId/quiz/true-false/generate`
**File**: `server/controllers/studyController.js` + `server/routes/study.js`
- Controller: valida input (Zod) → carica deck con `extractedText` → chiama `generateTrueFalseStatements()` → ritorna statements
- Rate limiting: 5 req/min per utente
- Error handling: `NO_PDF_TEXT`, `INSUFFICIENT_TEXT`, `AI_GENERATION_FAILED`

#### 3.2 Estendere `GET /api/study/:deckId/session` per V/F AI
**File**: `server/services/study/studySession.js`
- Se `quizType=true_false` e `deck.extractedText` presente → usare `trueFalseGenerator`
- Se `quizType=true_false` senza `extractedText` → fallback a `_transformToTrueFalse()` (backward compat)
- Aggiungere `meta.aiGenerated = true` nella response

#### 3.3 Validatore Zod
**File**: `server/validators/studyValidators.js`
- `generateTrueFalseSchema`: `{ questionCount: z.number().int().min(3).max(50).default(10) }`

### Deliverable
- API funzionanti e testate
- Backward compatibility garantita
- Rate limiting configurato

---

## Fase 4: Frontend - Componenti Base

### Obiettivo
Creare i componenti UI e il service layer.

### Tasks

#### 4.1 Tipi e service
**File**: `src/features/study/services/studyService.ts`
- Aggiungere tipo `TrueFalseStatement`
- Aggiungere metodo `generateTrueFalseQuiz(deckId, { questionCount })`
- Aggiungere funzione `mapStatementToCard(stmt)` per conversione

#### 4.2 `TrueFalseExplanation` component
**File**: `src/features/study/components/Study/TrueFalseExplanation.tsx`
- Mostra spiegazione, correzione (se falso), visual feedback
- Stile coerente con QuizView esistente

#### 4.3 `TrueFalseQuizLauncher` component
**File**: `src/features/study/components/Deck/TrueFalseQuizLauncher.tsx`
- Input questionCount + info deck + bottone genera
- Loading state durante generazione
- Error handling inline

### Deliverable
- Componenti isolati e riutilizzabili
- Service layer completo

---

## Fase 5: Frontend - Integrazione UX

### Obiettivo
Integrare i componenti nei flussi UX esistenti.

### Tasks

#### 5.1 Inserire `TrueFalseQuizLauncher` in DeckDetailContent
**File**: `src/features/study/components/Deck/DeckDetailContent.tsx`
- Nella sidebar destra (desktop) / sotto cards (mobile)
- Condizione: deck ha PDF (`deck.pdfUrl` come proxy)
- Al lancio: naviga a StudySessionPage con `preparedSession`

#### 5.2 Aggiungere "Vero/Falso" nel modale avvio sessione
**File**: Identificare SessionStartModal o equivalente
- Nuova opzione modalita'
- Se selezionata: input questionCount
- Passare params via URL query string

#### 5.3 Migliorare QuizView per spiegazioni V/F
**File**: `src/features/study/components/Study/QuizView.tsx`
- Usare `TrueFalseExplanation` quando `isTrueFalse` + AI-generated
- Nessuna modifica al layout bottoni (gia' funzionante)

#### 5.4 Mostrare info nei quiz salvati
**File**: `src/features/study/components/Deck/DeckDetailContent.tsx`
- Badge "AI" per quiz V/F generati dall'AI (vs trasformazione card-based)

### Deliverable
- Flusso completo end-to-end funzionante
- Entrambi gli entry point operativi

---

## Fase 6: Polish + Testing

### Tasks

#### 6.1 Error handling
- Messaggi utente in italiano per tutti gli errori
- Fallback graceful se AI fallisce
- Toast notifications per successo/errore

#### 6.2 Loading states
- Spinner con testo durante generazione
- Opzione annulla (abort controller)

#### 6.3 Responsive testing
- Testare su mobile (iPhone SE, standard)
- Testare su tablet
- Bottom sheet mobile per il launcher

#### 6.4 Edge cases
- Deck senza PDF → componente non visibile
- PDF con poco testo (<500 chars) → errore chiaro
- AI genera meno domande del richiesto → mostrare quante ne ha generate
- Utente annulla durante generazione → cleanup corretto

#### 6.5 Quality Gate
- [ ] Zero `any` nei nuovi tipi
- [ ] Nessun `useEffect` per data transformation
- [ ] `useCallback` su tutti i handler passati come props
- [ ] Zod validation su tutti gli input API
- [ ] Rate limiting sull'endpoint AI
- [ ] Error boundaries attorno al launcher

---

## Dipendenze tra Fasi

```
Fase 1 (Data Layer)
  └──> Fase 2 (AI Backend)
         └──> Fase 3 (API)
                └──> Fase 4 (Frontend Base)
                       └──> Fase 5 (Frontend Integration)
                              └──> Fase 6 (Polish)
```

**Parallelismo possibile**: Fase 4 puo' iniziare con mock data mentre Fase 3 e' in corso (contratto API gia' definito in `03-API-DESIGN.md`).

---

## Rischi di Implementazione

| Rischio | Probabilita' | Mitigazione |
|---------|-------------|-------------|
| Qualita' statements V/F insufficiente | Bassa | Iterare sul prompt, few-shot examples |
| Latenza generazione per PDF grandi | Media | Chunking pipeline gia' testata per MCQ |
| `extractedText` flag non disponibile al frontend | Bassa | Usare `pdfUrl` come proxy o aggiungere campo |
| Conflitto con V/F card-based esistente | Bassa | Fallback esplicito: AI se ha PDF, card-based altrimenti |

---

## Definition of Done (MVP)

- [ ] Utente con deck + PDF puo' generare quiz V/F dall'intero capitolo
- [ ] Statements ~50/50 vero/falso con qualita' pedagogica
- [ ] Spiegazione AI per ogni risposta (corretta e sbagliata)
- [ ] Correzione mostrata per statements falsi
- [ ] Quiz V/F salvabile e ripetibile
- [ ] Due entry point: sezione deck + inline session
- [ ] Mobile responsive
- [ ] Rate limiting attivo
- [ ] Fallback card-based per deck senza PDF
- [ ] Zero regressioni su funzionalita' esistenti (MCQ, flashcard, ecc.)
