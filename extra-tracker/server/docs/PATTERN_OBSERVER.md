# 📡 Pattern Observer - Event Bus & Activity Tracking

## Panoramica

Il sistema utilizza il **Pattern Observer** (Event Emitter) per disaccoppiare i servizi di dominio dall'activity tracking. Questo migliora:

- **Performance**: La risposta HTTP non viene rallentata da activity tracking
- **Decoupling**: I servizi non conoscono direttamente `ActivityService`
- **Scalabilità**: Facile aggiungere nuovi subscriber per altri eventi
- **Affidabilità**: Retry automatico con exponential backoff per gestire errori temporanei

## Architettura

```
┌─────────────────┐
│  WorkLogService │
│  GoalService    │  ──emit──>  ┌──────────┐
│  StudyService   │             │ EventBus │
└─────────────────┘             └────┬─────┘
                                     │
                                     │ on()
                                     ▼
                            ┌─────────────────┐
                            │ ActivitySubscriber│
                            └────┬────────────┘
                                 │
                                 │ addActivityJob()
                                 ▼
                            ┌─────────────────┐
                            │  ActivityQueue  │
                            │  (Bull + Redis) │
                            └────┬────────────┘
                                 │
                                 │ retry (3x)
                                 ▼
                            ┌─────────────────┐
                            │ ActivityService │
                            └─────────────────┘
```

## Componenti

### 1. Event Bus (`utils/eventBus.js`)

EventEmitter singleton per tutta l'applicazione.

**Caratteristiche:**
- Emissione asincrona con `setImmediate` (non blocca il call stack)
- Gestione errori integrata
- Logging in sviluppo

**Uso:**
```javascript
const eventBus = require('./utils/eventBus');

// Emetti evento
eventBus.emit('worklog.created', { userId, workLog });
```

### 2. Activity Queue (`queues/activityQueue.js`)

Queue Bull per activity tracking con retry automatico.

**Configurazione:**
- **Retry**: 3 tentativi
- **Backoff**: Exponential (2s, 4s, 8s)
- **Timeout**: 30 secondi per job
- **Fallback**: Se Redis non disponibile, usa chiamata diretta (senza retry)

**Uso:**
```javascript
const { addActivityJob } = require('./queues/activityQueue');

await addActivityJob(userId, 'WORK_SESSION_LOGGED', {
    entityId: workLog._id,
    category: 'work',
    metadata: { ... },
});
```

### 3. Activity Subscriber (`subscribers/activitySubscriber.js`)

Subscriber che ascolta eventi di dominio e registra attività.

**Eventi supportati:**
- `worklog.created`: Quando viene creato un nuovo worklog
- `worklog.updated`: Quando viene aggiornato un worklog (solo se cambiamenti significativi)
- `goal.completed`: Quando un goal viene completato
- `session.completed`: Quando una sessione di studio viene completata

**Handler:**
```javascript
eventBus.on('worklog.created', handleWorkLogCreated);
eventBus.on('worklog.updated', handleWorkLogUpdated);
eventBus.on('goal.completed', handleGoalCompleted);
eventBus.on('session.completed', handleSessionCompleted);
```

### 4. Event Metrics (`utils/eventMetrics.js`)

Traccia metriche sugli eventi emessi e processati.

**Metriche tracciate:**
- Eventi emessi per tipo
- Eventi processati con successo
- Eventi falliti
- Success rate per tipo di evento
- Tempo medio di processing

**Uso:**
```javascript
const eventMetrics = require('./utils/eventMetrics');

// Ottieni statistiche
const stats = eventMetrics.getStats();
const summary = eventMetrics.getSummary();
```

## Eventi Emessi

### `worklog.created`

**Emit da:** `WorkLogService.create()`

**Payload:**
```javascript
{
    userId: ObjectId,
    workLog: {
        _id: ObjectId,
        projectId: ObjectId,
        date: string,
        startTime: string | null,
        endTime: string | null,
        durationMinutes: number,
        tags: string[],
        // ... altri campi
    }
}
```

**Activity Type generato:**
- `WORK_SESSION_LOGGED` (se startTime/endTime presenti)
- `WORK_NOTE_CREATED` (se solo testo)

### `worklog.updated`

**Emit da:** `WorkLogService.update()`

**Payload:**
```javascript
{
    userId: ObjectId,
    workLog: WorkLog, // Documento aggiornato
    previousWorkLog: WorkLog, // Documento precedente
}
```

**Activity Type generato:**
- `WORK_SESSION_UPDATED` (solo se cambiamenti significativi: durata o progetto)

### `goal.completed`

**Emit da:** `GoalService.update()` (quando status cambia a 'completed')

**Payload:**
```javascript
{
    userId: ObjectId,
    goal: {
        _id: ObjectId,
        category: string,
        priority: number,
        deadline: string | null,
        createdAt: Date,
        updatedAt: Date,
        // ... altri campi
    }
}
```

**Activity Type generato:**
- `GOAL_COMPLETED`

### `session.completed`

**Emit da:** `StudyService.processCardReview()` (quando sessione completata)

**Payload:**
```javascript
{
    userId: ObjectId,
    session: {
        deckId: ObjectId,
        isComplete: boolean,
        completed: boolean,
        // ... altri metadati sessione
    }
}
```

**Activity Type generato:**
- `SESSION_COMPLETE`

## Retry e Gestione Errori

### Retry Automatico

