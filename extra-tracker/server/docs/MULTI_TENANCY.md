# 🏢 Multi-Tenancy Architecture

## Overview

Questa applicazione implementa il pattern **Shared Database with Logical Isolation** per garantire che ogni utente abbia il proprio spazio privato.

```
┌──────────────────────────────────────────────────────────────────┐
│                         SINGLE DATABASE                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      projects collection                     │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │ │
│  │  │ user: A    │  │ user: B    │  │ user: A    │  ...        │ │
│  │  │ name: X    │  │ name: Y    │  │ name: Z    │             │ │
│  │  └────────────┘  └────────────┘  └────────────┘             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  User A vede solo i documenti con user: A                        │
│  User B vede solo i documenti con user: B                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Componenti

### 1. Multi-Tenancy Plugin (`/plugins/multiTenancy.js`)

Plugin Mongoose che:
- Aggiunge campo `user` (ObjectId, immutable) a ogni schema
- Intercetta tutte le query e aggiunge filtro `{ user: tenantId }`
- Fornisce metodi helper: `forTenant()`, `createForTenant()`, `belongsToTenant()`

```javascript
// PRIMA (INSICURO)
const projects = await Project.find({});  // ❌ Ritorna TUTTI i progetti

// DOPO (SICURO)
const projects = await Project.forTenant(userId).find({});  // ✅ Solo i miei
```

### 2. Tenant Context Middleware (`/middleware/tenantContext.js`)

Crea il ponte tra Express e Mongoose:

```javascript
req.tenantScope = {
    tenantId,                           // ID utente
    model: (Model) => Model.forTenant(tenantId),  // Model con scoping
    create: (Model, data) => ...,       // Crea con user auto-inject
    owns: (Model, id) => ...,           // Verifica ownership
    filter: { user: tenantId },         // Filtro raw
};
```

### 3. Base Service (`/services/BaseService.js`)

Service layer astratto con:
- CRUD operations con tenant scoping automatico
- Lifecycle hooks (beforeCreate, afterDelete, etc.)
- Paginazione e ricerca

### 4. Schema Models

Tutti i modelli applicano il plugin:

```javascript
projectSchema.plugin(multiTenancyPlugin, {
    tenantField: 'user',
    required: true,
});
```

---

## Flusso di una Request

```
1. [HTTP Request]
        │
2. [Auth Middleware]
        │ Verifica JWT, estrae user.id dal token
        ▼
3. [Tenant Context Middleware]
        │ Crea req.tenantScope con helpers
        ▼
4. [Route Handler]
        │ Chiama il service
        ▼
5. [Service Layer]
        │ Usa req.tenantScope.model(Model)
        ▼
6. [Mongoose Plugin]
        │ Aggiunge filtro { user: tenantId } alla query
        ▼
7. [MongoDB]
        │ Esegue query filtrata
        ▼
8. [Response]
   Solo dati dell'utente corrente
```

---

## Rischi di Sicurezza e Mitigazioni

### 1. IDOR (Insecure Direct Object Reference)

**Rischio:** Un utente conosce l'ID di una risorsa altrui e tenta di accedervi.

**Esempio di attacco:**
```http
GET /api/projects/507f1f77bcf86cd799439011
Authorization: Bearer <token_user_B>
```

**Mitigazione:**
Il plugin aggiunge automaticamente `{ user: userId }` a ogni query:
```javascript
// La query diventa:
Project.findOne({ _id: '507f...', user: 'user_B_id' })
// Se il progetto appartiene a user_A, ritorna null → 404
```

### 2. Mass Assignment

**Rischio:** L'attaccante invia `{ user: "altro_user_id" }` nel body per "rubare" una risorsa.

**Esempio di attacco:**
```http
POST /api/projects
{ "name": "Test", "user": "507f1f77bcf86cd799439011" }
```

**Mitigazioni:**
1. **Schema `immutable: true`:** Il campo user non può essere modificato dopo la creazione
2. **Service layer sanitization:** Rimuoviamo esplicitamente `user` dai dati in input
3. **Auto-injection:** Il tenantId viene preso dal token JWT, mai dal body

```javascript
// Nel service
async create(tenantScope, data) {
    const { user, _id, ...safeData } = data;  // Rimuove user e _id
    return tenantScope.create(this.Model, safeData);
}
```

### 3. Cross-Tenant Reference Injection

**Rischio:** Creo un WorkLog con `projectId` di un progetto altrui.

**Esempio di attacco:**
```http
POST /api/worklogs
{ "projectId": "progetto_di_altro_utente", "date": "2024-01-01" }
```

**Mitigazione:** Il service verifica ownership prima di creare:

```javascript
async validateProjectOwnership(tenantScope, projectId) {
    const belongs = await tenantScope.owns(Project, projectId);
    if (!belongs) {
        throw AppError.notFound('Progetto');  // Messaggio generico!
    }
}
```

> ⚠️ **IMPORTANTE:** Non rivelare se la risorsa esiste ma appartiene ad altri. Usa sempre "non trovato".

### 4. Query Injection via Aggregation

**Rischio:** Aggregation pipeline custom che bypassano il filtro tenant.

**Mitigazione:** Il plugin inietta `$match: { user: tenantId }` come **primo stage** di ogni pipeline.

```javascript
// Input
Project.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
])

