# Frontend Design: Quiz Vero/Falso

## 1. Component Architecture

```
src/features/study/
├── components/
│   ├── Deck/
│   │   ├── DeckDetailContent.tsx        (MODIFICATO - aggiunta sezione V/F)
│   │   └── TrueFalseQuizLauncher.tsx    (NUOVO - lancio quiz V/F dal deck)
│   ├── Study/
│   │   ├── QuizView.tsx                 (MODIFICATO - miglioramento modo V/F)
│   │   ├── SessionStartModal.tsx        (MODIFICATO - opzione V/F inline)
│   │   └── TrueFalseExplanation.tsx     (NUOVO - spiegazione + correzione)
├── services/
│   └── studyService.ts                  (MODIFICATO - nuovo metodo API)
└── types/
    (estensioni inline in studyService.ts)
```

**Rimossi rispetto alla versione precedente**: `PageRangeSelector`, `usePageInfo` (non serve selezione pagine).

---

## 2. Nuovi Componenti

### 2.1 `TrueFalseQuizLauncher`

Sezione nel DeckDetailContent per lanciare un quiz V/F. Semplice: solo scelta numero domande e bottone.

```
+--------------------------------------------------+
|  [CheckCircle icon] Quiz Vero/Falso              |
|                                                  |
|  Genera domande vero/falso dal PDF di questo     |
|  capitolo (42 pagine · ~65.000 caratteri)        |
|                                                  |
|  Numero domande: [  15  ]  (3-50)               |
|                                                  |
|  [ Genera Quiz V/F ]                             |
+--------------------------------------------------+
```

**Props**:
```typescript
interface TrueFalseQuizLauncherProps {
  deckId: string;
  totalPages: number;
  textLength: number;        // extractedText.length (per info UI)
  onLaunch: (session: StudySession) => void;
}
```

**Stato interno**:
```typescript
const [questionCount, setQuestionCount] = useState(10);
const [isGenerating, setIsGenerating] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Flow**:
1. User sceglie numero domande
2. Click "Genera" → chiama `studyService.generateTrueFalseQuiz(deckId, { questionCount })`
3. Loading: "Generazione in corso..." con spinner
4. Successo → `onLaunch(mappedSession)` → naviga a StudySessionPage
5. Errore → mostra messaggio inline

**Visibilita'**: Solo se il deck ha `extractedText` (= PDF caricato).

**Validazione questionCount**:
- Min: 3
- Max: `Math.min(50, Math.floor(textLength / 1000))` (suggerito dal testo disponibile)
- Default: 10

---

### 2.2 `TrueFalseExplanation`

Componente per mostrare la spiegazione dopo la risposta V/F.

**Quando l'utente SBAGLIA**:
```
+--------------------------------------------------+
|  [X rosso] La tua risposta: Vero                 |
|  [Check verde] Risposta corretta: Falso          |
|                                                  |
|  Perche' e' falso:                               |
|  La mitosi produce DUE cellule figlie, non       |
|  quattro. E' la meiosi che produce quattro       |
|  cellule.                                        |
|                                                  |
|  La versione corretta e':                        |
|  "La mitosi produce due cellule figlie           |
|   geneticamente identiche alla cellula madre."   |
+--------------------------------------------------+
```

**Quando l'utente HA RAGIONE**:
```
+--------------------------------------------------+
|  [Check verde] Corretto!                         |
|                                                  |
|  Approfondimento:                                |
|  Il modello a mosaico fluido descrive la         |
|  membrana come un doppio strato di fosfolipidi   |
|  con proteine integrali e periferiche.           |
+--------------------------------------------------+
```

**Props**:
```typescript
interface TrueFalseExplanationProps {
  isTrue: boolean;
  userAnsweredCorrectly: boolean;
  explanation: string;
  correctStatement?: string | null;
}
```

---

## 3. Componenti Modificati

### 3.1 `DeckDetailContent.tsx`

**Dove**: Sidebar destra, sotto la sezione "AI Actions" e sopra "Quiz Salvati".

**Condizione**: Il deck ha `extractedText` (PDF caricato).

```tsx
{/* Sezione Quiz V/F - solo se ha PDF */}
{deck.extractedText && (
  <TrueFalseQuizLauncher
    deckId={deck.id}
    totalPages={deck.totalPages ?? 0}
    textLength={deck.extractedTextLength ?? 0}
    onLaunch={(session) => {
      navigate(`/study/${deck.id}/session?mode=quiz&quizType=true_false`, {
        state: { preparedSession: session }
      });
    }}
  />
)}
```

**Nota su `extractedText`**: Il campo e' `select: false` nel model, quindi non viene inviato al frontend. Serve un flag booleano `hasExtractedText` o la lunghezza `extractedTextLength` nella response del deck. Alternativa: usare `deck.pdfUrl` come proxy (se ha PDF, ha extractedText).

### 3.2 `QuizView.tsx`

**Modifiche per V/F con spiegazione arricchita**:

Quando `isTrueFalse` e l'utente risponde, usare `TrueFalseExplanation` al posto della spiegazione generica:

```tsx
{showExplanation && isTrueFalse ? (
  <TrueFalseExplanation
    isTrue={correctAnswer === 'Vero'}
    userAnsweredCorrectly={isCorrect}
    explanation={explanationText}
    correctStatement={card.correctStatement}
  />
) : showExplanation ? (
  // Spiegazione MCQ esistente (invariata)
  <div>{explanationText}</div>
) : null}
```

**Nessuna altra modifica** a QuizView: il layout bottoni Vero/Falso e la logica di selezione sono gia' implementati.

### 3.3 Session Start Modal (o equivalente)

Aggiungere "Vero/Falso" come opzione modalita':

```
Modalita' di studio:
[Flashcard] [Quiz] [Vero/Falso*] [Typing] [Mix]

