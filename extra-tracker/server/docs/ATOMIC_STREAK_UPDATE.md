# 🔒 Atomic Streak Update - Race Condition Risolta

## Problema

Il sistema di gamification aveva una **race condition** sullo streak quando più richieste arrivavano simultaneamente:

```javascript
// ❌ APPROCCIO VECCHIO (NON ATOMICO)
const user = await User.findById(userId);
const current = user.gamification.streak.current;
const next = current + 1; // Race condition qui!
user.gamification.streak.current = next;
await user.save(); // Due richieste possono salvare lo stesso valore
```

**Scenario di race condition:**
1. Richiesta A legge `streak.current = 5`
2. Richiesta B legge `streak.current = 5` (stesso valore!)
3. Richiesta A calcola `next = 6` e salva
4. Richiesta B calcola `next = 6` e salva
5. **Risultato**: Streak incrementato solo di 1 invece di 2

## Soluzione

Usiamo **operatori atomici MongoDB** direttamente nel database invece di read-modify-write:

```javascript
// ✅ APPROCCIO NUOVO (ATOMICO)
await User.updateOne(
    { 
        _id: userId,
        'gamification.streak.lastActivityDate': { $lt: today } // Solo se non ha già lavorato oggi
    },
    {
        $inc: { 'gamification.streak.current': 1 }, // Incremento atomico
        $set: { 'gamification.streak.lastActivityDate': today }
    }
);
```

## Implementazione

### Metodo `updateStreakAtomically()`

Il metodo usa due operazioni atomiche con condizioni mutuamente esclusive:

#### Operazione 1: Incrementa se ieri
```javascript
await User.updateOne(
    {
        _id: userId,
        // Condizione: lastActivityDate è ieri o null/inesistente
        $or: [
            { 'gamification.streak.lastActivityDate': { $exists: false } },
            { 'gamification.streak.lastActivityDate': null },
            {
                $and: [
                    { 'gamification.streak.lastActivityDate': { $gte: yesterdayStart } },
                    { 'gamification.streak.lastActivityDate': { $lt: today } },
                ],
            },
        ],
    },
    {
        $inc: { 'gamification.streak.current': 1 },
        $set: { 'gamification.streak.lastActivityDate': today },
    }
);
```

**Logica:**
- Se `lastActivityDate` è ieri (range tra ieri 00:00 e oggi 00:00): incrementa streak
- Se `lastActivityDate` è null/inesistente: incrementa streak (prima volta)
- **Atomico**: Solo una richiesta può matchare questa condizione

#### Operazione 2: Reset se più vecchio
```javascript
if (incrementResult.matchedCount === 0) {
    await User.updateOne(
        {
            _id: userId,
            // Condizione: lastActivityDate è più vecchio di ieri
            'gamification.streak.lastActivityDate': {
                $exists: true,
                $ne: null,
                $lt: yesterdayStart,
            },
        },
        {
            $set: {
                'gamification.streak.current': 1,
                'gamification.streak.lastActivityDate': today,
            },
        }
    );
}
```

**Logica:**
- Solo se la prima operazione non ha matchato
- Se `lastActivityDate` è più vecchio di ieri: reset streak a 1
- **Atomico**: Solo una richiesta può matchare questa condizione

#### Idempotenza
Se nessuna delle due operazioni matcha, significa che `lastActivityDate` è già oggi:
- Nessuna modifica necessaria
- Operazione idempotente (può essere chiamata più volte senza effetti collaterali)

## Vantaggi

### 1. Atomicità
- Ogni operazione è atomica a livello di database
- MongoDB garantisce che solo una richiesta può matchare la condizione
- Nessuna race condition possibile

### 2. Performance
- Meno operazioni: non serve leggere, modificare, salvare
- Operazione diretta sul database
- Meno round-trip al database

### 3. Consistenza
- Garantisce che lo streak sia sempre corretto
- Gestisce correttamente richieste simultanee
- Idempotente: chiamate multiple non causano problemi

## Esempi

### Scenario 1: Streak Continuo
```
Giorno 1: lastActivityDate = null → incrementa → current = 1
Giorno 2: lastActivityDate = ieri → incrementa → current = 2
Giorno 3: lastActivityDate = ieri → incrementa → current = 3
```

### Scenario 2: Streak Rotto
```
Giorno 1: lastActivityDate = null → incrementa → current = 1
Giorno 2: (nessuna attività)
Giorno 3: lastActivityDate = 2 giorni fa → reset → current = 1
```

### Scenario 3: Richieste Simultanee
```
Richiesta A: lastActivityDate = ieri → match → incrementa → current = 6
Richiesta B: lastActivityDate = oggi (aggiornato da A) → no match → idempotente
Risultato: Streak incrementato correttamente una sola volta
```

## Best Streak Update

Dopo l'aggiornamento dello streak, aggiorniamo anche `best` se necessario:

```javascript
const newCurrent = user.gamification.streak.current;
const currentBest = user.gamification.streak.best;

if (newCurrent > currentBest) {
    await User.updateOne(
        { _id: userId },
        { $set: { 'gamification.streak.best': newCurrent } }
    );
}
```

**Nota**: Questa operazione è separata perché `$max` in update non supporta espressioni complesse. È comunque sicura perché viene eseguita dopo l'aggiornamento atomico dello streak.

## Testing

Per testare la race condition:

```javascript
// Simula 10 richieste simultanee
const promises = Array(10).fill(null).map(() => 
    activityService.updateStreakAtomically(userId)
);

const results = await Promise.all(promises);

// Verifica che solo una abbia aggiornato
const updated = results.filter(r => r.updated);
console.assert(updated.length === 1, 'Solo una richiesta dovrebbe aggiornare');
```

## Migrazione

Il metodo vecchio `updateStreak()` è mantenuto come `@deprecated` per compatibilità temporanea, ma non viene più usato in `recordActivity()`.

**Timeline migrazione:**
1. ✅ Nuovo metodo `updateStreakAtomically()` implementato
2. ✅ `recordActivity()` usa il nuovo metodo
3. ⏳ Rimuovere metodo vecchio dopo verifica in produzione

## Riferimenti

- [MongoDB Atomic Operations](https://docs.mongodb.com/manual/core/write-operations-atomicity/)
- [MongoDB Update Operators](https://docs.mongodb.com/manual/reference/operator/update/)
- [Race Condition Prevention](https://en.wikipedia.org/wiki/Race_condition)
