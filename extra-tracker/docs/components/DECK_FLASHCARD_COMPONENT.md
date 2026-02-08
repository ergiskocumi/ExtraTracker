# Deck/Flashcard Component - Documentazione Tecnica

**Silvi - Spaced Repetition System**  
*Versione 1.0 - Febbraio 2026*

---

## 📑 Indice

1. [Introduzione](#introduzione)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Flussi di Comunicazione](#flussi-di-comunicazione)
5. [Sicurezza](#sicurezza)
6. [Configurazione](#configurazione)
7. [Glossario](#glossario)

---

## Introduzione

### Panoramica del Componente

Il componente **Deck/Flashcard** è il nucleo del sistema di apprendimento di Silvi. Implementa un sistema completo di gestione mazzi di flashcard con le seguenti caratteristiche principali:

- **Spaced Repetition**: Implementazione degli algoritmi SM-2, FSRS e Leitner
- **Multi-Modalità**: Flashcard, Quiz (multiple choice), Typing, Mix, Sprint, Focus, Exam
- **AI Integration**: Generazione automatica di flashcard da PDF tramite OpenAI
- **Source Grounding**: Tracciamento della fonte originale nel PDF per ogni flashcard
- **Exam Integration**: Collegamento diretto con il sistema di gestione esami
- **Multi-Tenancy**: Isolamento completo dei dati per utente

### Architettura Generale

```
┌──────────────┐      HTTPS/JSON      ┌──────────────┐
│   Client     │◄────────────────────►│  API Layer   │
│ React + TS   │                      │ Express + MW │
└──────────────┘                      └──────┬───────┘
                                             │
                                             │ tenantScope
                                             ▼
                                      ┌──────────────┐
                                      │ Service Layer│
                                      │   Business   │
                                      │    Logic     │
                                      └──────┬───────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         │                   │                   │
                         ▼                   ▼                   ▼
                  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                  │   MongoDB    │   │   OpenAI     │   │   Redis      │
                  │  (Mongoose)  │   │   (GPT-4)    │   │  (optional)  │
                  └──────────────┘   └──────────────┘   └──────────────┘
```

### Struttura dei File

```
# BACKEND
server/
├── models/
│   ├── Deck.js              # Schema MongoDB (cards embedded)
│   ├── Exam.js              # Schema esami (relazione opzionale)
│   └── Folder.js            # Schema cartelle
├── controllers/
│   └── studyController.js   # HTTP request handlers
├── services/
│   ├── studyService.js      # Business logic + AI generation
│   ├── pdfCacheService.js   # Caching PDF parsing
│   └── vectorStoreService.js # Vector DB per RAG
├── routes/
│   └── study.js             # Route definitions (/api/study)
├── plugins/
│   └── multiTenancy.js      # Tenant isolation plugin
└── middleware/
    ├── auth.js              # JWT verification
    ├── tenantContext.js     # Tenant extraction
    └── rateLimiter.js       # Rate limiting

# FRONTEND
src/features/study/
├── services/
│   └── studyService.ts      # API client + normalization
├── components/
│   ├── DeckCard/            # Visualizzazione deck
│   ├── Flashcard/           # Studio flashcard
│   ├── DeckSections/        # Organizzazione folder
│   └── Modals/              # Modali (create, edit, etc.)
├── pages/
│   ├── DeckDetailPage.tsx   # Pagina dettaglio deck
│   └── StudySessionPage.tsx # Sessione di studio
└── hooks/
    └── useDashboardData.ts  # Data fetching hooks
```

---

## Backend Architecture

### Data Model: Deck Schema

Il modello Deck utilizza uno schema MongoDB con **embedded documents** per le cards. Questa scelta progettuale è ottimale perché:
- Le cards sono sempre accedute nel contesto del loro deck
- Non ci sono relazioni many-to-many complesse
- Le operazioni di lettura sono atomiche (single document)

#### Card Sub-Schema

```javascript
const cardSchema = new mongoose.Schema({
    // Contenuto
    front: { 
        type: String, 
        required: true, 
        maxlength: 2000,
        trim: true 
    },
    back: { 
        type: String, 
        required: true, 
        maxlength: 4000,
        trim: true 
    },
    
    // Parametri SM-2
    easinessFactor: { 
        type: Number, 
        default: 2.5, 
        min: 1.3  // Minimo teorico SM-2
    },
    interval: { 
        type: Number, 
        default: 0  // Giorni fino alla prossima review
    },
    repetitions: { 
        type: Number, 
        default: 0  // Numero di ripetizioni consecutive corrette
    },
    nextReviewDate: { 
        type: Date, 
        default: Date.now 
    },
    status: { 
        type: String, 
        enum: ['new', 'learning', 'review', 'mastered'],
        default: 'new'
    },
    
    // Parametri FSRS (Free Spaced Repetition Scheduler)
    stability: { 
        type: Number, 
        default: 0.4  // Stabilità della memoria
    },
    
    // Parametri Leitner
    box: { 
        type: Number, 
        default: 1, 
        min: 1  // Scatola corrente nel sistema Leitner
    },
    
    // History tracking
    lastReviewed: { type: Date, default: null },
    reviewHistory: [{
        date: { type: Date, default: Date.now },
        rating: { type: Number, min: 1, max: 5 },  // Qualità risposta
        interval: Number,      // Intervallo usato
        easinessFactor: Number, // EF dopo questa review
        repetitions: Number,   // Rep count dopo questa review
        algorithm: String      // Algoritmo usato
    }],
    
    // Source Grounding (tracciamento fonte PDF)
    sourceMetadata: {
        pageNumber: { 
            type: Number, 
            required: true, 
            min: 1 
        },
        originalText: { 
            type: String, 
            required: true, 
            minlength: 150  // Contesto sufficiente per identificare fonte
        }
    }
}, { _id: true });  // Ogni card ha il proprio _id
```

#### Deck Schema (Parent)

```javascript
const deckSchema = new mongoose.Schema({
    // Relazioni
    examId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Exam', 
        default: null, 
        index: true 
    },
    folderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Folder', 
        default: null, 
        index: true 
    },
    
    // Contenuto base
    title: { 
        type: String, 
        required: [true, 'Il titolo è obbligatorio'], 
        trim: true,
        maxlength: 120 
    },
    description: { 
        type: String, 
        default: '',
        trim: true,
        maxlength: 500 
    },
    
    // PDF source
    pdfUrl: { type: String, default: '' },
    extractedText: { 
        type: String, 
        default: '', 
        select: false  // Non incluso di default nelle query
    },
    
    // Organizzazione
    tags: {
        type: [String],
        default: [],
        set: normalizeTags,  // Funzione che normalizza e deduplica
        validate: {
            validator: (tags) => tags.length <= 5,
            message: 'Massimo 5 tag per deck'
        }
    },
    
    // Cards (embedded)
    cards: { type: [cardSchema], default: [] },
    
    // Settings
    algorithm: {
        type: String,
        enum: ['sm2', 'fsrs', 'leitner', 'anki'],
        default: 'sm2'
    },
    aiSettings: {
        style: {
            type: String,
            enum: ['comprehensive', 'conceptual', 'factual', 'application'],
            default: 'comprehensive'
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard', 'mixed'],
            default: 'medium'
        },
        questionTypes: {
            type: [String],
            default: ['definition', 'concept', 'relationship']
        }
    }
}, { 
    timestamps: true  // Aggiunge createdAt e updatedAt
});

// Indici per performance
deckSchema.index({ user: 1, examId: 1 });
deckSchema.index({ user: 1, folderId: 1 });
deckSchema.index({ user: 1, tags: 1 });
deckSchema.index({ user: 1, 'cards.nextReviewDate': 1 });
```

### Multi-Tenancy Implementation

Il sistema implementa il multi-tenancy tramite **Row-Level Security**: ogni query include automaticamente il filtro `user`.

#### Multi-Tenancy Plugin

```javascript
// server/plugins/multiTenancy.js
function multiTenancyPlugin(schema, options = {}) {
    const tenantField = options.tenantField || 'user';
    
    // Aggiungi campo user a tutti i documenti
    schema.add({
        [tenantField]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: options.required,
            index: true
        }
    });
    
    // Pre-hook per auto-filtrare per tenant
    schema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], 
        function() {
            const tenantScope = this.options?.tenantScope;
            if (tenantScope?.userId) {
                this.where({ [tenantField]: tenantScope.userId });
            }
        }
    );
    
    // Post-hook per pulire dati sensibili nelle risposte
    schema.set('toJSON', {
        virtuals: true,
        versionKey: false,
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.user;  // Nascondi sempre il campo user
            delete ret.__v;
            return ret;
        }
    });
}
```

#### Tenant Context Middleware

```javascript
// server/middleware/tenantContext.js
function tenantContext(options = {}) {
    return (req, res, next) => {
        // Estrai userId dal JWT verificato da requireAuth
        const userId = req.user?.id || req.user?._id;
        
        if (options.required && !userId) {
            return res.status(401).json({ 
                success: false, 
                error: { message: 'Authentication required' } 
            });
        }
        
        // Espandi req con tenantScope
        req.tenantScope = { userId };
        next();
    };
}
```

#### Utilizzo nelle Routes

```javascript
// server/routes/study.js
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');

// Applica a tutte le routes
router.use(requireAuth);
router.use(tenantContext({ required: true }));

// Ogni query nel controller avrà automaticamente filter: { user: userId }
router.get('/dashboard', studyController.getDashboard);
router.get('/:id', studyController.getDeckById);
router.post('/', studyController.createDeck);
```

### Service Layer: StudyService

Il StudyService estende BaseService e implementa la business logic completa.

#### Architettura Base

```javascript
// server/services/studyService.js
class StudyService extends BaseService {
    constructor() {
        super(Deck, {
            searchFields: ['title', 'description', 'tags'],
            defaultSort: { createdAt: -1 },
            entityName: 'Mazzo',
        });
    }
    
    // Helper per estrarre userId dal tenantScope
    _getUserId(tenantScope) {
        const userId = tenantScope?.userId;
        if (!userId) throw AppError.unauthorized();
        return userId;
    }
    
    // Serializzazione deck
    _serializeDeck(deck) {
        if (deck.toJSON) return deck.toJSON();
        return deck.toObject ? deck.toObject() : deck;
    }
}
```

#### CRUD Operations

```javascript
// CREATE
async createDeck(tenantScope, { examId, title, description, tags }) {
    // Validazione
    if (!title || typeof title !== 'string') {
        throw AppError.validation('Il titolo del mazzo è obbligatorio');
    }
    
    // Verifica ownership esame se specificato
    if (examId) {
        await this._validateExamOwnership(tenantScope, examId);
    }
    
    return this.create(tenantScope, {
        examId: examId || null,
        title: title.trim(),
        description: description?.trim(),
        tags,
    });
}

// UPDATE
async updateDeck(tenantScope, deckId, updates) {
    const userId = this._getUserId(tenantScope);
    
    // Trova deck con filtro user (sicurezza)
    const deck = await Deck.findOne({ _id: deckId, user: userId });
    if (!deck) throw AppError.notFound('Mazzo');
    
    // Aggiornamento folderId
    if (updates.folderId !== undefined) {
        if (updates.folderId !== null && updates.folderId !== '') {
            const Folder = require('../models/Folder');
            const folder = await Folder.findOne({ 
                _id: updates.folderId, 
                user: userId 
            });
            if (!folder) throw AppError.notFound('Cartella');
            deck.folderId = updates.folderId;
        } else {
            deck.folderId = null;
        }
    }
    
    // Aggiornamento examId
    if (updates.examId !== undefined) {
        if (updates.examId !== null && updates.examId !== '') {
            const exam = await Exam.findOne({ 
                _id: updates.examId, 
                user: userId 
            });
            if (!exam) throw AppError.notFound('Esame');
            deck.examId = updates.examId;
        } else {
            deck.examId = null;
        }
    }
    
    await deck.save();
    return this._serializeDeck(deck);
}

// DELETE
async deleteDeck(tenantScope, deckId) {
    return this.delete(tenantScope, deckId);  // Dal BaseService
}
```

#### Card Operations

```javascript
// ADD CARD
async addCard(tenantScope, deckId, { front, back }) {
    const userId = this._getUserId(tenantScope);
    
    if (!front?.trim()) throw AppError.validation('Front è obbligatorio');
    if (!back?.trim()) throw AppError.validation('Back è obbligatorio');
    
    const deck = await Deck.findOneAndUpdate(
        { _id: deckId, user: userId },
        { $push: { cards: { front: front.trim(), back: back.trim() } } },
        { new: true, runValidators: true }
    );
    
    if (!deck) throw AppError.notFound('Mazzo');
    return deck;
}

// UPDATE CARD
async updateCard(tenantScope, deckId, cardId, { front, back }) {
    const userId = this._getUserId(tenantScope);
    
    const deck = await Deck.findOneAndUpdate(
        { 
            _id: deckId, 
            user: userId,
            'cards._id': cardId  // Match card specifica
        },
        {
            $set: {
                'cards.$.front': front.trim(),
                'cards.$.back': back.trim(),
            },
        },
        { new: true, runValidators: true }
    );
    
    if (!deck) throw AppError.notFound('Mazzo o carta');
    return deck;
}

// DELETE CARD
async deleteCard(tenantScope, deckId, cardId) {
    const userId = this._getUserId(tenantScope);
    
    const deck = await Deck.findOneAndUpdate(
        { _id: deckId, user: userId },
        { $pull: { cards: { _id: cardId } } },  // Rimuovi card con _id specifico
        { new: true }
    );
    
    if (!deck) throw AppError.notFound('Mazzo');
    return deck;
}

// REORDER CARDS
async reorderCards(tenantScope, deckId, cardIds) {
    const userId = this._getUserId(tenantScope);
    
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
        throw AppError.validation('Devi fornire un array di card IDs');
    }
    
    // Recupera deck corrente
    const deck = await Deck.findOne({ _id: deckId, user: userId });
    if (!deck) throw AppError.notFound('Mazzo');
    
    // Verifica validità cardIds
    const existingCardIds = deck.cards.map(c => c._id.toString());
    const invalidIds = cardIds.filter(id => !existingCardIds.includes(id));
    if (invalidIds.length > 0) {
        throw AppError.validation(`Card IDs non validi: ${invalidIds.join(', ')}`);
    }
    
    // Riordina
    const cardMap = new Map(deck.cards.map(c => [c._id.toString(), c.toObject()]));
    deck.cards = cardIds.map(id => cardMap.get(id));
    
    await deck.save();
    return deck;
}
```

### Spaced Repetition Algorithms

#### Algoritmo SM-2 (Default)

L'algoritmo SM-2 è implementato nella `AlgorithmFactory`:

```javascript
// server/services/spacedRepetitionAlgorithms.js
class SM2Algorithm {
    processReview(card, quality) {
        const MIN_EF = 1.3;
        let { easinessFactor, interval, repetitions } = card;
        
        // Formula SM-2 per EF
        easinessFactor = Math.max(
            MIN_EF,
            easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        );
        
        // Calcola nuovo intervallo
        if (quality < 3) {
            // Risposta difficile: resetta
            repetitions = 0;
            interval = 1;
        } else {
            // Risposta corretta: incrementa intervallo
            repetitions += 1;
            if (repetitions === 1) interval = 1;
            else if (repetitions === 2) interval = 6;
            else interval = Math.round(interval * easinessFactor);
        }
        
        // Calcola prossima data
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);
        
        return {
            easinessFactor,
            interval,
            repetitions,
            nextReviewDate,
            status: this._resolveStatus(quality, repetitions, interval)
        };
    }
    
    _resolveStatus(quality, repetitions, interval) {
        if (quality < 3) return 'learning';
        if (repetitions >= 5 && interval >= 21) return 'mastered';
        if (repetitions > 0) return 'review';
        return 'new';
    }
}
```

**Formule SM-2:**

```
EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
EF' ≥ 1.3

I_n = {
    1                    if n = 1
    6                    if n = 2
    I_{n-1} × EF         if n > 2 and q ≥ 3
    1                    if q < 3
}
```

Dove:
- `q` = qualità della risposta (1-5)
- `n` = numero di ripetizioni
- `EF` = easiness factor
- `I` = intervallo in giorni

#### Selezione Cards per Sessione

```javascript
_selectSessionCards({ cards, dueCards, mode, focus, limit, now }) {
    const due = cards.filter(c => new Date(c.nextReviewDate) <= now);
    
    switch (focus) {
        case 'due':
            // Solo cards effettivamente in scadenza
            return due.slice(0, limit);
            
        case 'weak':
            // Cards con easiness factor basso (difficili)
            return cards
                .filter(c => c.easinessFactor < 2.0)
                .sort((a, b) => a.easinessFactor - b.easinessFactor)
                .slice(0, limit);
                
        case 'smart':
        default:
            // Priorità: due > new > weak
            const newCards = cards.filter(c => c.status === 'new');
            const weakCards = cards.filter(c => 
                c.easinessFactor < 2.0 && !due.includes(c)
            );
            return [...due, ...newCards, ...weakCards].slice(0, limit);
    }
}
```

### AI Integration: Magic Generate

Il sistema genera flashcard da PDF usando OpenAI con una pipeline multi-stage.

#### Pipeline Completa

```javascript
async generateCardsFromPDF(tenantScope, deckId, pdfFilePath) {
    const userId = this._getUserId(tenantScope);
    
    // 1. Verifica ownership
    const deck = await Deck.findOne({ _id: deckId, user: userId });
    if (!deck) throw AppError.notFound('Mazzo');
    
    // 2. Estrai testo dal PDF
    const pdfBuffer = await fs.readFile(pdfFilePath);
    const pdfData = await pdfCacheService.parsePDF(pdfFilePath, pdfBuffer);
    const pdfText = this._formatPdfTextWithPages(pdfData);
    
    if (!pdfText || pdfText.trim().length < 100) {
        throw AppError.validation('PDF non contiene abbastanza testo');
    }
    
    // 3. Analisi strutturale (Blueprint)
    const blueprint = await this._analyzeDocumentStructure(pdfText);
    
    // 4. Semantic Chunking (12k caratteri per chunk)
    const semanticChunks = this._createSemanticChunks(pdfText);
    
    // 5. Estrazione concetti locale (senza AI)
    const globalConcepts = this._extractConceptsLocally(pdfText);
    
    // 6. Batch Generation (2 chunk per chiamata API)
    const BATCH_SIZE = 2;
    const batches = [];
    for (let i = 0; i < semanticChunks.length; i += BATCH_SIZE) {
        batches.push(semanticChunks.slice(i, i + BATCH_SIZE));
    }
    
    let allGeneratedCards = [];
    const usedConcepts = new Set(globalConcepts.slice(0, 10));
    
    for (const batch of batches) {
        const targetCards = this._calculateBatchTarget(batch);
        
        const batchCards = await this._generateCardsBatch(
            batch, blueprint, targetCards, usedConcepts
        );
        
        // Traccia concetti usati
        batchCards.forEach(card => {
            const conceptKey = this._extractConceptKey(card.front);
            if (conceptKey) usedConcepts.add(conceptKey);
        });
        
        allGeneratedCards.push(...batchCards);
    }
    
    // 7. Deduplica semantica (Jaccard similarity < 0.50)
    const uniqueCards = this._deduplicateCards(allGeneratedCards);
    
    // 8. Validazione qualità e salvataggio
    const validCards = uniqueCards
        .filter(card => this._validateCardQuality(card))
        .slice(0, 80)  // Max 80 cards
        .map(card => ({
            front: card.front.trim(),
            back: card.back.trim(),
            status: 'new',
            nextReviewDate: new Date(),
            easinessFactor: 2.5,
            interval: 0,
            repetitions: 0,
        }));
    
    deck.cards.push(...validCards);
    await deck.save();
    
    return { generatedCount: validCards.length, deck };
}
```

#### Prompt Engineering

```javascript
// System prompt per generazione
const SYSTEM_PROMPT = `Sei un esperto di didattica. Crea flashcard di alta 
qualita' dal testo fornito. Regole:
- Domande specifiche e non ambigue
- Risposte concise ma complete  
- Usa LaTeX per formule matematiche ($...$)
- Una domanda per concetto
- Evita duplicati con i concetti gia' usati`;

// User prompt per ogni batch
function buildUserPrompt(chunk, targetCards, usedConcepts, questionType) {
    return `Crea ${targetCards} flashcard da questa sezione:
---
${chunk.text}
---

Concetti gia' usati (EVITA DUPLICATI): ${Array.from(usedConcepts).join(', ')}

Tipo domande: ${questionType}

Rispondi in JSON valido:
{
  "flashcards": [
    {"front": "...", "back": "..."}
  ]
}`;
}
```

### API Endpoints

| Endpoint | Method | Descrizione |
|----------|--------|-------------|
| `/api/study/dashboard` | GET | Recupera tutti i deck con conteggio cards in scadenza |
| `/api/study/:id` | GET | Recupera singolo deck con tutte le cards |
| `/api/study` | POST | Crea nuovo deck |
| `/api/study/:id` | PATCH | Aggiorna deck (title, desc, tags, folderId, examId) |
| `/api/study/:id` | DELETE | Elimina deck |
| `/api/study/:id/session` | GET | Recupera sessione di studio |
| `/api/study/:id/cards` | POST | Aggiunge card al deck |
| `/api/study/:id/cards/:cardId` | PUT | Modifica card esistente |
| `/api/study/:id/cards/:cardId` | DELETE | Elimina card |
| `/api/study/:id/cards/reorder` | PUT | Riordina cards (array cardIds) |
| `/api/study/:id/cards/insert` | POST | Inserisce card in posizione specifica |
| `/api/study/:id/review` | POST | Processa review SM-2 (cardId, rating 1-5) |
| `/api/study/:id/verify-answer` | POST | Verifica risposta typing mode |
| `/api/study/:id/generate-pdf` | POST | Upload PDF + generazione AI (rate limited) |
| `/api/study/:id/chat` | POST | Chat con AI Tutor (RAG sul PDF) |

---

## Frontend Architecture

### Service Layer: studyService.ts

#### Type Definitions

```typescript
// src/features/study/services/studyService.ts

export type ReviewRating = 1 | 3 | 5;
export type CardStatus = 'new' | 'learning' | 'review' | 'mastered';
export type StudyMode = 'flashcard' | 'quiz' | 'typing' | 'mix' | 'sprint' | 'focus' | 'exam';
export type SessionFocus = 'smart' | 'due' | 'weak' | 'all';

export interface Card {
    id: string;
    front: string;
    back: string;
    options?: string[];  // Per quiz mode
    easinessFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: string;
    status: CardStatus;
    sourceMetadata?: {
        pageNumber: number;
        originalText: string;
    };
}

export interface Deck {
    id: string;
    examId?: string;
    folderId?: string | null;
    title: string;
    description?: string;
    pdfUrl?: string | null;
    tags: string[];
    cards: Card[];
    totalCards: number;
    dueCount: number;
    algorithm?: 'sm2' | 'fsrs' | 'leitner' | 'anki';
}

export interface StudySession {
    deck: Deck;
    cards: Card[];
    remaining: number;
    total: number;
    mode?: StudyMode;
    cardModes?: Record<string, StudyMode>;
    meta?: {
        focus?: SessionFocus;
        limit?: number;
        timeLimitMinutes?: number;
        direction?: 'front' | 'back' | 'mixed';
    };
}
```

#### Normalizzazione Dati

```typescript
// Helper per normalizzazione difensiva
const safeNumber = (value: unknown, fallback = 0): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const normalizeCard = (raw: any): Card => {
    // Supporta sia camelCase che snake_case dal backend
    let sourceMetadata: Card['sourceMetadata'] = undefined;
    
    const sourceMeta = raw.sourceMetadata || raw.source_metadata;
    if (sourceMeta && typeof sourceMeta === 'object') {
        const pageNumber = Number.isFinite(Number(
            sourceMeta.pageNumber ?? sourceMeta.page_number
        )) ? Number(sourceMeta.pageNumber ?? sourceMeta.page_number) : undefined;
        
        const originalText = typeof (
            sourceMeta.originalText ?? sourceMeta.original_text
        ) === 'string' ? (sourceMeta.originalText ?? sourceMeta.original_text).trim() : undefined;
        
        if (pageNumber && pageNumber > 0 && originalText && originalText.length >= 20) {
            sourceMetadata = { pageNumber, originalText };
        }
    }
    
    return {
        id: raw.id || raw._id,
        front: raw.front || '',
        back: raw.back || '',
        options: Array.isArray(raw.options) ? raw.options : undefined,
        easinessFactor: safeNumber(raw.easinessFactor, 2.5),
        interval: safeNumber(raw.interval, 0),
        repetitions: safeNumber(raw.repetitions, 0),
        nextReviewDate: raw.nextReviewDate || new Date().toISOString(),
        status: raw.status || 'new',
        sourceMetadata,
    };
};

const normalizeDeck = (raw: any): Deck => {
    const cards = Array.isArray(raw.cards) ? raw.cards.map(normalizeCard) : [];
    return {
        id: raw.id || raw._id?.toString() || raw._id,
        examId: raw.examId?.toString() || raw.examId,
        title: raw.title || 'Senza titolo',
        description: raw.description,
        pdfUrl: raw.pdfUrl || null,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        folderId: raw.folderId?.toString() || null,
        cards,
        totalCards: safeNumber(raw.totalCards, cards.length),
        dueCount: safeNumber(raw.dueCount, cards.length),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
};
```

#### Service Class

```typescript
class StudyService {
    private baseUrl = '/study';
    
    // Recupera dashboard con tutti i deck
    async getDashboard(): Promise<{ decks: Deck[]; dueCardCount: number }> {
        const response = await apiClient.get(`${this.baseUrl}/dashboard`);
        const payload = unwrap(response, 'Errore nel recupero dei mazzi');
        
        const decks = Array.isArray(payload?.decks) 
            ? payload.decks.map(normalizeDeck) 
            : [];
        const dueCardCount = safeNumber(
            payload?.dueCardCount,
            decks.reduce((sum, d) => sum + d.dueCount, 0)
        );
        
        return { decks, dueCardCount };
    }
    
    // Recupera sessione di studio
    async getSession(
        deckId: string, 
        options: {
            mode?: StudyMode;
            focus?: SessionFocus;
            limit?: number;
            timeLimitMinutes?: number;
            direction?: 'front' | 'back' | 'mixed';
        } = {}
    ): Promise<StudySession> {
        const params = new URLSearchParams();
        if (options.mode) params.set('mode', options.mode);
        if (options.focus) params.set('focus', options.focus);
        if (options.limit) params.set('limit', String(options.limit));
        if (options.timeLimitMinutes) params.set('time', String(options.timeLimitMinutes));
        if (options.direction) params.set('direction', options.direction);
        
        const response = await apiClient.get(
            `${this.baseUrl}/${deckId}/session?${params}`
        );
        const raw = unwrap(response, 'Errore nel recupero della sessione');
        
        return {
            deck: normalizeDeck(raw?.deck || raw || {}),
            cards: Array.isArray(raw?.cards) 
                ? raw.cards.map(normalizeCard) 
                : [],
            remaining: safeNumber(raw?.remaining, raw?.cards?.length || 0),
            total: safeNumber(raw?.total, raw?.deck?.totalCards || 0),
            mode: raw?.mode,
            cardModes: raw?.cardModes,
            meta: raw?.meta,
        };
    }
    
    // Invia review di una card
    async submitReview(
        deckId: string, 
        payload: { cardId: string; rating: ReviewRating }
    ): Promise<{
        card: Card;
        stats: {
            rating: number;
            easinessFactor: number;
            interval: number;
            repetitions: number;
            status: CardStatus;
            nextReviewDate: string;
            nextReviewInDays: number;
        };
    }> {
        const response = await apiClient.post(
            `${this.baseUrl}/${deckId}/review`,
            payload
        );
        return unwrap(response, 'Errore nel salvataggio della review');
    }
    
    // Generazione AI da PDF
    async generateFromPDF(
        deckId: string,
        file: File
    ): Promise<{ 
        generatedCount: number; 
        deck: Deck; 
        totalChunks?: number;
    }> {
        // Validazione client-side
        if (!file) throw new Error('Nessun file selezionato');
        if (file.type !== 'application/pdf') {
            throw new Error('Solo file PDF sono supportati');
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('Il file supera il limite di 10MB');
        }
        
        const formData = new FormData();
        formData.append('pdf', file);
        
        const csrfHeader = await getCsrfHeader();
        const response = await fetch(`/api${this.baseUrl}/${deckId}/generate-pdf`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: csrfHeader,
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || 
                `Errore ${response.status}: generazione fallita`
            );
        }
        
        const result = await response.json();
        return {
            generatedCount: result.data?.generatedCount || 0,
            deck: normalizeDeck(result.data?.deck || {}),
            totalChunks: result.data?.totalChunks,
        };
    }
}

export const studyService = new StudyService();
```

### API Client con Mutex Pattern

Il client API implementa il **Mutex Pattern** per gestire il refresh token e prevenire l'"avalanche effect".

```typescript
// src/shared/services/apiClient.ts

import axios from 'axios';

// Stato del mutex
let isRefreshing = false;
let isSessionDead = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

// Processa la coda delle richieste in attesa
const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        error ? prom.reject(error) : prom.resolve(token);
    });
    failedQueue = [];
};

// Configurazione axios
const axiosInstance = axios.create({
    baseURL: '/api',
    withCredentials: true,  // CRITICO: Invia cookies HttpOnly
    timeout: 60000,         // 60s per richieste AI
});

// Response Interceptor - Gestione 401
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Se sessione morta, rifiuta immediatamente
            if (isSessionDead) return Promise.reject(error);
            
            // CASO 1: Refresh già in corso -> metti in coda
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => axiosInstance(originalRequest));
            }
            
            // CASO 2: Primo refresh -> acquisisci lock
            originalRequest._retry = true;
            isRefreshing = true;
            
            try {
                await axiosInstance.post('/auth/refresh');
                processQueue(null, null);
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                isSessionDead = true;
                
                // Mostra toast e triggera logout
                emitToast.error('Sessione scaduta. Effettua login.');
                window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
                
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        
        return Promise.reject(error);
    }
);

