# Fase 03 — Backend Architecture

> **Rischio:** Medio
> **Impatto:** Allinea il backend alla Layered Architecture (Controller -> Service -> Repository)
> **Stima:** ~15 nuovi file repository, ~14 controller da auditare

---

## 3.1 Repository Layer Mancante

### Stato Attuale
Solo 2 repository esistono:
- `server/repositories/ExamRepository.js`
- `server/repositories/FolderRepository.js`

Tutti gli altri modelli (Deck, User, Tag, WorkLog, etc.) sono acceduti direttamente nei Service via `Model.find()`, `Model.create()`, etc.

### Repository da Creare

| Repository | Modello | Priorita | Note |
|---|---|---|---|
| `DeckRepository.js` | `Deck` | **Alta** | Feature dominante, query complesse |
| `UserRepository.js` | `User` | **Alta** | Auth, settings, profilo |
| `TagRepository.js` | `Tag` | Media | CRUD semplice |
| `WorkLogRepository.js` | `WorkLog` | Media | CRUD + aggregazioni |
| `WorkTodoRepository.js` | `WorkTodo` | Media | CRUD |
| `FeedbackRepository.js` | `Feedback` | Bassa | CRUD semplice |
| `AuditLogRepository.js` | `AuditLog` | Bassa | Solo scrittura + query admin |

### Pattern Repository (da seguire):
```javascript
// server/repositories/DeckRepository.js
class DeckRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id, tenantId) {
    return this.model.findOne({ _id: id, tenant: tenantId });
  }

  async findByUser(userId, tenantId, options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt' } = options;
    return this.model
      .find({ user: userId, tenant: tenantId })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);
  }

  async create(data) {
    return this.model.create(data);
  }

  async update(id, tenantId, updates) {
    return this.model.findOneAndUpdate(
      { _id: id, tenant: tenantId },
      updates,
      { new: true, runValidators: true }
    );
  }

  async delete(id, tenantId) {
    return this.model.findOneAndDelete({ _id: id, tenant: tenantId });
  }
}

module.exports = DeckRepository;
```

### Refactor dei Service
Per ogni service che accede direttamente al Model:
1. Creare il repository corrispondente
2. Iniettare il repository nel service (constructor injection)
3. Sostituire `Model.find()` -> `this.repository.findBy...()`
4. Testare

---

## 3.2 Audit Controller — Business Logic Leak

### Principio
Il Controller deve SOLO:
- Parsare la request (params, body, query)
- Validare con Zod
- Chiamare il Service
- Restituire la response con status code corretto

NON deve: filtrare dati, calcolare, trasformare, accedere al DB.

### Controller da Auditare (priorita)

| Controller | Sospetto | Azione |
|---|---|---|
| `deckController.js` | Probabile logica di filtering/sorting nel controller | Spostare nel DeckService |
| `studyController.js` | Potrebbe avere logica di sessione | Spostare nel StudyService |
| `studySessionController.js` | Logica spaced repetition nel controller? | Verificare |
| `examController.js` / `examsController.js` | **Due controller per la stessa entita?** Consolidare | Merge in uno |
| `dashboardController.js` | Aggregazioni direttamente nel controller? | Spostare in DashboardService |

### Pattern Controller Corretto:
```javascript
// PRIMA (anti-pattern)
const getDecks = async (req, res) => {
  const userId = req.user.id;
  const decks = await Deck.find({ user: userId }).sort('-createdAt');
  const filtered = decks.filter(d => d.isActive); // business logic nel controller!
  res.json(filtered);
};

// DOPO
const getDecks = async (req, res, next) => {
  try {
    const query = getDeckQuerySchema.parse(req.query);
    const decks = await deckService.getUserDecks(req.user.id, query);
    res.json(decks);
  } catch (error) {
    next(error);
  }
};
```

---

## 3.3 Validator Coverage

### Stato Attuale
Solo 2 file di validazione:
- `server/validators/authValidators.js`
- `server/validators/studyValidators.js`

### Validator da Creare

| File | Endpoint | Schema |
|---|---|---|
| `deckValidators.js` | POST/PUT /api/study/decks | `createDeckSchema`, `updateDeckSchema` |
| `examValidators.js` | POST/PUT /api/exams | `createExamSchema`, `submitExamSchema` |
| `workLogValidators.js` | POST/PUT /api/worklogs | `createWorkLogSchema` |
| `settingsValidators.js` | PUT /api/settings | `updateSettingsSchema` |
| `feedbackValidators.js` | POST /api/feedback | `createFeedbackSchema` |
| `folderValidators.js` | POST/PUT /api/folders | `createFolderSchema` |
| `tagValidators.js` | POST/PUT /api/tags | `createTagSchema` |

### Pattern:
```javascript
const { z } = require('zod');

const createDeckSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  folderId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

module.exports = { createDeckSchema };
```

---

## 3.4 examController vs examsController

**Problema:** Esistono DUE controller per gli esami:
- `server/controllers/examController.js`
- `server/controllers/examsController.js`

**Azione:** Investigare le differenze e consolidare in un singolo `examController.js`.

---

## Checklist di Completamento

- [ ] 7 repository creati (Deck, User, Tag, WorkLog, WorkTodo, Feedback, AuditLog)
- [ ] Service refactored per usare repository (no accesso diretto a Model)
- [ ] Controller auditati — zero business logic
- [ ] `examController` e `examsController` consolidati
- [ ] Validator Zod creati per tutti gli endpoint con input
- [ ] Tutti gli endpoint testati manualmente o con test
- [ ] Server avvia e risponde correttamente
