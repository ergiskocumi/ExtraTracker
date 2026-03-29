# Architettura Quiz Persistiti e Retake Adattivo

## Stato

- Status: proposta di progetto
- Owner: Study domain
- Scope: quiz AI `multiple_choice` + `true_false`
- Obiettivo: persistenza reale in MongoDB prima dell'uso e retake guidato da algoritmo, non da shuffle casuale

---

## 1. Perché intervenire adesso

Dall'analisi del codice attuale emergono quattro limiti strutturali:

1. Il quiz AI viene preparato in sessione e solo dopo il frontend prova a salvarlo.
   - Oggi succede in [DeckDetailPage.tsx](C:\Users\Desktop\Documents\Development\SilviOs\extra-tracker\src\features\study\pages\DeckDetailPage.tsx): il quiz parte anche se `saveQuizSnapshot` fallisce.
2. La persistenza esiste, ma è un embedded snapshot nel deck, non la sorgente primaria del flusso quiz.
   - Oggi vive in [Deck.js](C:\Users\Desktop\Documents\Development\SilviOs\extra-tracker\server\models\Deck.js) dentro `savedQuizzes`.
3. Il retake persistito oggi fa solo shuffle Fisher-Yates dell'intero set.
   - Oggi succede in [deckCrud.js](C:\Users\Desktop\Documents\Development\SilviOs\extra-tracker\server\services\study\deckCrud.js) in `getSavedQuizForRetake`.
4. I tentativi salvano solo aggregate e `wrongQuestionIndices`, non abbastanza dati per un algoritmo serio.
   - Oggi `recordQuizAttempt` salva score, accuracy, tempo e indici sbagliati, ma non il risultato per singola domanda.

Conclusione pratica: MongoDB oggi viene usato come storico leggero, non come motore del quiz.

---

## 2. Obiettivo di prodotto

Quando un quiz AI viene generato:

1. deve essere persistito in MongoDB prima di essere usato nella sessione;
2. deve avere un ID stabile e domande stabili;
3. ogni domanda deve accumulare segnali di performance;
4. il retake deve scegliere e ordinare le domande in base a parametri e priorità di ripasso;
5. il comportamento deve valere sia per `multiple_choice` sia per `true_false`.

---

## 3. Decisione architetturale

### Decisione

Introdurre un modello first-class per i quiz AI persistiti, separato dal `Deck`, e usare il `Deck` solo come contenitore del materiale di studio.

### Perché

- `Deck.savedQuizzes` embedded funziona per listing leggero, ma scala male come base dati di un algoritmo.
- Il retake adattivo richiede:
  - domande persistite con identificatore stabile;
  - statistiche per singola domanda;
  - cronologia tentativi dettagliata;
  - query dedicate per deck, exam, quiz, utente.

### Impatto

- `savedQuizzes` nel `Deck` diventa legacy/read-model temporaneo.
- La sorgente vera dei quiz passa a una nuova collection MongoDB.

---

## 4. Nuovi modelli dati

## 4.1 `QuizDefinition`

Collection nuova: un documento per ogni quiz AI creato.

```ts
type QuizDefinition = {
  _id: ObjectId;
  user: ObjectId;
  deckId: ObjectId;
  examId?: ObjectId | null;
  name: string;
  quizType: 'multiple_choice' | 'true_false';
  source: 'chapter' | 'repeat' | 'errors' | 'saved';
  origin: {
    kind: 'ai_pdf' | 'ai_cards' | 'legacy_embedded';
    pdfBased: boolean;
    sourceCardIds: string[];
    generatedFromTextHash?: string;
    aiModel?: string;
    promptVersion?: string;
  };
  questionCount: number;
  questions: QuizQuestionDefinition[];
  status: 'ready' | 'archived';
  createdAt: Date;
  updatedAt: Date;
};
```

```ts
type QuizQuestionDefinition = {
  questionId: string;
  positionSeed: number;
  questionText: string;
  correctAnswer: string;
  options: string[];
  distractors: string[];
  distractorExplanations: string[];
  correctAnswerExplanation: string;
  difficulty: 'standard' | 'hard';
  questionType: 'multiple_choice' | 'true_false';
  correctStatement?: string | null;
  sourceCardId?: string | null;
  stats: {
    shownCount: number;
    correctCount: number;
    wrongCount: number;
    wrongStreak: number;
    lastSeenAt?: Date | null;
    lastCorrectAt?: Date | null;
    averageResponseMs?: number | null;
    masteryScore: number;
    reviewPriority: number;
  };
};
```

### Note

- `questions[]` è persistito integralmente.
- `stats` vive per domanda e viene aggiornato a ogni tentativo.
- `questionId` è stabile e non va rigenerato a ogni sessione.