// Wrapper API
export const apiClient = {
    get: async <T>(url: string, config?: any) => {
        const response = await axiosInstance.get(url, config);
        return response.data;
    },
    post: async <T>(url: string, data?: any, config?: any) => {
        const response = await axiosInstance.post(url, data, config);
        return response.data;
    },
    put: async <T>(url: string, data?: any, config?: any) => {
        const response = await axiosInstance.put(url, data, config);
        return response.data;
    },
    patch: async <T>(url: string, data?: any, config?: any) => {
        const response = await axiosInstance.patch(url, data, config);
        return response.data;
    },
    delete: async <T>(url: string, config?: any) => {
        const response = await axiosInstance.delete(url, config);
        return response.data;
    },
};
```

### Componente DeckCard

```tsx
// src/features/study/components/DeckCard/index.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

export interface DeckCardProps {
    deck: Deck;
    onStudy: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
    onDelete: (deck: Deck) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onTogglePin?: (deck: Deck) => void;
}

const DeckCardComponent: React.FC<DeckCardProps> = ({
    deck,
    onStudy,
    onMagicGenerate,
    onAddCard,
    onViewDetail,
    onDelete,
    onTogglePin,
    onDragStart: onDragStartProp,
    onDragEnd: onDragEndProp,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    // Computed values
    const hasDueCards = (deck.dueCount ?? 0) > 0;
    const totalCards = deck.totalCards ?? deck.cards?.length ?? 0;
    const masteredCards = deck.cards?.filter(
        c => c.status === 'mastered'
    ).length ?? 0;
    const masteryPercent = totalCards > 0 
        ? Math.round((masteredCards / totalCards) * 100) 
        : 0;
    
    // Theme calcolato dal titolo (consistente)
    const theme = useMemo(() => getDeckTheme(deck), [deck.title]);
    
    // Drag & Drop handlers
    const handleDragStart = useCallback((e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('deckId', deck.id);
        
        // Crea anteprima personalizzata
        const dragPreview = document.createElement('div');
        dragPreview.innerHTML = `
            <div style="padding: 12px; background: rgba(139, 92, 246, 0.95);
                        border-radius: 8px; color: white;">
                📚 ${deck.title}
            </div>
        `;
        document.body.appendChild(dragPreview);
        e.dataTransfer.setDragImage(dragPreview, 100, 40);
        
        setTimeout(() => {
            if (document.body.contains(dragPreview)) {
                document.body.removeChild(dragPreview);
            }
        }, 0);
        
        setIsDragging(true);
        onDragStartProp?.();
    }, [deck.id, deck.title, onDragStartProp]);
    
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        onDragEndProp?.();
    }, [onDragEndProp]);
    
    return (
        <motion.div
            animate={{
                scale: isDragging ? 0.95 : 1,
                opacity: isDragging ? 0.6 : 1,
                rotateZ: isDragging ? 2 : 0
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`
                relative rounded-xl border overflow-hidden
                transition-all duration-300 hover:shadow-xl
                flex flex-col min-h-[320px] cursor-move
                ${hasDueCards 
                    ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/10' 
                    : `${theme.borderColor} bg-gradient-to-br ${theme.gradient}`
                }
            `}
        >
            {/* Badges */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                {deck.pinned && (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="badge-pinned"
                    >
                        ⭐
                    </motion.div>
                )}
                {hasDueCards && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="badge-due"
                    >
                        <Clock className="w-3 h-3" />
                        {deck.dueCount} da ripassare
                    </motion.div>
                )}
            </div>
            
            {/* Menu */}
            <DeckCardMenu
                deck={deck}
                showMenu={showMenu}
                onToggleMenu={() => setShowMenu(!showMenu)}
                onViewDetail={() => onViewDetail(deck.id)}
                onMagicGenerate={() => onMagicGenerate(deck)}
                onDelete={() => onDelete(deck)}
                onTogglePin={() => onTogglePin?.(deck)}
            />
            
            {/* Main Content */}
            <div 
                className="p-5 cursor-pointer flex-1 flex flex-col"
                onClick={() => onViewDetail(deck.id)}
            >
                <DeckCardHeader 
                    deck={deck} 
                    theme={theme} 
                    hasDueCards={hasDueCards}
                    totalCards={totalCards}
                />
                
                <DeckCardProgress 
                    masteryPercent={masteryPercent} 
                    totalCards={totalCards}
                    masteredCards={masteredCards}
                />
            </div>
            
            {/* Actions */}
            <DeckCardActions
                deck={deck}
                totalCards={totalCards}
                hasDueCards={hasDueCards}
                onStudy={() => onStudy(deck.id)}
                onAddCard={() => onAddCard(deck.id)}
                onMagicGenerate={() => onMagicGenerate(deck)}
            />
        </motion.div>
    );
};

