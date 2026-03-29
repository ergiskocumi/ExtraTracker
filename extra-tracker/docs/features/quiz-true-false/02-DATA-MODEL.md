# Data Model: Quiz Vero/Falso

## 1. Schema Changes Overview

**Approccio semplificato**: Ogni deck = un capitolo. Il PDF e' gia' caricato e `extractedText` gia' presente. Non servono `pageBreaks` ne' selezione pagine.

### Entita' coinvolte:
- **Deck** (modifica minima) - Solo aggiunta `totalPages` per info UI
- **Card** (nessuna modifica) - Il formato esistente supporta gia' V/F
- **AIUsageLog** (nessuna modifica) - Gia' traccia le chiamate AI

---

## 2. Deck Model - Modifiche

### 2.1 `totalPages` - Numero pagine PDF

Utile per la UI (mostrare "42 pagine" nella preview). Gia' disponibile da `pdf-parse` durante l'upload.

```javascript
// Aggiunta al Deck schema
totalPages: { type: Number, default: 0 }
```

**Popolamento**:
- Nuovi upload: salvato insieme a `extractedText` durante `pdf-parse`
- Deck esistenti: lazy-fill al primo accesso (ricalcolabile da `extractedText` o ri-parse)

### 2.2 Nessun altro campo necessario

- `extractedText` gia' presente (contiene tutto il testo del PDF)
- `savedQuizzes` gia' supporta `quizType: 'true_false'`
- Non servono `pageBreaks` ne' `pageRange` per l'MVP

---

## 3. SavedQuiz Schema - Nessuna modifica strutturale

Lo schema `savedQuizSchema` esistente e' gia' sufficiente:

```javascript
const savedQuizSchema = new Schema({
  name: { type: String, maxlength: 180, default: '' },
  quizType: {
    type: String,
    enum: ['multiple_choice', 'true_false'],  // gia' supportato
    default: 'multiple_choice'
  },
  questionCount: { type: Number, min: 1 },
  sourceCardIds: [{ type: String }],          // ID degli statements generati
  source: {
    type: String,
    enum: ['chapter', 'repeat', 'errors', 'saved'],
    default: 'chapter'
  },
  createdAt: { type: Date, default: Date.now }
});
```

Per i quiz V/F salvati:
- `quizType` = `'true_false'`
- `source` = `'chapter'` (generato dal PDF del capitolo)
- `sourceCardIds` = ID temporanei degli statements (per replay)

**Nota**: Gli statements V/F generati dall'AI non sono persistiti come `cards` nel deck (sono effimeri, generati on-demand). Il `sourceCardIds` nel saved quiz serve per il replay: al replay, il sistema ri-genera dal PDF o usa una cache. Questo e' coerente con il comportamento MCQ attuale.

---

## 4. AI-Generated T/F Statement - Struttura Runtime

Questa struttura vive solo nella sessione di studio (in-memory → frontend state). NON viene persistita nel DB.

```typescript
// Output dall'AI
interface TrueFalseStatement {
  statement: string;           // "La mitosi produce 4 cellule figlie"
  isTrue: boolean;             // false
  explanation: string;         // "La mitosi produce 2 cellule figlie identiche..."
  correctStatement?: string;   // "La mitosi produce 2 cellule figlie" (solo se isTrue=false)
  difficulty: 'standard' | 'hard';
}
```

**Mappatura a Card (per QuizView)**:
```typescript
// Come viene mappato alla Card esistente per riutilizzare QuizView
{
  id: generatedId,
  front: statement.statement,                      // Lo statement da valutare
  back: statement.isTrue ? 'Vero' : 'Falso',      // Risposta corretta
  options: ['Vero', 'Falso'],
  isTrueFalse: true,
  distractorExplanations: {
    [wrongOptionIndex]: statement.explanation       // Spiegazione per risposta sbagliata
  },
  correctStatement: statement.correctStatement,    // Versione corretta (se falso)
  isAiGenerated: true
}
```

---

## 5. Frontend Types - Nuovi/Estesi

### 5.1 Nuovi tipi

```typescript
// In studyService.ts o types/trueFalse.ts

export interface TrueFalseQuizConfig {
  questionCount: number;
}

export interface GenerateTrueFalsePayload {
  questionCount: number;
}
```

### 5.2 Estensione `Deck`

```typescript
// Aggiunta a Deck interface
export interface Deck {
  // ... campi esistenti ...
  totalPages?: number;           // NUOVO - per info UI
}
```

### 5.3 Nessuna modifica a `SavedQuizSnapshot`

L'interfaccia esistente supporta gia' `quizType: 'true_false'`. Nessun campo nuovo necessario.

---

## 6. Zod Validation Schemas

### Backend (server/validators/)

```typescript
// trueFalseQuizSchema.js
import { z } from 'zod';

export const generateTrueFalseSchema = z.object({
  questionCount: z.number().int().min(3).max(50).default(10)
});
```

Il `saveQuizSnapshotSchema` esistente non richiede modifiche.

---

## 7. Compatibilita' Backward

| Cambio | Backward Compatible? | Note |
|--------|---------------------|------|
| `totalPages` su Deck | Si | Default `0`, campo opzionale |
| Tipi frontend | Si | Solo aggiunte, nessuna rimozione |

**Nessuna migrazione distruttiva richiesta. Nessun nuovo indice MongoDB necessario.**
