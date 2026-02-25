# 📋 REPORT REVISIONE LOGICA - ExtraTracker

**Data:** 11/02/2026  
**Progetto:** ExtraTracker  
**File Analizzati:** 40+ file TypeScript/JavaScript

---

## 🔴 ERRORI LOGICI

### 1. Timer continua dopo l'ultima domanda (QUIZ)

**File:** `src/features/study/pages/StudySessionPage.tsx`  
**Funzione:** `handleRate` + Timer Effect  
**Livello:** CRITICO

**Descrizione:**  
Il timer (`elapsedSeconds`) continua a incrementarsi anche dopo che l'utente ha risposto all'ultima domanda del quiz. Il timer viene fermato solo quando `handleComplete` viene chiamato (dopo 800ms di delay), ma in quel lasso di tempo il tempo continua a scorrere.

**Codice problematico:**
```typescript
// Linee 341-357: Timer effect
useEffect(() => {
    if (!session) return;
    timerRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);  // ⬅️ Continua anche dopo ultima risposta
        if (timeLimitSeconds) {
            setTimeLeft(prev => {
                if (prev === null || prev <= 0) return prev;
                return prev - 1;
            });
        }
    }, 1000);
    // ...
}, [session, timeLimitSeconds]);

// Linee 461-508: handleRate
const handleRate = useCallback(async (rating: ReviewRating) => {
    // ... submit review ...
    setTimeout(() => {
        const nextIndex = currentCardIndex + 1;
        if (nextIndex >= session.cards.length) {
            handleComplete();  // ⬅️ Chiamato dopo 800ms
        }
        // ...
    }, 800);
}, [session, currentCardIndex, mode, handleComplete]);
```

**Suggerimento:**
Aggiungere un flag `isSessionComplete` e fermare il timer immediatamente quando l'utente risponde all'ultima domanda:
```typescript
// Prima di setTimeout in handleRate:
if (currentCardIndex + 1 >= session.cards.length) {
    if (timerRef.current) clearInterval(timerRef.current);
}
```

---

### 2. Animazione troppo veloce per vedere risposta corretta (QUIZ)

**File:** `src/features/study/pages/StudySessionPage.tsx`  
**Funzione:** `handleRate`  
**Livello:** ALTO

**Descrizione:**  
Come indicato nel `toDo.txt`, quando si risponde a una domanda, l'animazione di transizione è troppo veloce (800ms) e l'utente non ha tempo sufficiente per vedere quale era la risposta corretta, specialmente se ha sbagliato.

**Codice problematico:**
```typescript
// Linea 500: Delay fisso di 800ms
setTimeout(() => {
    const nextIndex = currentCardIndex + 1;
    if (nextIndex >= session.cards.length) {
        handleComplete();
    } else {
        setCurrentCardIndex(nextIndex);
        setIsFlipped(false);
        setExitDirection(null);
    }
}, 800); // ⬅️ Troppo veloce per leggere la risposta corretta
```

**Suggerimento:**
Aggiungere un delay variabile in base al risultato, o meglio ancora, richiedere un click dell'utente per proseguire:
```typescript
// Soluzione A: Delay più lungo per risposte sbagliate
const delay = rating <= 2 ? 2000 : 800; // 2 secondi per sbagliate

// Soluzione B: Attendi click utente (meglio)
// Rimuovere il setTimeout auto-advance e usare un pulsante "Continua"
```

---

### 3. Calcolo percentuali errato in adaptiveGapFiller

**File:** `src/features/study/utils/adaptiveGapFiller.ts`  
**Funzione:** `selectCardsForQuiz`  
**Livello:** MEDIO

**Descrizione:**  
L'algoritmo calcola i target per ogni bucket usando `Math.round()`, ma poi cerca di aggiustare la somma. Questo può portare a discrepanze quando i numeri sono piccoli.

**Codice problematico:**
```typescript
// Linee 225-235
let urgentTarget = Math.round(targetSize * BUCKET_CONFIG.urgent.percentage);  // 50%
let newTarget = Math.round(targetSize * BUCKET_CONFIG.new.percentage);        // 30%
let safeTarget = Math.round(targetSize * BUCKET_CONFIG.safe.percentage);      // 20%

// Esempio: targetSize = 10
// urgentTarget = 5, newTarget = 3, safeTarget = 2 = 10 ✓

// Esempio: targetSize = 7
// urgentTarget = Math.round(3.5) = 4
// newTarget = Math.round(2.1) = 2
// safeTarget = Math.round(1.4) = 1
// Totale = 7 ✓

// Esempio: targetSize = 3
// urgentTarget = Math.round(1.5) = 2
// newTarget = Math.round(0.9) = 1
// safeTarget = Math.round(0.6) = 1
// Totale = 4 > 3 ⬅️ ECCESSO DI 1!
```