// Memoizzazione per prevenire re-render non necessari
export const DeckCard = React.memo(DeckCardComponent);
```

### Flusso Sessione di Studio

```tsx
// src/features/study/pages/StudySessionPage.tsx

const StudySessionPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const [cards, setCards] = useState<Card[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [mode, setMode] = useState<StudyMode>('flashcard');
    const [stats, setStats] = useState({ correct: 0, wrong: 0 });
    const startTime = useRef(Date.now());
    
    // 1. Caricamento sessione
    useEffect(() => {
        loadSession();
    }, [deckId]);
    
    const loadSession = async () => {
        try {
            const session = await studyService.getSession(deckId!, {
                mode: selectedMode,
                focus: selectedFocus,
                limit: cardLimit,
                direction: cardDirection
            });
            setCards(session.cards);
            setCurrentIndex(0);
        } catch (error) {
            emitToast.error('Errore nel caricamento della sessione');
        }
    };
    
    // 2. Review di una card
    const handleReview = async (rating: ReviewRating) => {
        const currentCard = cards[currentIndex];
        
        try {
            // Invia review al backend
            const result = await studyService.submitReview(deckId!, {
                cardId: currentCard.id,
                rating
            });
            
            // Aggiorna stats locali
            if (rating >= 3) {
                setStats(s => ({ ...s, correct: s.correct + 1 }));
            } else {
                setStats(s => ({ ...s, wrong: s.wrong + 1 }));
            }
            
            // Aggiorna card nello stato con nuovi parametri SM-2
            setCards(prev => prev.map((c, i) => 
                i === currentIndex ? result.card : c
            ));
            
            // Prossima card o completamento
            if (currentIndex < cards.length - 1) {
                setCurrentIndex(i => i + 1);
            } else {
                completeSession();
            }
        } catch (error) {
            emitToast.error('Errore nel salvataggio della review');
        }
    };
    
    // 3. Completamento sessione
    const completeSession = async () => {
        const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
        
        try {
            await studyService.completeSession(deckId!, {
                mode,
                stats: {
                    correct: stats.correct,
                    wrong: stats.wrong,
                    timeSeconds: timeSpent
                }
            });
            
            emitToast.success('Sessione completata!');
            navigate('/study');
        } catch (error) {
            emitToast.error('Errore nel completamento');
        }
    };
    
    return (
        <div className="study-session">
            {currentIndex < cards.length ? (
                <Flashcard
                    card={cards[currentIndex]}
                    mode={mode}
                    onReview={handleReview}
                    progress={{
                        current: currentIndex + 1,
                        total: cards.length
                    }}
                />
            ) : (
                <SessionComplete stats={stats} />
            )}
        </div>
    );
};
```

---

## Flussi di Comunicazione

### Sequence: Review Card

```
┌──────┐     ┌─────────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────────┐
│ User │     │ StudyPage   │     │ apiClient│     │ Controller  │     │ Service  │     │ MongoDB     │
└──┬───┘     └──────┬──────┘     └────┬─────┘     └──────┬──────┘     └────┬─────┘     └──────┬──────┘
   │                │                  │                  │                 │                  │
   │ Click rating   │                  │                  │                 │                  │
   │───────────────>│                  │                  │                 │                  │
   │                │ submitReview()   │                  │                 │                  │
   │                │─────────────────>│                  │                 │                  │
   │                │                  │ POST /:id/review │                 │                  │
   │                │                  │─────────────────>│                 │                  │
   │                │                  │                  │ processReview() │                  │
   │                │                  │                  │────────────────>│                  │
   │                │                  │                  │                 │ Deck.findOne()   │
   │                │                  │                  │                 │─────────────────>│
   │                │                  │                  │                 │ Deck + Cards     │
   │                │                  │                  │                 │<─────────────────│
   │                │                  │                  │                 │ AlgorithmFactory │
   │                │                  │                  │                 │ processReview()  │
   │                │                  │                  │                 │─────────────────>│
   │                │                  │                  │                 │ New EF, Interval │
   │                │                  │                  │                 │<─────────────────│
   │                │                  │                  │                 │ deck.save()      │
   │                │                  │                  │                 │─────────────────>│
   │                │                  │                  │                 │ OK               │
   │                │                  │                  │                 │<─────────────────│
   │                │                  │                  │<───────────────│ {card, stats}    │
   │                │                  │<─────────────────│ {success, data}│                  │
   │                │<─────────────────│ normalize()      │                 │                  │
   │                │ update state     │                  │                 │                  │
   │                │ show next card   │                  │                 │                  │
   │<───────────────│                  │                  │                 │                  │