La queue Bull gestisce automaticamente i retry:

1. **Primo tentativo**: Immediato
2. **Secondo tentativo**: Dopo 2 secondi (exponential backoff)
3. **Terzo tentativo**: Dopo 4 secondi (exponential backoff)
4. **Fallimento**: Dopo 3 tentativi, il job viene marcato come fallito

### Fallback

Se Redis non è disponibile:
- La queue non viene inizializzata
- `addActivityJob()` usa chiamata diretta a `ActivityService`
- Nessun retry automatico (ma non blocca l'app)

### Logging

Gli errori vengono loggati ma non propagati:
- Console error per job falliti
- Eventi `activity.queue.failed` per monitoring
- Metriche aggiornate automaticamente

## Monitoring

### Metriche Eventi

Le metriche vengono tracciate automaticamente:

```javascript
const eventMetrics = require('./utils/eventMetrics');

// Statistiche complete
const stats = eventMetrics.getStats();
// {
//     emitted: { 'worklog.created': 10, ... },
//     processed: { 'worklog.created': 9, ... },
//     failed: { 'worklog.created': 1, ... },
//     successRate: { 'worklog.created': '90.00%' },
//     avgProcessingTime: { 'worklog.created': '45.23ms' }
// }

// Summary per logging
const summary = eventMetrics.getSummary();
```

### Queue Stats

Statistiche della queue Bull:

```javascript
const { getQueueStats } = require('./queues/activityQueue');

const stats = await getQueueStats();
// {
//     waiting: 5,
//     active: 2,
//     completed: 100,
//     failed: 3,
//     delayed: 0,
//     total: 110
// }
```

### Logging Automatico

In sviluppo, le metriche vengono loggate ogni 5 minuti automaticamente.

## Configurazione

### Variabili d'Ambiente

```env
# Redis (opzionale, ma consigliato per retry)
REDIS_URL=redis://localhost:6379

# Node Environment
NODE_ENV=production
```

### Inizializzazione

L'inizializzazione avviene in `index.js`:

```javascript
// 1. Inizializza Redis
await initRedis();

// 2. Connetti a MongoDB
await connectDB();

// 3. Inizializza activity queue (dopo Redis)
initializeQueue();

// 4. Inizializza subscribers (dopo DB)
initializeSubscribers();
```

## Best Practices

### 1. Emetti Eventi, Non Chiamate Dirette

❌ **Sbagliato:**
```javascript
await activityService.recordActivity(userId, 'WORK_SESSION_LOGGED', payload);
```

✅ **Corretto:**
```javascript
eventBus.emit('worklog.created', { userId, workLog });
```

### 2. Non Bloccare la Risposta HTTP

Gli eventi sono "fire and forget". Non aspettare il completamento:

❌ **Sbagliato:**
```javascript
await eventBus.emit('worklog.created', data); // Non funziona così
```

✅ **Corretto:**
```javascript
eventBus.emit('worklog.created', data); // Fire and forget
return created; // Ritorna immediatamente
```

### 3. Usa Payload Consistenti

Mantieni la struttura del payload consistente per facilitare il debugging:

```javascript
eventBus.emit('worklog.created', {
    userId: ObjectId, // Sempre presente
    workLog: WorkLog, // Documento completo
});
```

## Troubleshooting

### Eventi Non Processati

1. Verifica che il subscriber sia inizializzato:
   ```javascript
   // In index.js
   initializeSubscribers();
   ```

2. Verifica che Redis sia disponibile (per retry):
   ```javascript
   const { getRedisAvailable } = require('./config/redis');
   console.log('Redis available:', getRedisAvailable());
   ```

3. Controlla i log per errori:
   ```
   ❌ ActivitySubscriber error: ...
   ```

### Queue Bloccata

1. Verifica statistiche queue:
   ```javascript
   const stats = await getQueueStats();
   console.log('Queue stats:', stats);
   ```

2. Se ci sono molti job in "waiting", potrebbe essere un problema di Redis o worker

3. Riavvia la queue se necessario:
   ```javascript
   await closeQueue();
   initializeQueue();
   ```

## Estensioni Future

### Altri Eventi

Per aggiungere un nuovo evento:

1. Emetti evento nel service:
   ```javascript
   eventBus.emit('nuovo.evento', { userId, data });
   ```

2. Aggiungi handler nel subscriber:
   ```javascript
   async function handleNuovoEvento(data) {
       await addActivityJob(data.userId, 'NUOVO_ACTIVITY_TYPE', payload);
   }
   
   eventBus.on('nuovo.evento', handleNuovoEvento);
   ```

### Retry Personalizzato

Per personalizzare retry per un tipo specifico:

```javascript
await activityQueue.add({
    userId,
    activityType,
    payload,
}, {
    attempts: 5, // Più tentativi
    backoff: {
        type: 'exponential',
        delay: 5000, // Delay iniziale più lungo
    },
});
```

### Monitoring Esterno

Integra con sistemi di monitoring esterni:

```javascript
eventBus.on('activity.queue.failed', (data) => {
    // Invia a Sentry, DataDog, etc.
    sentry.captureException(new Error(data.error));
});
```

## Riferimenti

- [Bull Documentation](https://github.com/OptimalBits/bull)
- [Node.js EventEmitter](https://nodejs.org/api/events.html)
- [Pattern Observer](https://refactoring.guru/design-patterns/observer)