## 4.2 `QuizAttempt`

Collection nuova: un documento per ogni esecuzione del quiz.

```ts
type QuizAttempt = {
  _id: ObjectId;
  user: ObjectId;
  quizId: ObjectId;
  deckId: ObjectId;
  examId?: ObjectId | null;
  strategy: {
    mode: 'full' | 'weak_first' | 'errors_only' | 'spaced_mix';
    targetCount: number;
    seed: string;
    params: {
      wrongWeight: number;
      recencyWeight: number;
      difficultyWeight: number;
      noveltyWeight: number;
      shuffleStrength: number;
    };
  };
  orderedQuestionIds: string[];
  results: QuizAttemptQuestionResult[];
  score: number;
  accuracy: number;
  timeSeconds: number;
  startedAt: Date;
  completedAt: Date;
};
```

```ts
type QuizAttemptQuestionResult = {
  questionId: string;
  shownIndex: number;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseMs?: number | null;
  skipped?: boolean;
};
```

### Perché separare `QuizAttempt`

- audit chiaro;
- analytics future;
- nessuna crescita incontrollata del documento `QuizDefinition`.

---

## 5. Cosa facciamo del vecchio `Deck.savedQuizzes`

### Strategia consigliata

Fase 1:
- mantenerlo compatibile in lettura;
- non usarlo più come sorgente primaria;
- opzionalmente salvarci solo un summary leggero con `quizId`, `name`, `quizType`, `questionCount`, `createdAt`.

Fase 2:
- listing quiz e retake alimentati da `QuizDefinition`;
- migrazione dei quiz embedded esistenti solo se hanno `questions`.

### Decisione CO-PM

Non conviene continuare a investire sull'embedded array come modello finale.

---

## 6. Flusso corretto di generazione

## 6.1 Nuovo flusso backend-first

1. Il frontend chiede `POST /api/study/:deckId/quizzes/generate`.
2. Il backend genera le domande AI.
3. Il backend persiste `QuizDefinition`.
4. Il backend ritorna:
   - `quizId`
   - `sessionCards`
   - `quizSummary`
5. Il frontend apre la sessione usando `quizId`, non `sourceCardIds` sintetici.

### Conseguenza importante

Se il salvataggio Mongo fallisce, il quiz non parte.

Questa è la regola giusta se vogliamo "salvati realmente" e non "best effort".

---

## 7. Flusso corretto di retake

## 7.1 Nuovo entry point

`POST /api/study/:deckId/quizzes/:quizId/retake-session`

Body esempio:

```json
{
  "mode": "weak_first",
  "targetCount": 10,
  "params": {
    "wrongWeight": 0.4,
    "recencyWeight": 0.25,
    "difficultyWeight": 0.15,
    "noveltyWeight": 0.1,
    "shuffleStrength": 0.1
  }
}
```

Response:

```json
{
  "quizId": "...",
  "strategy": { "...": "..." },
  "cards": [],
  "meta": {
    "questionCount": 10,
    "quizType": "multiple_choice"
  }
}
```

### Perché così

- il backend decide quali domande riproporre;
- il frontend non ricalcola nulla;
- la stessa logica funziona anche dopo refresh.

---

## 8. Algoritmo di retake proposto

## 8.1 Input

Per ogni domanda usiamo:

- `wrongCount`
- `correctCount`
- `wrongStreak`
- `lastSeenAt`
- `averageResponseMs`
- `difficulty`
- `shownCount`

## 8.2 Score di priorità

Formula iniziale semplice e spiegabile:

```ts
errorRate = wrongCount / max(shownCount, 1)
recencyBoost = daysSinceLastSeen capped 0..1
difficultyBoost = difficulty === 'hard' ? 1 : 0
noveltyBoost = shownCount === 0 ? 1 : 0

reviewPriority =
  wrongWeight * errorRate +
  0.25 * normalize(wrongStreak) +
  recencyWeight * recencyBoost +
  difficultyWeight * difficultyBoost +
  noveltyWeight * noveltyBoost
```

## 8.3 Come viene costruito l'ordine

1. calcolo `reviewPriority` per tutte le domande;
2. filtro in base al `mode`;
3. prendo le migliori `targetCount`;
4. applico un `weighted shuffle` leggero dentro bucket di priorità simile.

### Risultato

- non sempre stesso ordine;
- non puro random;
- le domande deboli restano davanti;
- due retake consecutivi non sono identici.

## 8.4 Modalità iniziali supportate

- `full`: tutte le domande del quiz, ordine adattivo
- `weak_first`: prima le più deboli, poi mix
- `errors_only`: solo domande sbagliate almeno una volta
- `spaced_mix`: blend tra deboli, vecchie e mai viste