```

### Sequence: Magic Generate

```
┌──────┐     ┌─────────────┐     ┌──────────┐     ┌─────────────┐     ┌─────────────┐     ┌────────┐
│ User │     │ UI          │     │ studySvc │     │ Controller  │     │ StudyService│     │ OpenAI │
└──┬───┘     └──────┬──────┘     └────┬─────┘     └──────┬──────┘     └──────┬──────┘     └───┬────┘
   │                │                  │                  │                   │                │
   │ Select PDF     │                  │                  │                   │                │
   │ Click Generate │                  │                  │                   │                │
   │───────────────>│                  │                  │                   │                │
   │                │ generateFromPDF()│                  │                   │                │
   │                │─────────────────>│                  │                   │                │
   │                │                  │ POST /generate   │                   │                │
   │                │                  │ with FormData    │                   │                │
   │                │                  │─────────────────>│                   │                │
   │                │                  │                  │ multer save file  │                │
   │                │                  │                  │ aiLimiter check   │                │
   │                │                  │                  │ generateCardsFromPDF()
   │                │                  │                  │──────────────────>│                │
   │                │                  │                  │                   │ parse PDF      │
   │                │                  │                  │                   │ semantic chunks│
   │                │                  │                  │                   │ analyzeDocument│
   │                │                  │                  │                   │────────────────>│
   │                │                  │                  │                   │ Blueprint      │
   │                │                  │                  │                   │<────────────────│
   │                │                  │                  │                   │ generateBatch()│
   │                │                  │                  │                   │ (per chunk)    │
   │                │                  │                  │                   │────────────────>│
   │                │                  │                  │                   │ Flashcards[]   │
   │                │                  │                  │                   │<────────────────│
   │                │                  │                  │                   │ deduplicate()  │
   │                │                  │                  │                   │ deck.save()    │
   │                │                  │                  │<──────────────────│ {count, deck}  │
   │                │                  │<─────────────────│ {success, data}   │                │
   │                │<─────────────────│ normalizeDeck()  │                   │                │
   │                │ update cards list│                  │                   │                │
   │<───────────────│                  │                  │                   │                │
