# 🚦 Rate Limiting Refactor - Documentazione

## 📋 Panoramica

Il sistema di rate limiting è stato completamente refactorizzato per essere più intelligente e non bloccare gli utenti normali.

## 🎯 Problema Risolto

**Prima**: Il `generalLimiter` era applicato globalmente a tutte le API con un limite di 200 richieste per 15 minuti, causando blocchi per utenti normali che usavano l'app intensivamente.

**Dopo**: Sistema selettivo che applica rate limiting solo dove necessario:
- ✅ **Chiamate AI**: Rate limiting severo (10 chiamate/ora per utente)
- ✅ **Autenticazione**: Rate limiting per prevenire brute force (15 tentativi/15min per IP)
- ✅ **Altre API**: Nessun rate limiting (utenti possono usare l'app liberamente)

## 🔧 Componenti

### 1. AI Rate Limiter (`aiLimiter`)

**Scopo**: Prevenire abusi delle chiamate AI costose

**Caratteristiche**:
- Limite: **10 chiamate per ora per utente**
- Basato su **userId** (non IP) per essere equo
- Applicato solo alle route AI

**Route protette**:
- `POST /api/goals/suggest` - Generazione goal AI
- `POST /api/study/:id/generate-pdf` - Generazione flashcards da PDF
- `POST /api/study/:id/chat` - Chat con AI tutor

**Configurazione**:
```env
RATE_LIMIT_AI_WINDOW_MS=3600000  # 1 ora
RATE_LIMIT_AI_MAX=10             # 10 chiamate
```

### 2. Auth Rate Limiter (`authLimiter`)

**Scopo**: Prevenire brute force attacks

**Caratteristiche**:
- Limite: **15 tentativi per 15 minuti per IP**
- Basato su **IP** (non userId) perché l'utente non è ancora autenticato
- Skip richieste di successo (non conta login riusciti)

**Route protette**:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

**Configurazione**:
```env
RATE_LIMIT_AUTH_WINDOW_MS=900000  # 15 minuti
RATE_LIMIT_AUTH_MAX=15            # 15 tentativi
RATE_LIMIT_AUTH_SKIP_SUCCESS=true # Skip login riusciti
```

### 3. General Rate Limiter (`generalLimiter`)

**Scopo**: Protezione DDoS opzionale

**Caratteristiche**:
- **DISABILITATO di default**
- Limite: 1000 richieste per 15 minuti per IP (molto permissivo)
- Da abilitare solo se necessario

**Configurazione**:
```env
RATE_LIMIT_GENERAL_ENABLED=false  # Disabilitato di default
RATE_LIMIT_GENERAL_WINDOW_MS=900000
RATE_LIMIT_GENERAL_MAX=1000
```

### 4. Password Reset Limiter (`passwordResetLimiter`)

**Scopo**: Prevenire email bombing

**Caratteristiche**:
- Limite: **3 richieste per ora per IP**
- Basato su IP

**Route protetta**:
- `POST /api/auth/forgot-password`

## 📊 Confronto Prima/Dopo

| Aspetto | Prima | Dopo |
|---------|-------|------|
| **General Limiter** | 200 req/15min (globale) | Disabilitato (opzionale) |
| **AI Limiter** | Nessuno | 10 req/ora per utente |
| **Utenti normali** | Bloccati dopo 200 richieste | Nessun limite |
| **Chiamate AI** | Nessun limite | 10 chiamate/ora |
| **Autenticazione** | 15 tentativi/15min | 15 tentativi/15min (invariato) |

## 🎯 Filosofia

1. **Utenti normali devono poter usare l'app liberamente**
   - Nessun rate limiting sulle API normali
   - Solo le chiamate AI e autenticazione sono limitate

2. **Rate limiting basato su userId per utenti autenticati**
   - Più equo rispetto a IP
   - Previene problemi con NAT/shared IP

3. **Rate limiting basato su IP per autenticazione**
   - Utente non è ancora autenticato
   - Previene brute force attacks

4. **Chiamate AI severamente limitate**
   - Costi elevati
   - 10 chiamate/ora è un limite ragionevole per utenti normali

## 🔧 Configurazione

Tutte le configurazioni sono in `ENVIRONMENTS/environments.js` e `ENVIRONMENTS/environments.prod.js`.

Vedi `ENV_VARIABLES.md` per la lista completa delle variabili d'ambiente.

## 📝 Clean Code Principles Applicati

1. **Single Responsibility**: Ogni limiter ha uno scopo specifico
2. **Documentazione**: Commenti chiari e JSDoc
3. **Configurabilità**: Tutto configurabile via env vars
4. **Leggibilità**: Codice ben strutturato e commentato
5. **Manutenibilità**: Facile aggiungere/modificare limiters

## 🚀 Uso

### Applicare AI Limiter a una nuova route AI

```javascript
const { aiLimiter } = require('../middleware/rateLimiter');

router.post('/api/new-ai-endpoint', aiLimiter, asyncHandler(async (req, res) => {
    // ...
}));
```

### Abilitare General Limiter (se necessario)

```env
RATE_LIMIT_GENERAL_ENABLED=true
```

## ✅ Testing

Il sistema è stato testato e funziona correttamente:
- ✅ AI Limiter attivo
- ✅ Auth Limiter attivo
- ✅ General Limiter disabilitato (come previsto)