---

## 9. Aggiornamento statistiche dopo ogni tentativo

Alla chiusura del quiz non dobbiamo salvare solo score aggregato.

Dobbiamo:

1. creare `QuizAttempt`;
2. aggiornare `QuizDefinition.questions[].stats` per ogni `questionId`;
3. ricalcolare `masteryScore` e `reviewPriority`.

### Formula iniziale di `masteryScore`

```ts
masteryScore =
  0.5 * successRate +
  0.2 * recencySuccess +
  0.2 * streakSignal +
  0.1 * speedSignal
```

Non è il modello finale, ma è sufficiente per partire in modo deterministico e migliorabile.

---

## 10. API target

## 10.1 Generate

`POST /api/study/:deckId/quizzes/generate`

Body:

```json
{
  "quizType": "true_false",
  "questionCount": 10,
  "source": "chapter"
}
```

## 10.2 List by deck

`GET /api/study/:deckId/quizzes`

## 10.3 List by exam

`GET /api/study/exam/:examId/quizzes`

## 10.4 Retake session

`POST /api/study/:deckId/quizzes/:quizId/retake-session`

## 10.5 Review detail

`GET /api/study/:deckId/quizzes/:quizId`

## 10.6 Record attempt

`POST /api/study/:deckId/quizzes/:quizId/attempts`

Payload completo per domanda, non solo score aggregato.

---

## 11. Cambi frontend richiesti

## 11.1 Deck detail

In [DeckDetailPage.tsx](C:\Users\Desktop\Documents\Development\SilviOs\extra-tracker\src\features\study\pages\DeckDetailPage.tsx):

- eliminare il salvataggio opportunistico post-`getSession`;
- usare direttamente l'endpoint `generate`;
- ricevere `quizId` dal backend;
- aprire la sessione con `savedQuizId/quizId` già valorizzato.

## 11.2 Study session

In [useSessionLoader.ts](C:\Users\Desktop\Documents\Development\SilviOs\extra-tracker\src\features\study\hooks\useStudySession\useSessionLoader.ts):

- se c'è `quizId`, caricare dal quiz persistito;
- non dipendere più da `sourceCardIds` sintetici per ricostruire la sessione;
- refresh-safe by design.

## 11.3 Completion

In [useStudyCompletion.ts](C:\Users\Desktop\Documents\Development\SilviOs\extra-tracker\src\features\study\hooks\useStudySession\useStudyCompletion.ts):

- inviare i risultati per domanda;
- includere ordine mostrato e risposta selezionata;
- opzionale Fase 2: response time per domanda.

---

## 12. Compatibilità con i quiz attuali

### Legacy da supportare

- quiz embedded con `questions` presenti;
- quiz embedded senza `questions` che oggi rigenerano via AI.

### Strategia

1. nuovi quiz AI vanno solo sul nuovo modello;
2. retake di quiz nuovi usa solo `QuizDefinition`;
3. quiz legacy restano leggibili in fallback;
4. migrazione one-shot solo per i legacy con snapshot completo.

---

## 13. Piano di implementazione consigliato

## Fase A

- introdurre `QuizDefinition` e `QuizAttempt`
- endpoint `generate`
- salvataggio backend-first

## Fase B

- cambiare frontend deck/session per usare `quizId`
- rendere il refresh completamente safe

## Fase C

- salvare risultati per domanda
- calcolare `reviewPriority`

## Fase D

- introdurre `retake-session` con strategie
- UI parametri retake

## Fase E

- migrazione legacy embedded
- cleanup del vecchio `savedQuizzes`

---

## 14. Rischi tecnici

1. Migrazione parziale: per un periodo convivranno nuovo e vecchio flusso.
2. Crescita dati: i tentativi per quiz vanno separati in collection dedicata.
3. Concorrenza: aggiornare stats per domanda richiede update atomici chiari.
4. UX: serve evitare doppio click e doppia generazione sul bottone quiz.

---

## 15. Decisioni già prese

- Il quiz AI deve essere persistito prima dell'apertura sessione.
- La persistenza deve essere backend-first.
- Il retake non deve più essere un semplice shuffle random.
- L'algoritmo deve lavorare su dati per singola domanda.
- La soluzione deve coprire sia `multiple_choice` sia `true_false`.

---

## 16. Next step

Se allineati su questa architettura, il passo successivo è:

1. creare i nuovi model Mongo;
2. introdurre l'endpoint `POST /quizzes/generate`;
3. rifare il flusso frontend di avvio quiz attorno a `quizId`.

Questa è la sequenza più pulita e con il miglior rapporto rischio/valore.