```

---

## Sicurezza

### Authentication Stack

```javascript
// 1. requireAuth - Verifica JWT
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; email: string; role: string };
        }
    }
}

router.use(requireAuth);  // Popola req.user dal JWT

// 2. tenantContext - Estrae userId
router.use(tenantContext({ required: true }));  // Popola req.tenantScope

// 3. Rate Limiting per operazioni costose
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 ora
    max: 10,  // 10 chiamate per utente
    keyGenerator: (req) => req.tenantScope?.userId || req.ip,
});

router.post('/:id/generate-pdf', aiLimiter, handler);

// 4. CSRF Protection
app.use('/api', ensureCsrfCookie);  // Setta cookie csrfToken se mancante
app.use('/api', requireCsrf);       // Verifica header X-CSRF-Token
```

### Input Validation

```javascript
// Card content validation
const validateCard = (front, back) => {
    if (!front?.trim() || front.length > 2000) {
        throw AppError.validation('Front: max 2000 caratteri');
    }
    if (!back?.trim() || back.length > 4000) {
        throw AppError.validation('Back: max 4000 caratteri');
    }
};

// File upload validation
const validateFileUpload = (file) => {
    const maxSize = 10 * 1024 * 1024;  // 10MB
    if (file.size > maxSize) {
        throw AppError.validation('File troppo grande (max 10MB)');
    }
    
    // PDF magic bytes check
    const pdfValidation = await validatePdfFile(file.path);
    if (!pdfValidation.isValid) {
        throw AppError.validation(`PDF corrotto: ${pdfValidation.error}`);
    }
};
```

### Data Isolation

```javascript
// OGNI query DEVE includere il filtro user

