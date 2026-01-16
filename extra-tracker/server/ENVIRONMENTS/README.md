# 🔧 Environment Configuration

Questo sistema di configurazione centralizzato permette di gestire facilmente le configurazioni per diversi ambienti (sviluppo, produzione) senza valori hardcoded nel codice.

## 📁 Struttura

```
ENVIRONMENTS/
├── index.js              # Loader che seleziona l'ambiente corretto
├── environments.js      # Configurazione per sviluppo locale
├── environments.prod.js # Configurazione per produzione
└── README.md            # Questa documentazione
```

## 🚀 Come Funziona

Il sistema determina quale ambiente usare seguendo questa priorità:

1. **ENVIRONMENT** (variabile esplicita): `'development'` o `'production'`
2. **NODE_ENV**: Se `NODE_ENV === 'production'` → usa produzione
3. **Default**: sviluppo

### Esempio

```bash
# Usa sviluppo (default)
npm start

# Usa produzione tramite NODE_ENV
NODE_ENV=production npm start

# Usa produzione tramite ENVIRONMENT
ENVIRONMENT=production npm start
```

## 📝 Configurazione

Tutte le configurazioni vengono caricate da variabili d'ambiente. Crea un file `.env` nella cartella `server/` con tutte le variabili necessarie.

### Variabili Obbligatorie (Produzione)

- `MONGO_URI` - URI di connessione MongoDB
- `JWT_SECRET` - Secret per JWT (minimo 32 caratteri)
- `FRONTEND_URL` - URL del frontend
- `BACKEND_URL` - URL del backend

### Variabili Opzionali

Tutte le altre variabili hanno valori di default appropriati per sviluppo. Vedi `.env.example` per la lista completa.

## 🔐 Sicurezza

- In **produzione**, il sistema valida automaticamente che tutte le variabili obbligatorie siano presenti
- `JWT_SECRET` viene validato per assicurarsi che sia almeno 32 caratteri in produzione
- Le configurazioni di sicurezza (Helmet, CORS, Rate Limiting) sono ottimizzate per ogni ambiente

## 🎯 Principi Applicati

1. **Single Source of Truth**: Tutte le configurazioni in un posto
2. **Environment-aware**: Valori diversi per dev/prod
3. **No Hardcoded Values**: Tutto configurabile via variabili d'ambiente
4. **Fail Secure**: Validazione automatica in produzione
5. **Clean Code**: Separazione delle responsabilità, codice leggibile e manutenibile

## 📚 Uso nel Codice

```javascript
// In qualsiasi file del server
const { config, isProduction, isDevelopment } = require('./ENVIRONMENTS');

// Accedi alle configurazioni
const port = config.server.port;
const mongoUri = config.database.mongoUri;
const jwtSecret = config.jwt.secret;
```

## 🔄 Migrazione da Valori Hardcoded

Tutti i valori hardcoded sono stati rimossi da:
- `server/config/security.js`
- `server/index.js`

Ora tutto viene caricato da `ENVIRONMENTS/config`, che a sua volta legge da variabili d'ambiente.
