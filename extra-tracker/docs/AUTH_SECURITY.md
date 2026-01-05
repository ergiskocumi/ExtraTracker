# 🔐 Sistema di Autenticazione - Silvi

## Architettura

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTENTICAZIONE SICURA                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    HttpOnly Cookie     ┌──────────────┐               │
│  │  React   │ ◄──────────────────────│   Express    │               │
│  │ Frontend │                        │   Backend    │               │
│  │          │ ──────────────────────►│              │               │
│  │ - Zod    │   credentials: true    │ - Argon2     │               │
│  │ - Context│                        │ - JWT        │               │
│  └──────────┘                        │ - Helmet     │               │
│                                      │ - Rate Limit │               │
│                                      └──────┬───────┘               │
│                                             │                       │
│                                      ┌──────▼───────┐               │
│                                      │   MongoDB    │               │
│                                      │  - User      │               │
│                                      │  - Hashed PW │               │
│                                      └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

## Struttura File

```
server/
├── config/
│   └── security.js          # Configurazioni centralizzate
├── controllers/
│   └── authController.js    # Gestione HTTP request/response
├── middleware/
│   ├── auth.js              # Middleware JWT verification
│   ├── errorHandler.js      # Error handling centralizzato
│   └── rateLimiter.js       # Protezione brute force
├── models/
│   └── User.js              # Schema Mongoose utente
├── routes/
│   └── auth.js              # Routes autenticazione
├── services/
│   └── authService.js       # Business logic (hash, token)
├── utils/
│   └── AppError.js          # Classe errori custom
└── validators/
    └── authValidators.js    # Schemi Zod validazione

src/
├── context/
│   └── AuthContext.tsx      # State management auth
├── pages/auth/
│   ├── LoginPage.tsx        # Pagina login
│   └── RegisterPage.tsx     # Pagina registrazione
├── services/
│   ├── authService.ts       # API calls auth
│   └── api/apiClient.ts     # Axios con auto-refresh
└── validators/
    └── authValidators.ts    # Schemi Zod frontend
```

## API Endpoints

| Metodo | Endpoint              | Descrizione            | Auth Required |
|--------|-----------------------|------------------------|---------------|
| POST   | /api/auth/register    | Registra nuovo utente  | ❌            |
| POST   | /api/auth/login       | Login utente           | ❌            |
| POST   | /api/auth/logout      | Logout utente          | ⚠️ Optional   |
| POST   | /api/auth/refresh     | Rinnova access token   | ❌            |
| GET    | /api/auth/me          | Profilo utente         | ✅            |
| PUT    | /api/auth/password    | Cambia password        | ✅            |
| GET    | /api/auth/check       | Verifica autenticazione| ✅            |

## Misure di Sicurezza Implementate

### ✅ Password Security
- **Argon2id**: Algoritmo memory-hard, vincitore PHC 2015
- **Requisiti**: 8+ caratteri, 1 maiuscola, 1 minuscola, 1 numero

### ✅ Session Management
- **HttpOnly Cookies**: Token NON accessibili da JavaScript
- **Secure Flag**: Solo HTTPS in produzione
- **SameSite**: Strict in produzione (anti-CSRF)
- **Token Rotation**: Refresh token ruotato ad ogni refresh

### ✅ Rate Limiting
- **API Generale**: 100 req / 15 min
- **Auth Endpoints**: 5 tentativi / 15 min
- **Account Lockout**: Dopo 5 tentativi falliti

### ✅ Input Validation
- **Zod**: Validazione rigorosa frontend + backend
- **Sanitization**: Email lowercase, trim automatico

### ✅ Security Headers (Helmet)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection
- Strict-Transport-Security (HSTS)
- Content-Security-Policy

### ✅ Error Handling
- Messaggi generici al client (nessun leak info)
- Logging dettagliato server-side
- Stack trace solo in development

### ✅ GDPR Compliance
- Solo email + password hashata
- Consenso esplicito con timestamp
- Nessun tracciamento IP persistente

---

## ✅ CHECKLIST PRE-PRODUZIONE

### 🔑 Secrets & Environment

- [ ] **JWT_SECRET**: Genera nuovo secret (64+ caratteri)
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] **MONGO_URI**: Usa connection string con autenticazione forte
- [ ] **NODE_ENV**: Imposta a `production`
- [ ] **FRONTEND_URL**: Configura URL esatto del frontend
- [ ] Rimuovi tutti i console.log di debug
- [ ] Verifica che `.env` sia in `.gitignore`

### 🔒 HTTPS & Network

- [ ] SSL/TLS certificate configurato
- [ ] Redirect HTTP → HTTPS attivo
- [ ] CORS origin limitato al dominio frontend
- [ ] Rate limiting attivo e testato
- [ ] Firewall configurato (solo porte necessarie)

### 🗄️ Database

- [ ] MongoDB con autenticazione abilitata
- [ ] Utente DB con permessi minimi (no admin)
- [ ] Backup automatici configurati
- [ ] Connessione SSL al database

### 🛡️ Security Headers

- [ ] CSP configurata per il frontend
- [ ] HSTS con `includeSubDomains`
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy configurata

### 📊 Monitoring & Logging

- [ ] Error tracking configurato (Sentry/LogRocket)
- [ ] Log centralizzati (non su file locale)
- [ ] Health check endpoint funzionante
- [ ] Alerting per errori critici

### 🧪 Testing

- [ ] Test autenticazione (login/logout/refresh)
- [ ] Test rate limiting (superamento limiti)
- [ ] Test password requirements
- [ ] Test sessione scaduta
- [ ] Penetration test (OWASP Top 10)

### 📱 Frontend

- [ ] Form validation attiva
- [ ] Loading states implementati
- [ ] Error handling user-friendly
- [ ] Sessione scaduta gestita (redirect)
- [ ] HTTPS forzato

---

## 🚀 Comandi Utili

```bash
# Avvia server development
cd server && npm run dev

# Genera JWT secret sicuro
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Test endpoint registrazione
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPass123","acceptTerms":true}'

# Test endpoint login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@test.com","password":"TestPass123"}'

# Test endpoint protetto (con cookie)
curl http://localhost:3001/api/auth/me \
  -b cookies.txt
```

---

## 📚 Risorse

- [OWASP Authentication Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Argon2 Specification](https://github.com/P-H-C/phc-winner-argon2)
- [JWT Best Practices](https://auth0.com/blog/jwt-security-best-practices/)