// Esempio: Trova deck per ID
const deck = await Deck.findOne({ 
    _id: deckId, 
    user: userId  // CRITICO: Isolamento dati
});

// Se il deck non esiste O non appartiene all'utente -> 404
if (!deck) {
    throw AppError.notFound('Mazzo');
}

// Non filtrare mai solo per _id
// ❌ ERRATO: await Deck.findOne({ _id: deckId });
// ✅ CORRETTO: await Deck.findOne({ _id: deckId, user: userId });
```

---

## Configurazione

### Variabili d'Ambiente

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `OPENAI_API_KEY` | required | API Key per OpenAI |
| `OPENAI_MODEL` | gpt-4o-mini | Modello LLM per generazione |
| `MONGO_URI` | required | Connection string MongoDB |
| `JWT_SECRET` | required | Secret per firma JWT |
| `JWT_EXPIRES_IN` | 15m | Durata access token |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Durata refresh token |
| `CSRF_SECRET` | required | Secret per CSRF tokens |
| `RATE_LIMIT_AI_MAX` | 10 | Max chiamate AI/ora per utente |
| `RATE_LIMIT_EXAM_SOLVER_MAX` | 5 | Max chiamate exam solver/ora |
| `REDIS_URL` | null | URL Redis (opzionale) |

---

## Glossario

| Termine | Definizione |
|---------|-------------|
| **SM-2** | Algorithm di Spaced Repetition sviluppato da Piotr Wozniak |
| **FSRS** | Free Spaced Repetition Scheduler - Algoritmo ML-based |
| **Leitner** | Sistema a scatole per ripetizione graduale |
| **Source Grounding** | Tracciamento del testo originale nel PDF |
| **Semantic Chunking** | Divisione documento in segmenti significativi |
| **Multi-Tenancy** | Isolamento dati per utente (row-level security) |
| **Easiness Factor** | Parametro SM-2 (default 2.5, min 1.3) |
| **Due Cards** | Cards con nextReviewDate <= now |
| **Mutex Pattern** | Pattern per gestire refresh token senza race conditions |

---

## Riferimenti

- [SuperMemo SM-2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [FSRS Documentation](https://github.com/open-spaced-repetition/fsrs4anki)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Mongoose Plugins](https://mongoosejs.com/docs/plugins.html)

---

*Documento generato automaticamente da Kimi Code CLI.*  
*Ultimo aggiornamento: Febbraio 2026*