* Visibile solo se deck.pdfUrl !== null (ha PDF)
```

Se selezionato "Vero/Falso":
- Mostrare input per numero domande
- Al click "Inizia" → naviga con `quizType=true_false`

---

## 4. Service Layer

### `studyService.ts` - Nuovi metodi

```typescript
// Genera quiz V/F dall'intero PDF del deck
async generateTrueFalseQuiz(
  deckId: string,
  config: { questionCount: number }
): Promise<{ statements: TrueFalseStatement[]; meta: TrueFalseQuizMeta }> {
  const { data } = await apiClient.post(
    `/study/${deckId}/quiz/true-false/generate`,
    config
  );
  return data.data;
}
```

### Tipo per lo statement

```typescript
interface TrueFalseStatement {
  id: string;
  statement: string;
  isTrue: boolean;
  explanation: string;
  correctStatement?: string | null;
  difficulty: 'standard' | 'hard';
}

interface TrueFalseQuizMeta {
  totalGenerated: number;
  trueCount: number;
  falseCount: number;
  generationTimeMs: number;
}
```

### Mappatura Statement → Card

Nel frontend, gli statements vengono mappati a `Card` per riutilizzare `QuizView`:

```typescript
function mapStatementToCard(stmt: TrueFalseStatement): Card {
  return {
    id: stmt.id,
    front: stmt.statement,
    back: stmt.isTrue ? 'Vero' : 'Falso',
    options: ['Vero', 'Falso'],
    isTrueFalse: true,
    distractorExplanations: {
      [stmt.isTrue ? '1' : '0']: stmt.explanation  // Spiegazione sull'opzione sbagliata
    },
    correctStatement: stmt.correctStatement,
    isAiGenerated: true,
    // SM-2 defaults
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    status: 'new'
  };
}
```

---

## 5. State Management

Nessun nuovo Context necessario. Il flusso usa:
- **Local state** nel `TrueFalseQuizLauncher` (questionCount, loading, error)
- **URL state** via query params (mode, quizType) per navigation
- **Navigation state** via `location.state.preparedSession` (session pre-generata)
- **StudySessionPage state** esistente (session, currentCard, stats, ecc.)

---

## 6. UX Flow Dettagliato

### Flow A: Dalla sezione dedicata nel deck

```
1. User apre DeckDetailPage di un capitolo (deck con PDF)
2. Sidebar destra mostra "Quiz Vero/Falso"
3. User vede info: "42 pagine · ~65.000 caratteri"
4. User sceglie numero domande (default 10)
5. User clicca "Genera Quiz V/F"
6. Loading: "Generazione in corso..." con spinner
7. Backend genera statements dall'intero extractedText
8. Redirect a StudySessionPage con session pre-generata
9. QuizView mostra statements V/F uno alla volta
10. User risponde Vero/Falso
11. Feedback + TrueFalseExplanation se sbagliato
12. Al termine: riepilogo + opzione "Salva quiz"
```

### Flow B: Dal modale avvio sessione (inline)

```
1. User clicca "Studia" su un deck con PDF
2. Modale avvio: seleziona "Vero/Falso" come modalita'
3. Input numero domande
4. User clicca "Inizia"
5. Redirect a StudySessionPage con query params
6. Backend genera V/F dall'intero extractedText
7. QuizView mostra statements V/F
```

---

## 7. Responsive Design

### Desktop (>= 1024px)
- `TrueFalseQuizLauncher` nella sidebar destra del DeckDetail
- Layout card-like con info + input + bottone

### Tablet (768px - 1023px)
- `TrueFalseQuizLauncher` sotto le card, full width

### Mobile (< 768px)
- `TrueFalseQuizLauncher` nella bottom action bar come bottone "V/F Quiz"
- Click apre un bottom sheet con input numero domande + bottone genera
- Bottoni Vero/Falso full-width nel QuizView

---

## 8. Loading & Error States

### Generazione in corso
```
+--------------------------------------------------+
|  [spinner]  Generazione quiz Vero/Falso...       |
|                                                  |
|  Analisi del capitolo in corso.                  |
|  Tempo stimato: ~5 secondi                       |
|                                                  |
|  [Annulla]                                       |
+--------------------------------------------------+
```

### Errore: testo insufficiente
```
+--------------------------------------------------+
|  [warning-icon]  Testo insufficiente             |
|                                                  |
|  Il PDF di questo capitolo contiene solo 300     |
|  caratteri di testo. Servono almeno 500          |
|  caratteri per generare un quiz.                 |
|                                                  |
|  Il PDF potrebbe contenere principalmente        |
|  immagini. Prova a caricare un PDF con piu'      |
|  contenuto testuale.                             |
+--------------------------------------------------+
```

### Nessun PDF
Il componente `TrueFalseQuizLauncher` semplicemente non viene renderizzato.

---

## 9. Animazioni

- **Transizione risposta**: Framer Motion `layoutId` per smooth reveal della spiegazione
- **Feedback corretto**: Flash verde + scale up dell'icona check
- **Feedback sbagliato**: Shake animation (gia' esistente in QuizView) + flash rosso
- **Progress bar**: Barra di avanzamento animata in cima alla sessione (gia' esistente)

---

## 10. Accessibilita'

- Bottoni V/F con `aria-label="Vero"` / `aria-label="Falso"`
- Statement con `role="article"` e `aria-live="polite"` per screen reader
- Spiegazione con `aria-expanded` toggle
- Keyboard: `1` = Vero, `2` = Falso, `0` = Non so, `Enter` = Avanti
- Focus management: auto-focus sullo statement dopo ogni transizione