**Suggerimento:**
Usare `Math.floor()` per il calcolo base e distribuire il rimanente in modo più intelligente:
```typescript
// Calcolo con floor per evitare overflow
let urgentTarget = Math.floor(targetSize * BUCKET_CONFIG.urgent.percentage);
let newTarget = Math.floor(targetSize * BUCKET_CONFIG.new.percentage);
let safeTarget = Math.floor(targetSize * BUCKET_CONFIG.safe.percentage);

// Distribuisci il rimanente in base alle priorità
let remaining = targetSize - (urgentTarget + newTarget + safeTarget);
if (remaining > 0) urgentTarget += remaining; // Priorità a urgent
```

---

### 4. Condizione logica incompleta in isUrgentCard

**File:** `src/features/study/utils/adaptiveGapFiller.ts`  
**Funzione:** `isUrgentCard`  
**Livello:** MEDIO

**Descrizione:**  
La funzione non gestisce correttamente il caso in cui una carta ha `status === 'review'` ma è scaduta da molto tempo.

**Codice problematico:**
```typescript
// Linee 81-96
const isUrgentCard = (card: Card): boolean => {
    if (card.status === 'learning') return true;
    if (card.easinessFactor < 2.3) return true;
    
    if (card.status !== 'mastered' && card.status !== 'new') {
        const now = new Date();
        const nextReview = new Date(card.nextReviewDate);
        if (nextReview <= now) return true;  // ⬅️ Non considera QUANTO è scaduta
    }
    return false;
};
```

**Suggerimento:**
Aggiungere una priorità basata su quanto tempo è passato dalla scadenza:
```typescript
if (card.status !== 'mastered' && card.status !== 'new') {
    const now = new Date();
    const nextReview = new Date(card.nextReviewDate);
    const daysOverdue = Math.floor((now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue > 7) return true;      // Molto urgente
    if (daysOverdue > 0) return true;      // Moderatamente urgente
}
```

---

## 🔴 PROBLEMI CON PROMISE/ASYNC

### 5. Race condition potenziale in apiClient

**File:** `src/shared/services/apiClient.ts`  
**Funzione:** Response Interceptor  
**Livello:** ALTO

