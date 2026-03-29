# API Design: Quiz Vero/Falso

## 1. Panoramica Endpoints

| Metodo | Endpoint | Descrizione | Nuovo? |
|--------|----------|-------------|--------|
| `POST` | `/api/study/:deckId/quiz/true-false/generate` | Genera quiz V/F dall'intero PDF del deck | NUOVO |
| `GET` | `/api/study/:deckId/session` | Sessione di studio (esteso per V/F) | MODIFICATO |
| `POST` | `/api/study/:deckId/quizzes` | Salva quiz snapshot (invariato) | INVARIATO |

**Rimossi rispetto alla versione precedente**: `GET /pages` (non necessario, niente selezione pagine).

---

## 2. Nuovo Endpoint

### 2.1 `POST /api/study/:deckId/quiz/true-false/generate`

Genera statements V/F via AI dall'intero `extractedText` del deck.

**Request**:
```
POST /api/study/665a1b2c3d4e5f6g7h8i9j0k/quiz/true-false/generate
Content-Type: application/json

{
  "questionCount": 15
}
```

**Validazione (Zod)**:
```typescript
{
  questionCount: z.number().int().min(3).max(50).default(10)
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "statements": [
      {
        "id": "tf_1",
        "statement": "La mitosi produce quattro cellule figlie geneticamente identiche alla cellula madre.",
        "isTrue": false,
        "explanation": "La mitosi produce due (non quattro) cellule figlie geneticamente identiche. E' la meiosi che produce quattro cellule, ma geneticamente diverse.",
        "correctStatement": "La mitosi produce due cellule figlie geneticamente identiche alla cellula madre.",
        "difficulty": "standard"
      },
      {
        "id": "tf_2",
        "statement": "Il DNA e' composto da quattro basi azotate: adenina, guanina, citosina e timina.",
        "isTrue": true,
        "explanation": "Corretto. Le quattro basi azotate del DNA sono adenina (A), guanina (G), citosina (C) e timina (T).",
        "correctStatement": null,
        "difficulty": "standard"
      }
    ],
    "meta": {
      "totalGenerated": 15,
      "trueCount": 7,
      "falseCount": 8,
      "generationTimeMs": 4200,
      "textLength": 65000,
      "totalPages": 42
    }
  }
}
```

**Response 400** (deck senza PDF):
```json
{
  "success": false,
  "error": {
    "message": "Questo deck non ha un PDF caricato. Carica un PDF per generare quiz Vero/Falso.",
    "code": "NO_PDF_TEXT"
  }
}
```

**Response 400** (testo insufficiente):
```json
{
  "success": false,
  "error": {
    "message": "Il testo estratto dal PDF e' troppo corto per generare 15 domande. Testo disponibile: 300 caratteri. Suggerimento: riduci il numero di domande o carica un PDF con piu' contenuto testuale.",
    "code": "INSUFFICIENT_TEXT",
    "details": {
      "availableChars": 300,
      "requestedQuestions": 15,
      "suggestedMaxQuestions": 3
    }
  }
}
```

**Response 502** (AI failure):
```json
{
  "success": false,
  "error": {
    "message": "Errore durante la generazione delle domande. Riprova tra qualche secondo.",
    "code": "AI_GENERATION_FAILED"
  }
}
```

---

## 3. Endpoint Modificato

### 3.1 `GET /api/study/:deckId/session` (estensione)

**Comportamento attuale per V/F**: Usa `_transformToTrueFalse()` (trasformazione naive delle card).

**Nuovo comportamento**: Se `quizType=true_false` e il deck ha `extractedText`, usa il generatore AI.

**Query params**:
```
?mode=quiz
&quizType=true_false
&questionCount=15
```

**Logica backend aggiornata**:
```
if (quizType === 'true_false') {
  if (deck.extractedText) {
    // NUOVO: generazione AI dall'intero PDF
    statements = await trueFalseGenerator.generate(deck.extractedText, questionCount);
    cards = mapStatementsToCards(statements);
  } else {
    // FALLBACK: trasformazione naive card-based (backward compat)
    cards = _transformToTrueFalse(deckCards, allAnswers);
  }
}
```

**Response** (campo `meta` esteso):
```json
{
  "meta": {
    "quizType": "true_false",
    "questionCount": 15,
    "aiGenerated": true
  }
}
```

### 3.2 `POST /api/study/:deckId/quizzes` (invariato)

Nessuna modifica necessaria. Il payload esistente supporta gia' quiz V/F:

```json
{
  "name": "Quiz V/F Capitolo 3",
  "quizType": "true_false",
  "questionCount": 15,
  "sourceCardIds": ["tf_1", "tf_2", "tf_3"],
  "source": "chapter"
}
```

---

## 4. Flow Sequences

### 4.1 Generazione dalla sezione dedicata nel deck

```
Frontend                        Backend
   |                               |
   | [User clicca "Quiz V/F"       |
   |  e sceglie N domande]         |
   |                               |
   |-- POST /quiz/true-false/ ---->|
   |   generate                    |-- Legge deck.extractedText
   |   { questionCount: 15 }       |-- Chunking (5000 chars, 500 overlap)
   |                               |-- Per ogni chunk: chiama OpenAI
   |                               |-- Valida e filtra output
   |<-- { statements[] } ---------|
   |                               |
   | [Mappa statements a session]  |
   | [Naviga a StudySessionPage]   |
   | (state: preparedSession)      |
   |                               |
   | [User completa il quiz]       |
   |                               |
   |-- POST /study/:id/quizzes -->|
   |   { quizType: 'true_false' } |-- Salva snapshot
   |<-- { savedQuiz } ------------|
```

### 4.2 Generazione inline dal study session

```
Frontend                        Backend
   |                               |
   | [User avvia sessione con      |
   |  mode=quiz, quizType=true_false]
   |                               |
   |-- GET /study/:id/session ---->|
   |   ?mode=quiz                  |-- Legge deck.extractedText
   |   &quizType=true_false        |-- Genera V/F via AI
   |   &questionCount=15           |-- Mappa a cards
   |<-- { session + cards[] } ----|
   |                               |
   | [Studio V/F]                  |
```

---

## 5. Error Handling

| Codice | Situazione | HTTP Status |
|--------|-----------|-------------|
| `NO_PDF_TEXT` | Deck senza PDF caricato / senza extractedText | 400 |
| `INSUFFICIENT_TEXT` | Testo estratto troppo corto per il numero di domande | 400 |
| `AI_GENERATION_FAILED` | OpenAI ha fallito (timeout, rate limit) | 502 |
| `AI_VALIDATION_FAILED` | Output AI non valido dopo retry | 502 |
| `RATE_LIMIT_EXCEEDED` | Utente ha superato il budget AI giornaliero | 429 |

---

## 6. Rate Limiting

- **Endpoint generate**: Max 5 richieste/minuto per utente
- **Budget AI**: Integrato con il sistema `AIUsageLog` esistente
- **Telemetry**: Ogni generazione logga `{ feature: 'true_false_quiz', model, tokens, cost }`

---

## 7. Caching

- **Generated statements**: NON cacheable (ogni generazione deve essere unica per valore pedagogico)
- **Saved quizzes**: Gia' persistiti in MongoDB (nessun caching aggiuntivo)
