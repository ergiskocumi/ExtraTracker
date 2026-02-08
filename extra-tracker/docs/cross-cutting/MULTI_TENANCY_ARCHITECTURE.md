# Multi-Tenancy Architecture - Documentazione Cross-Cutting

**Silvi - Isolamento Dati e Shared Database Pattern**  
*Versione 1.0 - Febbraio 2026*

---

## 📑 Indice

1. [Panoramica](#panoramica)
2. [Architettura Shared Database](#architettura-shared-database)
3. [Multi-Tenancy Plugin](#multi-tenancy-plugin)
4. [Tenant Context Middleware](#tenant-context-middleware)
5. [Data Isolation](#data-isolation)
6. [Security Considerations](#security-considerations)
7. [Best Practices](#best-practices)

---

## Panoramica

### Pattern Implementato: Shared Database with Logical Isolation

Silvi implementa il pattern **"Shared Database with Logical Isolation"**:

- **Un database** MongoDB per tutti i tenant
- **Campo `user`** su ogni documento per isolamento logico
- **Query automaticamente scoped** per isolamento trasparente
- **Indexes composti** per performance ottimali

### Confronto Pattern Multi-Tenancy

| Pattern | Pro | Contro | Usato da |
|---------|-----|--------|----------|
| **Shared DB + Logical Isolation** | Semplice, scalabile, costi bassi | Richiede attenzione alla sicurezza | Silvi, Salesforce |
| Shared DB + Schema Isolation | Isolamento maggiore | Complessità gestione schema | PostgreSQL multi-schema |
| Database per Tenant | Isolamento massimo | Costi elevati, difficile scaling | Enterprise tradizionali |
| Shard per Tenant | Bilanciato | Complessità operativa | Grandi SaaS |

### Principi SOLID Applicati

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANCY PRINCIPLES                                  │
└─────────────────────────────────────────────────────────────────────────────┘

[S] Single Responsibility:
    Il plugin multi-tenancy ha UNA sola responsabilità: isolare i dati per tenant.
    Non gestisce autenticazione, validazione o business logic.

[O] Open/Closed:
    Il plugin è APERTO per estensione (puoi aggiungere hook) ma CHIUSO
    per modifica. Funziona con qualsiasi schema senza modificarlo.

[D] Dependency Inversion:
    Il plugin non dipende da implementazioni concrete di User o Auth.
    Riceve l'userId come parametro (iniettato dal middleware Express).
```

---

## Architettura Shared Database

### Schema Logico

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHARED DATABASE LAYOUT                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    Database: silvi_prod
    │
    ├─ Collection: decks
    │   ├─ { _id: ObjectId, user: ObjectId("userA"), title: "Math" }
    │   ├─ { _id: ObjectId, user: ObjectId("userB"), title: "History" }
    │   └─ { _id: ObjectId, user: ObjectId("userA"), title: "Physics" }
    │
    ├─ Collection: exams
    │   ├─ { _id: ObjectId, user: ObjectId("userA"), ... }
    │   └─ { _id: ObjectId, user: ObjectId("userB"), ... }
    │
    ├─ Collection: cards
    │   └─ (embedded in decks, quindi eredita isolamento)
    │
    └─ Collection: users
        ├─ { _id: ObjectId("userA"), email: "alice@..." }
        └─ { _id: ObjectId("userB"), email: "bob@..." }
```

### Flusso Request con Tenant Isolation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW WITH TENANT ISOLATION                        │
└─────────────────────────────────────────────────────────────────────────────┘

[HTTP Request: GET /api/decks]
         │
         ▼
[Auth Middleware] ──► req.user = { id: "userA", email: "..." }
         │
         ▼
[Tenant Middleware] ──► req.tenantScope = {
         │                   tenantId: ObjectId("userA"),
         │                   userId: ObjectId("userA"),
         │                   filter: { user: ObjectId("userA") },
         │                   model: Function(Model),
         │                   create: Function(Model, data),
         │                   owns: Function(Model, docId)
         │               }
         │
         ▼
[Route Handler]
         │
         ▼
[Service Layer] usa req.tenantScope
         │
         ▼
[Mongoose Query] ──► Deck.find({ user: "userA" })
         │              (filtro applicato automaticamente)
         ▼
[Response] Solo decks di userA
```

---

## Multi-Tenancy Plugin

### Implementazione

```javascript
// server/plugins/multiTenancy.js

const TENANT_CONTEXT = Symbol.for('tenantContext');

function multiTenancyPlugin(schema, options = {}) {
    const {
        tenantField = 'user',
        required = true,
        excludeFromScoping = [],
    } = options;

    // =========================================
    // 1. SCHEMA MODIFICATION
    // =========================================
    
    schema.add({
        [tenantField]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: required,
            index: true,           // Indice singolo
            immutable: true,       // SICUREZZA: non modificabile dopo creazione
        }
    });
    
    // Indice composto per query frequenti
    schema.index({ [tenantField]: 1, createdAt: -1 });

    // =========================================
    // 2. PRE-SAVE HOOK (Automatic User Injection)
    // =========================================
    
    schema.pre('save', function() {
        if (this.isNew && !this[tenantField]) {
            const tenantId = this.$locals?.[TENANT_CONTEXT] 
                          || this.constructor[TENANT_CONTEXT];
            
            if (tenantId) {
                this[tenantField] = tenantId;
            } else if (required) {
                throw new Error(
                    `Multi-tenancy violation: ${tenantField} is required`
                );
            }
        }
    });

    // =========================================
    // 3. PRE-QUERY HOOKS (Automatic Scoping)
    // =========================================
    
    const queryMethods = [
        'find', 'findOne', 'findById',
        'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace',
        'findByIdAndUpdate', 'findByIdAndDelete',
        'updateOne', 'updateMany',
        'deleteOne', 'deleteMany',
        'count', 'countDocuments', 'estimatedDocumentCount',
        'distinct', 'aggregate',
    ];
    
    queryMethods.forEach(method => {
        if (excludeFromScoping.includes(method)) return;
        
        if (method !== 'aggregate') {
            schema.pre(method, function() {
                const tenantId = this.getOptions()[TENANT_CONTEXT];
                if (tenantId) {
                    this.where({ [tenantField]: tenantId });
                }
            });
        }
    });
    
    // Hook speciale per Aggregate
    schema.pre('aggregate', function() {
        const tenantId = this.options[TENANT_CONTEXT];
        if (tenantId) {
            this.pipeline().unshift({
                $match: { [tenantField]: tenantId }
            });
        }
    });

    // =========================================
    // 4. STATIC METHODS
    // =========================================
    
    /**
     * Crea documento con tenant automatico
     */
    schema.statics.createForTenant = async function(tenantId, data) {
        const docs = Array.isArray(data) ? data : [data];
        const docsWithTenant = docs.map(doc => ({
            ...doc,
            [tenantField]: tenantId,
        }));
        const result = await this.create(docsWithTenant);
        return Array.isArray(data) ? result : result[0];
    };

    /**
     * Query Builder con scoping automatico (Proxy pattern)
     */
    schema.statics.forTenant = function(tenantId) {
        const Model = this;
        
        return new Proxy(Model, {
            get(target, prop) {
                const value = target[prop];
                
                if (typeof value === 'function') {
                    return function(...args) {
                        const result = value.apply(target, args);
                        
                        if (result?.setOptions) {
                            result.setOptions({ [TENANT_CONTEXT]: tenantId });
                        } else if (result?.pipeline) {
                            result.options[TENANT_CONTEXT] = tenantId;
                        }
                        
                        return result;
                    };
                }
                
                return value;
            }
        });
    };

    /**
     * Verifica ownership di un documento
     */
    schema.statics.belongsToTenant = async function(tenantId, documentId) {
        const doc = await this.findOne({
            _id: documentId,
            [tenantField]: tenantId,
        });
        return !!doc;
    };
}

module.exports = { multiTenancyPlugin, TENANT_CONTEXT };
```

### Applicazione ai Modelli

```javascript
// server/models/Deck.js
const { multiTenancyPlugin } = require('../plugins/multiTenancy');

const deckSchema = new mongoose.Schema({
    title: { type: String, required: true },
    cards: [cardSchema],
    // ...
});

// Applica plugin
deckSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',  // Campo per isolamento
    required: true,       // Obbligatorio
});

module.exports = mongoose.model('Deck', deckSchema);
```

---

## Tenant Context Middleware

### Implementazione

```javascript
// server/middleware/tenantContext.js

const tenantContext = (options = {}) => {
    const { required = true } = options;

    return (req, res, next) => {
        // 1. Validazione: Utente presente?
        if (!req.user?.id) {
            if (required) {
                return next(AppError.unauthorized(
                    'Tenant context required. Please authenticate.'
                ));
            }
            return next();
        }

        // 2. Validazione: ID valido?
        let tenantId;
        const userId = req.user.id;

        if (userId instanceof mongoose.Types.ObjectId) {
            tenantId = userId;
        } else if (mongoose.Types.ObjectId.isValid(userId)) {
            tenantId = new mongoose.Types.ObjectId(userId);
        } else {
            return next(AppError.validation('Invalid user ID format'));
        }

        // 3. Crea tenantScope (Object.freeze per immutabilità)
        req.tenantScope = Object.freeze({
            tenantId,
            
            get userId() { return tenantId; },

            /**
             * Model con scoping automatico
             */
            model: (Model) => {
                if (!Model.forTenant) {
                    throw new Error(`Model ${Model.modelName} missing multi-tenancy plugin`);
                }
                return Model.forTenant(tenantId);
            },

            /**
             * Crea documento con tenant automatico
             */
            create: async (Model, data) => {
                if (!Model.createForTenant) {
                    throw new Error(`Model ${Model.modelName} missing multi-tenancy plugin`);
                }
                return Model.createForTenant(tenantId, data);
            },

            /**
             * Verifica ownership
             */
            owns: async (Model, documentId) => {
                if (!Model.belongsToTenant) {
                    throw new Error(`Model ${Model.modelName} missing multi-tenancy plugin`);
                }
                return Model.belongsToTenant(tenantId, documentId);
            },

            /**
             * Filtro base per query manuali
             */
            get filter() {
                return { user: tenantId };
            },
        });

        next();
    };
};

// Middleware combinato: Auth + Tenant
const withTenantAuth = (authMiddleware) => {
    return [authMiddleware, tenantContext({ required: true })];
};

module.exports = { tenantContext, withTenantAuth };
```

### Utilizzo nelle Routes

```javascript
// server/routes/decks.js
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/auth');

// Applica a tutte le routes
router.use(requireAuth);
router.use(tenantContext({ required: true }));

// Ora tutte le query sono automaticamente scoped
router.get('/', async (req, res) => {
    // Automaticamente: Deck.find({ user: req.user.id })
    const decks = await Deck.find();
    res.json(decks);
});

router.post('/', async (req, res) => {
    // Automaticamente: deck.user = req.user.id
    const deck = await Deck.create(req.body);
    res.json(deck);
});
```

---

## Data Isolation

### Query Automaticamente Scoped

```javascript
// Dato: User A con id "507f1f77bcf86cd799439011"
// Dato: User B con id "507f1f77bcf86cd799439022"

// ==========================================
// FIND (automaticamente filtrato)
// ==========================================

// Codice del service:
const decks = await Deck.find({ status: 'active' });

// Query effettiva eseguita:
// Deck.find({ status: 'active', user: "507f1f77bcf86cd799439011" })

// Risultato: SOLO decks di User A

// ==========================================
// FIND ONE
// ==========================================

// Codice:
const deck = await Deck.findOne({ _id: deckId });

// Query effettiva:
// Deck.findOne({ _id: deckId, user: "507f1f77bcf86cd799439011" })

// Se il deck appartiene a User B: null (non found)

// ==========================================
// UPDATE
// ==========================================

// Codice:
await Deck.updateOne({ _id: deckId }, { title: 'New Title' });

// Query effettiva:
// Deck.updateOne(
//     { _id: deckId, user: "507f1f77bcf86cd799439011" },
//     { title: 'New Title' }
// )

// Se deck è di User B: modifiedCount = 0 (nessun errore, ma nessun update)

// ==========================================
// DELETE
// ==========================================

// Codice:
await Deck.deleteOne({ _id: deckId });

// Query effettiva:
// Deck.deleteOne({ _id: deckId, user: "507f1f77bcf86cd799439011" })

// Se deck è di User B: deletedCount = 0

// ==========================================
// AGGREGATE
// ==========================================

// Codice:
const stats = await Deck.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
]);

// Pipeline effettiva:
// [
//     { $match: { user: "507f1f77bcf86cd799439011" } },  // ← Aggiunto automaticamente
//     { $group: { _id: '$status', count: { $sum: 1 } } }
// ]
```

### Explicit Ownership Check

```javascript
// Quando serve verificare esplicitamente ownership

const updateDeck = async (req, res) => {
    const { id } = req.params;
    
    // Verifica ownership esplicita
    const hasAccess = await req.tenantScope.owns(Deck, id);
    
    if (!hasAccess) {
        throw AppError.forbidden('Non puoi modificare questo deck');
    }
    
    // Procedi con update
    const deck = await Deck.findByIdAndUpdate(id, req.body, { new: true });
    res.json(deck);
};

// Oppure usando il model scoped
const getDeckWithDetails = async (req, res) => {
    const { id } = req.params;
    
    // Usa model() per query complesse con scoping
    const DeckScoped = req.tenantScope.model(Deck);
    
    const deck = await DeckScoped
        .findById(id)
        .populate('examId')
        .populate('folderId');
    
    if (!deck) {
        throw AppError.notFound('Deck');
    }
    
    res.json(deck);
};
```

---

## Security Considerations

### Rischi Mitigati

| Rischio | Mitigazione |
|---------|-------------|
| **IDOR** (Insecure Direct Object Reference) | Query sempre filtrate per user |
| **Mass Assignment** | Campo `user` immutable, non sovrascrivibile dal client |
| **Query Injection** | Filtro user applicato server-side sempre |
| **Tenant Enumeration** | Errori generici ("Not Found" vs "Access Denied") |
| **Data Leakage** | toJSON rimuove campo `user` dalle risposte |

### Prevenzione IDOR

```javascript
// ATTACCO IDOR (tentativo di accesso a risorsa altrui)
// Attacker conosce ID deck di un altro utente: deckId = "abc123"

// Tentativo 1: GET /api/decks/abc123
const deck = await Deck.findById("abc123");
// Query: { _id: "abc123", user: "attackerId" }
// Risultato: null → 404 Not Found

// Tentativo 2: PUT /api/decks/abc123
await Deck.updateOne({ _id: "abc123" }, { title: 'Hacked' });
// Query: { _id: "abc123", user: "attackerId" }
// Risultato: modifiedCount: 0 → Nessun errore, ma nessun danno

// Tentativo 3: DELETE /api/decks/abc123
await Deck.deleteOne({ _id: "abc123" });
// Query: { _id: "abc123", user: "attackerId" }
// Risultato: deletedCount: 0 → Deck altrui intatto
```

### Errori Generici

```javascript
// ✅ CORRETTO: Stesso errore per "non esiste" e "non è tuo"
if (!deck) {
    throw AppError.notFound('Deck');
    // Message: "Deck non trovato" (sia se non esiste, sia se è di un altro)
}

// ❌ SBAGLIATO: Distingue tra i due casi
if (!deck) {
    throw AppError.notFound('Deck');
} else if (deck.user !== req.user.id) {
    throw AppError.forbidden('Questo deck non è tuo'); // Enumera esistenza!
}
```

---

## Best Practices

### 1. Sempre Applicare il Plugin

```javascript
// ✅ CORRETTO: Ogni model con dati user-specific
const deckSchema = new Schema({ ... });
deckSchema.plugin(multiTenancyPlugin, { tenantField: 'user' });

// ❌ SBAGLIATO: Model senza plugin = buco di sicurezza
const publicSchema = new Schema({ ... });
// Nessun plugin = accessibile a tutti!
```

### 2. Usare tenantScope nei Service

```javascript
// ✅ CORRETTO: Usa req.tenantScope
const createDeck = async (req) => {
    return req.tenantScope.create(Deck, req.body);
};

// ❌ SBAGLIATO: Passa userId manualmente
const createDeck = async (req) => {
    return Deck.create({ ...req.body, user: req.user.id }); // Rischi di override!
};
```

### 3. Verifica Ownership per Operazioni Sensibili

```javascript
// ✅ CORRETTO: Verifica esplicita per operazioni critiche
const deleteDeck = async (req) => {
    const owns = await req.tenantScope.owns(Deck, req.params.id);
    if (!owns) throw AppError.forbidden();
    
    return Deck.deleteOne({ _id: req.params.id });
};
```

### 4. Indexes per Performance

```javascript
// ✅ CORRETTO: Indice composto per query comuni
deckSchema.index({ user: 1, createdAt: -1 });  // Liste ordinate
deckSchema.index({ user: 1, examId: 1 });      // Query per esame
deckSchema.index({ user: 1, 'cards.nextReviewDate': 1 }); // SRS
```

### 5. toJSON per Nascondere user

```javascript
// ✅ CORRETTO: Rimuovi campo user dalle risposte API
deckSchema.set('toJSON', {
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.user;  // Nascondi tenant field
    }
});
```

---

*Documento generato automaticamente da Kimi Code CLI.*  
*Ultimo aggiornamento: Febbraio 2026*