**Descrizione:**  
Se la richiesta di refresh fallisce, il flag `isSessionDead` viene impostato, ma non c'è un meccanismo per resettarlo automaticamente quando l'utente fa login con nuove credenziali (dopo che l'account è stato riattivato).

**Codice problematico:**
```typescript
// Linee 241-244
if (isSessionDead) {
    return Promise.reject(error);  // ⬅️ Blocca tutte le richieste senza retry
}

// Linee 295-299: Sessione marcata come morta
if (isAccountDeactivated) {
    isSessionDead = true;  // ⬅️ Mai resettato fino a reload della pagina!
}
```

**Suggerimento:**
Aggiungere un listener per l'evento di login che resetta il flag:
```typescript
// Aggiungere nel modulo
window.addEventListener('auth:loginSuccess', () => {
    isSessionDead = false;
});
```

---

### 6. Promise senza catch in settingsService

**File:** `src/features/settings/services/settingsService.ts`  
**Funzione:** `exportData`  
**Livello:** MEDIO

**Descrizione:**  
La funzione `exportData` usa `fetch` ma non gestisce correttamente tutti i casi di errore, e il catch ritorna `null` senza propagare l'errore.

**Codice problematico:**
```typescript
// Linee 193-229
async exportData(): Promise<unknown | null> {
    try {
        const response = await fetch(`${API_BASE_URL}${this.baseUrl}/export`, {
            // ... config
        });
        
        if (!response.ok) {
            throw new Error('Errore durante l\'esportazione');  // ⬅️ Messaggio generico
        }
        // ...
    } catch (error) {
        console.error('Export error:', error);
        return null;  // ⬅️ Silenzia l'errore, il chiamante non sa cosa è successo
    }
}
```

**Suggerimento:**
Rilanciare l'errore o ritornare un oggetto con informazioni sull'errore:
```typescript
catch (error) {
    console.error('Export error:', error);
    throw new Error('Esportazione fallita: ' + (error.message || 'Errore sconosciuto'));
}
```

---

### 7. Async/await mal gestito in useExams

**File:** `src/features/study/hooks/useExams.ts`  
**Funzione:** `loadExams`  
**Livello:** MEDIO

**Descrizione:**  
La funzione `loadExams` cattura gli errori con `try/catch` ma non li rilancia, il che può portare a stati inconsistenti se il chiamante si aspetta di gestire l'errore.

**Codice problematico:**
```typescript
// Linee 17-27
const loadExams = useCallback(async () => {
    try {
        setIsLoading(true);
        const allExams = await examService.getAll();
        setExams(allExams);
    } catch (err) {
        console.error('Errore nel caricamento degli esami:', err);
        // ⬅️ Nessun setError, nessun rilancio
    } finally {
        setIsLoading(false);
    }
}, []);
```

**Suggerimento:**
Aggiungere gestione stato errore o rilanciare:
```typescript
catch (err) {
    console.error('Errore nel caricamento degli esami:', err);
    setError(err.message || 'Errore di caricamento');
    // OPPURE rilanciare per gestione upstream
    throw err;
}
```

---

## 🟡 PROBLEMI DI VALIDAZIONE

### 8. Regex email troppo semplice

**File:** `src/features/settings/utils/validation.ts`  
**Funzione:** `email`  
**Livello:** MEDIO

**Descrizione:**  
La regex per la validazione email è troppo permissiva e non copre correttamente tutti i casi edge.

**Codice problematico:**
```typescript
// Linee 50-57
email: (): ValidationRule => (value: string) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  // ⬅️ Troppo semplice
    if (!emailRegex.test(value)) {
        return 'Formato email non valido';
    }
    return null;
},
```

**Problemi:**
- Accetta `a@b.c` (TLD di 1 carattere, invalido)
- Accetta caratteri speciali non validi nel local part
- Non valida correttamente domini con più punti

**Suggerimento:**
Usare una regex più robusta o una libreria dedicata:
```typescript
// Regex più robusta
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// OPPURE libreria email-validator o zod
```

---

### 9. Validazione PDF insufficiente nel client

**File:** `src/features/study/services/studyService.ts`  
**Funzione:** `generateFromPDF`  
**Livello:** MEDIO

**Descrizione:**  
La validazione del file PDF controlla solo il mime-type e la dimensione, ma non verifica la struttura effettiva del file.

**Codice problematico:**
```typescript
// Linee 484-493
if (!file) {
    throw new Error('Nessun file selezionato');
}
if (file.type !== 'application/pdf') {  // ⬅️ Mime-type può essere falsificato
    throw new Error('Solo file PDF sono supportati');
}
if (file.size > 10 * 1024 * 1024) {
    throw new Error('Il file supera il limite di 10MB');
}
```

**Suggerimento:**
Aggiungere validazione magic bytes:
```typescript
// Validazione magic bytes per PDF (%PDF-)
const validatePDFMagicBytes = async (file: File): Promise<boolean> => {
    const arrayBuffer = await file.slice(0, 5).arrayBuffer();
    const header = new TextDecoder().decode(arrayBuffer);
    return header.startsWith('%PDF-');
};
```

---

## 🟡 PROBLEMI DI GESTIONE DATI

### 10. Mutazione stato potenziale in QuizView

**File:** `src/features/study/components/Study/QuizView.tsx`  
**Funzione:** `buildOptions`  
**Livello:** MEDIO

**Descrizione:**  
La funzione `buildOptions` modifica array in input con `filter()`, che non è una mutazione, ma il codice è confuso e potrebbe portare a bug di manutenzione.

**Codice problematico:**
```typescript
// Linee 35-64
const buildOptions = (options: string[], correctAnswer: string) => {
    const cleaned = options.filter((value) => typeof value === 'string' && value.trim());
    // ...
    const pool = hasCorrect ? cleaned : [correctAnswer, ...cleaned];  // ⬅️ Spread crea nuovo array
    
    const filled: string[] = [];
    const seen = new Set<string>();
    
    for (const value of pool) {
        const normalized = value.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) continue;  // ⬅️ Skip duplicati
        seen.add(normalized);
        filled.push(value.trim());
        // ...
    }
    // ...
};
```

**Suggerimento:**
Il codice è corretto, ma migliorare la leggibilità con commenti più dettagliati.

---

### 11. Deep clone mancante in useDashboard

**File:** `src/features/dashboard/hooks/useDashboard.ts`  
**Funzione:** `handleDuplicate`  
**Livello:** BASSO

**Descrizione:**  
Quando si duplica un log, viene creato un nuovo oggetto ma non viene fatto un deep clone, potenzialmente causando problemi se il log ha oggetti annidati.

**Codice problematico:**
```typescript
// Linee 44-51
const handleDuplicate = (log: WorkLog) => {
    const today = new Date().toISOString().split('T')[0];
    const smartLog = { ...log, id: '', date: today };  // ⬅️ Shallow clone
    setFormData(smartLog);
    // ...
};
```

**Suggerimento:**
Se `WorkLog` ha proprietà annidate, usare deep clone:
```typescript
const smartLog = JSON.parse(JSON.stringify({ ...log, id: '', date: today }));
// OPPURE con structuredClone (moderno)
const smartLog = structuredClone({ ...log, id: '', date: today });
```

---

## 🟡 ALGORITMI INEFFICIENTI

### 12. Ricerca lineare in array in useExams

**File:** `src/features/study/hooks/useExams.ts`  
**Funzione:** `getExamStats`  
**Livello:** BASSO

**Descrizione:**  
La funzione usa `forEach` annidato con `filter` che causa complessità O(n²) quando ci sono molti deck.

**Codice problematico:**
```typescript
// Linee 138-156
const getExamStats = useCallback((examId: string) => {
    const examDecks = decks.filter(d => d.examId === examId);  // O(n)
    // ...
    let masteredCards = 0;
    examDecks.forEach(deck => {  // O(m)
        masteredCards += deck.cards?.filter(c => c.status === 'mastered').length ?? 0;  // O(k)
    });  // Totale: O(n * m * k)
    // ...
}, [decks]);
```

**Suggerimento:**
Per dataset tipici (pochi deck per esame) questo è accettabile. Per scalabilità:
```typescript
const masteredCards = examDecks.reduce((sum, deck) => 
    sum + (deck.cards?.reduce((c, card) => 
        c + (card.status === 'mastered' ? 1 : 0), 0) ?? 0), 0);
```

---

### 13. Parsing LaTeX inefficiente

**File:** `src/features/study/components/Flashcard/CardContentRenderer/parser/latexValidator.ts`  
**Funzione:** `extractLaTeXFormulas`  
**Livello:** BASSO

**Descrizione:**  
La funzione usa due regex con `exec` in loop, che è inefficiente per testi lunghi.

**Codice problematico:**
```typescript
// Linee 208-255
export function extractLaTeXFormulas(content: string) {
    const formulas = [];
    
    // Primo loop per block pattern
    const blockPattern = /\$\$([^$]+)\$\$/g;
    let match;
    while ((match = blockPattern.exec(content)) !== null) {
        formulas.push({...});
    }
    
    // Secondo loop per inline pattern
    const inlinePattern = /(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g;
    while ((match = inlinePattern.exec(content)) !== null) {
        // Verifica che non sia dentro un blocco (loop O(n) per ogni match!)
        const isInsideBlock = formulas.some(
            f => match!.index >= f.startIndex && match!.index < f.endIndex
        );  // ⬅️ O(m) per ogni match inline
        // ...
    }
}
```

**Suggerimento:**
Per uso tipico (flashcard con poco testo) è accettabile. Per testi lunghi, usare un parser più efficiente o combinare le regex.

---

## 🔴 PROBLEMI DI BUSINESS LOGIC (dal toDo.txt)

### 14. Quiz - Domande lunghe non si leggono (SCROLL)

**File:** `src/features/study/components/Study/QuizView.tsx`  
**Livello:** CRITICO

**Descrizione:**  
Anche se il file indica che è stato fixato ("Fix applicati"), verifichiamo l'implementazione.

**Codice analizzato (Linee 328-373):**
```tsx
{/* Scrollable Content Area */}
<div className="flex-1 overflow-y-auto min-h-0">
    <div className="px-6 sm:px-8 py-6 space-y-6">
        {/* Question - Con scroll interno se troppo lunga */}
        <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white leading-relaxed whitespace-pre-wrap break-words">
                {question}
            </h2>
```

**Verifica:** ✅ Il fix sembra implementato correttamente con `overflow-y-auto` e `whitespace-pre-wrap`.

---

### 15. Quiz - Pulsante "Non lo so" mancante

**File:** `src/features/study/components/Study/QuizView.tsx`  
**Livello:** ALTO

**Descrizione:**  
Secondo il toDo.txt, il pulsante "Non lo so" era da aggiungere.

**Codice analizzato (Linee 471-486):**
```tsx
{/* Pulsante "Non lo so" - mostrato solo se non si è ancora risposto e non in modalità Vero/Falso */}
{!selectedOption && !result && !isTrueFalse && (
    <div className="flex justify-center pt-2">
        <button
            ref={dontKnowRef}
            onClick={handleDontKnow}
            // ...
        >
            <span>🤔</span>
            <span>Non lo so</span>
            <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-mono border border-amber-500/30">
                0
            </kbd>
        </button>
    </div>
)}
```

**Verifica:** ✅ Il pulsante è stato implementato correttamente con gestione dedicata.

---

### 16. Timer continua dopo ultima domanda - CONFERMATO

**File:** `src/features/study/pages/StudySessionPage.tsx`  
**Livello:** CRITICO

**Descrizione:**  
Come descritto nel toDo.txt, il timer continua a tracciare il tempo anche dopo l'ultima domanda.

**Conferma:**  
Il problema è stato identificato nella sezione 1 di questo report. Il timer viene fermato solo dopo 800ms di delay, causando tracciamento errato del tempo.

---

## 🟠 PROBLEMI DI TIMEZONE/DATE

### 17. Parsing date senza timezone

**File:** `src/shared/utils/dateUtils.ts`  
**Funzione:** `timeToMinutes`  
**Livello:** MEDIO

**Descrizione:**  
Il parsing delle date non considera esplicitamente la timezone, potenzialmente causando problemi con utenti in diverse timezone.

**Codice problematico:**
```typescript
// Linea 34-51
export const calculateDurationInHours = (startTime: string, endTime: string): number => {
    const startTotalMinutes = timeToMinutes(startTime);
    let endTotalMinutes = timeToMinutes(endTime);
    
    // GESTIONE MIDNIGHT CROSSING
    if (endTotalMinutes < startTotalMinutes) {
        endTotalMinutes += 1440; 
    }
    
    const diffMinutes = endTotalMinutes - startTotalMinutes;
    return Number((diffMinutes / 60).toFixed(2));
}
```

**Nota:** Per uso con orari di lavoro (time tracking) questo approccio è corretto perché gli orari sono locali all'utente.

---

## 🟠 PROBLEMI DI SICUREZZA

### 18. Trust boundary violation potenziale

**File:** `src/lib/sanitizeContent.ts`  
**Funzione:** `sanitizeContent`  
**Livello:** MEDIO

**Descrizione:**  
La funzione `sanitizeContent` rimuove tag script ma non previene tutti i vettori XSS possibili.

**Codice:**
```typescript
// Linee 120-126
const preClean = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
```

**Problema:**  
Potrebbe non catturare tutti gli attributi event handler (es. `onerror`, `onload` con spazi).

**Suggerimento:**
Rafforzare la regex o usare DOMPurify anche per il pre-cleaning.

---

## 📊 RIEPILOGO PER CRITICITÀ

| Livello | Conteggio | Issues |
|---------|-----------|--------|
| 🔴 CRITICO | 3 | #1, #2, #16 (timer), #14 (scroll) |
| 🟠 ALTO | 3 | #5 (race condition), #15 (Non lo so verifica), #6 (Promise catch) |
| 🟡 MEDIO | 7 | #3, #4, #7, #8, #9, #10, #17, #18 |
| 🟢 BASSO | 4 | #11, #12, #13, altri minori |

---

## 💡 RACCOMANDAZIONI PRIORITARIE

1. **Fix immediato (#1, #2, #16):** Correggere il timer del quiz che continua dopo l'ultima domanda e aumentare il delay per vedere le risposte corrette.

2. **Review sicurezza (#18):** Verificare che la sanitizzazione XSS sia completa, specialmente per il rendering Markdown/LaTeX.

3. **Stabilizzazione async (#5, #6, #7):** Migliorare la gestione degli errori nelle Promise e prevenire race conditions.

4. **Refactoring algoritmi (#3, #4):** Correggere i calcoli percentuali nel gap-filler e migliorare la logica di prioritizzazione delle carte.

---

*Report generato da Senior JavaScript/TypeScript Engineer*  
*Metodologia: Analisi statica del codice, review pattern async/await, verifica business logic*