// Diventa automaticamente:
Project.aggregate([
    { $match: { user: tenantId } },  // ← Iniettato dal plugin
    { $group: { _id: '$status', count: { $sum: 1 } } }
])
```

### 5. Timing Attacks

**Rischio:** Differenze nel tempo di risposta rivelano se una risorsa esiste.

**Mitigazione:**
- Usare sempre lo stesso messaggio di errore per "non trovato" e "non autorizzato"
- Evitare early-return quando possibile

### 6. Forgot Tenant Filter

**Rischio:** Un developer dimentica di usare `tenantScope` in una nuova route.

**Mitigazioni:**
1. **Middleware globale:** `router.use(tenantContext())` applicato a tutte le routes
2. **Service pattern:** I service richiedono `tenantScope` come primo parametro
3. **Code review:** Cercare `Model.find` senza `.forTenant()`

---

## Checklist Sicurezza

Quando crei una nuova funzionalità, verifica:

- [ ] Il Model ha `multiTenancyPlugin` applicato?
- [ ] La route usa `requireAuth` e `tenantContext`?
- [ ] Il service usa `tenantScope.model()` per le query?
- [ ] I riferimenti a altre entità (es. projectId) verificano ownership?
- [ ] Il campo `user` è rimosso dai dati in input?
- [ ] I messaggi di errore non rivelano informazioni sensibili?

---

## Testing Multi-Tenancy

```javascript
describe('Project API - Multi-tenancy', () => {
    it('User A cannot see User B projects', async () => {
        // Create project as User A
        const projectA = await createProject(tokenA, { name: 'Project A' });
        
        // Try to access as User B
        const res = await request(app)
            .get(`/api/projects/${projectA.id}`)
            .set('Cookie', `accessToken=${tokenB}`);
        
        expect(res.status).toBe(404);  // Non 403!
    });

    it('Cannot create worklog for another user project', async () => {
        const projectA = await createProject(tokenA, { name: 'Project A' });
        
        const res = await request(app)
            .post('/api/worklogs')
            .set('Cookie', `accessToken=${tokenB}`)
            .send({ projectId: projectA.id, date: '2024-01-01', ... });
        
        expect(res.status).toBe(404);  // Progetto "non trovato"
    });
});
```

---

## Performance Considerations

### Indici

Ogni model con multi-tenancy ha:
```javascript
{ user: 1 }                    // Query base
{ user: 1, createdAt: -1 }     // Liste ordinate
{ user: 1, <campo>: 1 }        // Query filtrate
```

### Query Explain

Per verificare che le query usino gli indici:
```javascript
const explain = await Project.forTenant(userId)
    .find({ status: 'active' })
    .explain('executionStats');

console.log(explain.executionStats.executionStages);
// Deve mostrare IXSCAN, non COLLSCAN
```

---

## Migrazione Dati Esistenti

Se hai dati pre-esistenti senza campo `user`:

```javascript
// Migration script
const migrateProjectsToTenant = async (defaultUserId) => {
    const result = await Project.updateMany(
        { user: { $exists: false } },
        { $set: { user: defaultUserId } }
    );
    console.log(`Migrated ${result.modifiedCount} projects`);
};
```

⚠️ **ATTENZIONE:** Esegui questa migrazione PRIMA di applicare il plugin con `required: true`.
