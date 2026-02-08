# Database Schema Overview - Documentazione Cross-Cutting

**Silvi - Schema Database MongoDB**  
*Versione 1.0 - Febbraio 2026*

---

## 📑 Indice

1. [Panoramica](#panoramica)
2. [Entità Principali](#entità-principali)
3. [Schema Relations](#schema-relations)
4. [Indexes](#indexes)
5. [Modelli Dettagliati](#modelli-dettagliati)
6. [Data Flow](#data-flow)

---

## Panoramica

### Database Design

Silvi utilizza **MongoDB** con pattern **Document-Oriented**:

- **Embedded Documents** per relazioni 1:1 e 1:few (cards in deck)
- **References** per relazioni 1:many e many:many (exam → decks)
- **Multi-Tenancy** via campo `user` su ogni documento
- **Soft Delete** per GDPR compliance

### Collections

| Collection | Descrizione | Documenti Est. |
|------------|-------------|----------------|
| `users` | Utenti e autenticazione | ~10k |
| `decks` | Mazzi flashcard + cards embedded | ~50k |
| `exams` | Esami e scadenze | ~20k |
| `folders` | Organizzazione gerarchica | ~15k |
| `tags` | Tag per categorizzazione | ~5k |
| `worklogs` | Log attività time-tracking | ~100k |
| `worktodos` | Todo liste lavorative | ~30k |
| `auditlogs` | Log sicurezza e audit | ~500k |
| `feedback` | Feedback utenti | ~1k |

---

## Entità Principali

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIP DIAGRAM                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    User      │◄──────┤    Deck      │◄──────┤     Exam     │
│  (tenant)    │   1:M │              │  M:1  │              │
└──────┬───────┘       └──────┬───────┘       └──────────────┘
       │                      │
       │                 ┌────┴────┐
       │                 │         │
       │            ┌────┴───┐  ┌──┴────┐
       │            │ Card 1 │  │Card 2 │ ... (embedded)
       │            └────────┘  └───────┘
       │
       │         ┌──────────────┐       ┌──────────────┐
       └────────►│    Folder    │◄──────┤    Parent    │
            1:M  │  (nested)    │  1:M  │   Folder     │
                 └──────────────┘       └──────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   WorkLog    │◄──────┤    User      │──────►│   WorkTodo   │
│  (time trk)  │   M:1 │              │   1:M │   (tasks)    │
└──────────────┘       └──────────────┘       └──────────────┘

┌──────────────┐       ┌──────────────┐
│   AuditLog   │◄──────┤    User      │
│  (security)  │   M:1 │              │
└──────────────┘       └──────────────┘
```

---

## Schema Relations

### Relazioni e Implementazione

| Relazione | Tipo | Implementazione | Esempio |
|-----------|------|-----------------|---------|
| User → Decks | 1:M | Reference + `user` field | `deck.user = ObjectId` |
| Deck → Cards | 1:Few | Embedded Array | `deck.cards = [cardSchema]` |
| Deck → Exam | M:1 | Reference | `deck.examId = ObjectId` |
| Folder → Decks | 1:M | Reference | `deck.folderId = ObjectId` |
| Folder → Parent | Self-Reference | Reference | `folder.parentId = ObjectId` |
| User → WorkLogs | 1:M | Reference + `user` field | `worklog.user = ObjectId` |
| Deck → Tags | M:N | Array di stringhe | `deck.tags = ['math']` |

### Confronto Embedded vs Reference

```javascript
// EMBEDDED (Deck → Cards)
// ✅ Pro: Query singola, atomicità, performance
// ❌ Contro: Documento grande, difficile query cross-deck
{
    _id: ObjectId,
    title: "Math",
    cards: [
        { front: "2+2", back: "4", interval: 1 },
        { front: "3+3", back: "6", interval: 2 }
    ]
}

// REFERENCE (Deck → Exam)
// ✅ Pro: Deck condivisi, query indipendenti
// ❌ Contro: Join manuale (populate)
{
    _id: ObjectId,
    title: "Math Finals",
    examId: ObjectId("507f...")  // ← Reference
}
```

---

## Indexes

### Strategy

| Collection | Index | Tipo | Scopo |
|------------|-------|------|-------|
| `users` | `email: 1` | Unique | Login lookup |
| `users` | `emailVerificationToken: 1` | Single | Verify email |
| `users` | `passwordResetToken: 1` | Single | Reset password |
| `decks` | `user: 1, examId: 1` | Compound | Query per esame |
| `decks` | `user: 1, folderId: 1` | Compound | Query per folder |
| `decks` | `user: 1, tags: 1` | Compound | Query per tag |
| `decks` | `user: 1, 'cards.nextReviewDate': 1` | Compound | SRS scheduling |
| `exams` | `user: 1, deadline: 1` | Compound | Ordinamento scadenze |
| `folders` | `user: 1, parentId: 1` | Compound | Navigazione gerarchica |
| `worklogs` | `user: 1, startTime: -1` | Compound | Time tracking |
| `auditlogs` | `user: 1, createdAt: -1` | Compound | Audit trail |
| `auditlogs` | `action: 1, createdAt: -1` | Compound | Ricerca per azione |

---

## Modelli Dettagliati

### User Model

```javascript
{
    _id: ObjectId,                    // PK
    
    // Autenticazione
    email: String,                    // Unique, lowercase
    password: String,                 // Argon2 hash (select: false)
    passwordHistory: [{               // Ultime 5 password
        hash: String,
        changedAt: Date
    }],
    passwordChangedAt: Date,
    
    // 2FA / TOTP
    twoFactorEnabled: Boolean,
    twoFactorSecret: String,          // select: false
    twoFactorBackupCodes: [String],   // select: false
    twoFactorSetupAt: Date,
    
    // Trusted Devices
    trustedDevices: [{
        fingerprint: String,
        name: String,
        browser: String,
        os: String,
        ip: String,
        trustedAt: Date,
        lastUsedAt: Date
    }],
    
    // Profilo
    profile: {
        firstName: String,
        lastName: String,
        displayName: String,
        phone: String,
        bio: String,
        avatar: String,
        company: String,
        jobTitle: String,
        location: String,
        website: String
    },
    
    // Preferenze
    preferences: {
        language: String,             // 'it', 'en', 'es', 'de', 'fr'
        timezone: String,
        dateFormat: String,
        timeFormat: String,
        currency: String,
        defaultHourlyRate: Number,
        theme: String,
        compactMode: Boolean,
        dashboardLayout: String,
        showMotivationalMessages: Boolean,
        defaultView: String,
        weekStartsOn: Number,
        workingDays: [Number],
        notifications: {
            email: {
                enabled: Boolean,
                weeklyReport: Boolean,
                projectUpdates: Boolean,
                securityAlerts: Boolean
            },
            push: {
                enabled: Boolean,
                dailyReminder: Boolean,
                reminderTime: String
            }
        }
    },
    
    // Sessioni
    refreshTokens: [{                  // select: false
        hash: String,
        jti: String,
        device: String,
        userAgent: String,
        ip: String,
        createdAt: Date,
        lastUsedAt: Date
    }],
    gracePeriodTokens: [{              // select: false
        hash: String,
        expiresAt: Date
    }],
    maxSessions: Number,              // default: 5
    
    // Email Verification
    isEmailVerified: Boolean,
    emailVerificationToken: String,   // select: false
    emailVerificationExpires: Date,   // select: false
    
    // Password Reset
    passwordResetToken: String,       // select: false
    passwordResetExpires: Date,       // select: false
    
    // Account Security
    isActive: Boolean,                // default: true
    isLocked: Boolean,
    lockUntil: Date,
    failedLoginAttempts: Number,
    lastFailedLogin: Date,
    
    // GDPR
    consent: {
        termsAccepted: Boolean,
        termsAcceptedAt: Date,
        privacyVersion: String,
        marketingEmails: Boolean,
        analyticsConsent: Boolean
    },
    
    // Timestamps
    lastLoginAt: Date,
    lastLoginIp: String,
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date,                  // Soft delete
    deletedReason: String
}
```

### Deck Model (con Cards Embedded)

```javascript
{
    _id: ObjectId,
    
    // Multi-tenancy
    user: ObjectId,                   // Reference to User (tenant)
    
    // Relazioni
    examId: ObjectId,                 // Reference to Exam (optional)
    folderId: ObjectId,               // Reference to Folder (optional)
    
    // Contenuto
    title: String,                    // max 120 chars
    description: String,              // max 500 chars
    pdfUrl: String,
    extractedText: String,            // select: false (per RAG)
    tags: [String],                   // max 5 tags
    
    // Cards (embedded sub-documents)
    cards: [{
        _id: ObjectId,
        front: String,                // max 2000 chars
        back: String,                 // max 4000 chars
        
        // SM-2 Parameters
        easinessFactor: Number,       // default: 2.5, min: 1.3
        interval: Number,             // default: 0
        repetitions: Number,          // default: 0
        nextReviewDate: Date,
        status: String,               // 'new', 'learning', 'review', 'mastered'
        
        // FSRS Parameter
        stability: Number,            // default: 0.4
        
        // Leitner Parameter
        box: Number,                  // default: 1
        
        // Review History
        lastReviewed: Date,
        reviewHistory: [{
            date: Date,
            rating: Number,           // 1-5
            interval: Number,
            easinessFactor: Number,
            repetitions: Number,
            algorithm: String         // 'sm2', 'fsrs', 'leitner'
        }],
        
        // Source Grounding (AI Generated)
        sourceMetadata: {
            pageNumber: Number,
            originalText: String        // min 150, max 2000 chars
        }
    }],
    
    // AI Settings
    algorithm: String,                // 'sm2', 'fsrs', 'leitner', 'anki'
    aiSettings: {
        style: String,                // 'comprehensive', 'conceptual', ...
        difficulty: String,           // 'easy', 'medium', 'hard', 'mixed'
        questionTypes: [String]
    },
    
    // Timestamps
    createdAt: Date,
    updatedAt: Date
}
```

### Exam Model

```javascript
{
    _id: ObjectId,
    
    // Multi-tenancy
    user: ObjectId,
    
    // Contenuto
    title: String,                    // max 120 chars
    description: String,              // max 1000 chars
    deadline: Date,                   // Required
    status: String,                   // 'active', 'passed', 'failed', 'archived', 'completed'
    
    // Risultato (se completato)
    outcome: {
        grade: Number,                // min: 0
        date: Date,
        notes: String,
        difficulties: [String]
    },
    
    // Timestamps
    createdAt: Date,
    updatedAt: Date
}
```

### Folder Model (Gerarchico)

```javascript
{
    _id: ObjectId,
    
    // Multi-tenancy
    user: ObjectId,
    
    // Gerarchia
    parentId: ObjectId,               // Self-reference (null = root)
    
    // Contenuto
    name: String,
    description: String,
    color: String,                    // Hex color
    icon: String,
    
    // Timestamps
    createdAt: Date,
    updatedAt: Date
}
```

### WorkLog Model (Time Tracking)

```javascript
{
    _id: ObjectId,
    
    // Multi-tenancy
    user: ObjectId,
    
    // Tempo
    startTime: Date,
    endTime: Date,
    duration: Number,                 // in secondi
    
    // Categorizzazione
    description: String,
    tags: [String],
    category: String,
    
    // Fatturazione
    hourlyRate: Number,
    isBillable: Boolean,
    invoiced: Boolean,
    invoiceId: String,
    
    // Sorgente
    source: String,                   // 'manual', 'timer', 'calendar'
    
    // Timestamps
    createdAt: Date,
    updatedAt: Date
}
```

### AuditLog Model (Sicurezza)

```javascript
{
    _id: ObjectId,
    
    // Riferimento
    user: ObjectId,
    
    // Azione
    action: String,                   // 'LOGIN', 'LOGOUT', 'CREATE_DECK', ...
    resource: String,                 // 'deck', 'exam', 'user'
    resourceId: ObjectId,
    
    // Dettagli
    details: Object,                  // Dati aggiuntivi (varia per azione)
    
    // Context
    ip: String,
    userAgent: String,
    
    // Risultato
    success: Boolean,
    errorMessage: String,
    
    // Timestamp
    createdAt: Date
}
```

---

## Data Flow

### Flusso Creazione Deck

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DECK CREATION FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

[HTTP POST /api/decks]
         │
         ▼
[Auth Middleware]
    - Verifica JWT
    - req.user = { id, email }
         │
         ▼
[Tenant Middleware]
    - req.tenantScope.userId
         │
         ▼
[Route Handler]
    - Validazione input (Joi/Zod)
         │
         ▼
[Service Layer]
    deckService.create(req.tenantScope, data)
         │
         ▼
[Multi-Tenancy Plugin]
    - Hook pre-save: inject user field
    - deck.user = tenantId
         │
         ▼
[MongoDB]
    - Insert document
    - deck = { user: ObjectId("..."), title: "...", cards: [] }
         │
         ▼
[Response]
    - toJSON: rimuovi campo user
    - { id, title, cards: [], ... }
```

### Flusso Query SRS (Spaced Repetition)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SRS SCHEDULING FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

[GET /api/study/due-cards]
         │
         ▼
[Multi-Tenancy Plugin]
    - Pre-query hook
    - Auto-add filter: { user: tenantId }
         │
         ▼
[Mongoose Query]
    Deck.find({ 
        user: ObjectId("userA"),
        'cards.nextReviewDate': { $lte: now }
    })
    .select('cards')
         │
         ▼
[Flatten Cards]
    // Estrai cards da tutti i deck
    cards = decks.flatMap(d => d.cards)
    cards = cards.filter(c => c.nextReviewDate <= now)
         │
         ▼
[Sort & Limit]
    cards.sort(byPriority)
    return cards.slice(0, limit)
```

---

## Performance Considerations

### Document Size Limits

- MongoDB limit: **16MB per documento**
- Deck con molte cards: monitorare dimensione
- Se `cards.length > 1000`: considerare reference invece di embedded

### Query Optimization

```javascript
// ✅ CORRETTO: Usa indice composto
Deck.find({ user: userId, 'cards.nextReviewDate': { $lte: now } })
// Usa indice: { user: 1, 'cards.nextReviewDate': 1 }

// ❌ SBAGLIATO: Query non supportata da indice
Deck.find({ 'cards.nextReviewDate': { $lte: now } })
// Full collection scan!
```

### Pagination

```javascript
// Cursor-based pagination per grandi dataset
const getDecksPage = async (userId, cursor, limit = 20) => {
    const query = { user: userId };
    if (cursor) {
        query._id = { $gt: cursor };  // After cursor
    }
    
    return Deck.find(query)
        .sort({ _id: 1 })
        .limit(limit);
};
```

---

*Documento generato automaticamente da Kimi Code CLI.*  
*Ultimo aggiornamento: Febbraio 2026*
