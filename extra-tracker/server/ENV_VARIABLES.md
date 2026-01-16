# 📋 Variabili d'Ambiente - Documentazione Completa

Copia questo contenuto nel tuo file `.env` nella cartella `server/` e configura i valori secondo le tue esigenze.

```bash
# ==========================================
# 🔧 ENVIRONMENT CONFIGURATION
# ==========================================
# ENVIRONMENT può essere: 'development' o 'production'
# Se non specificato, usa NODE_ENV
ENVIRONMENT=development
NODE_ENV=development

# ==========================================
# 🌐 SERVER CONFIGURATION
# ==========================================
PORT=3001
TRUST_PROXY=1

# ==========================================
# 🗄️ DATABASE CONFIGURATION
# ==========================================
MONGO_URI=mongodb://localhost:27017/extratracker
MONGO_MAX_POOL_SIZE=10
MONGO_SERVER_SELECTION_TIMEOUT=5000

# ==========================================
# 🔴 REDIS CONFIGURATION (Opzionale)
# ==========================================
# Se non configurato, il rate limiter userà memoria locale
REDIS_URL=
REDIS_CONNECT_TIMEOUT=5000

# ==========================================
# 🔐 JWT CONFIGURATION
# ==========================================
# IMPORTANTE: In produzione DEVE essere una stringa lunga e random (32+ caratteri)
# Genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=dev-secret-change-in-production-use-at-least-32-chars
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
JWT_ALGORITHM=HS256

# ==========================================
# 🔒 ARGON2 PASSWORD HASHING CONFIGURATION
# ==========================================
ARGON2_TYPE=2
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4
ARGON2_HASH_LENGTH=32

# ==========================================
# 🍪 COOKIE CONFIGURATION
# ==========================================
COOKIE_NAME=accessToken
COOKIE_REFRESH_NAME=refreshToken
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false
COOKIE_ACCESS_TOKEN_MAX_AGE=900000
COOKIE_REFRESH_TOKEN_MAX_AGE=604800000
COOKIE_REFRESH_TOKEN_PATH=/api/auth/refresh

# ==========================================
# 🚦 RATE LIMITING CONFIGURATION
# ==========================================
RATE_LIMIT_GENERAL_WINDOW_MS=900000
RATE_LIMIT_GENERAL_MAX=200
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX=15
RATE_LIMIT_AUTH_SKIP_SUCCESS=true

# ==========================================
# 🌍 CORS CONFIGURATION
# ==========================================
# In sviluppo, allowAllOrigins è true per default
# In produzione, usa whitelist esplicita
# Esempi:
# CORS_ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
# CORS_ALLOWED_ORIGIN_PATTERNS=.netlify.app,.vercel.app
CORS_ALLOWED_ORIGINS=
CORS_ALLOWED_ORIGIN_PATTERNS=.netlify.app,.vercel.app

# ==========================================
# 🛡️ HELMET SECURITY HEADERS CONFIGURATION
# ==========================================
HELMET_FRAMEGUARD_ACTION=deny
HELMET_CORP_POLICY=cross-origin
HELMET_REFERRER_POLICY=strict-origin-when-cross-origin
HELMET_HSTS_MAX_AGE=31536000
HELMET_HSTS_INCLUDE_SUBDOMAINS=true
HELMET_HSTS_PRELOAD=true

# ==========================================
# 👥 SESSION MANAGEMENT CONFIGURATION
# ==========================================
SESSION_MAX_ACTIVE_SESSIONS=10
SESSION_REFRESH_TOKEN_EXPIRY_DAYS=7

# ==========================================
# 📦 BODY PARSER CONFIGURATION
# ==========================================
BODY_PARSER_JSON_LIMIT=10kb
BODY_PARSER_URLENCODED_LIMIT=10kb
BODY_PARSER_IMPORT_JSON_LIMIT=50mb

# ==========================================
# 🔗 URLs CONFIGURATION
# ==========================================
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001

# ==========================================
# 📊 MONITORING & LOGGING CONFIGURATION
# ==========================================
MONITORING_EVENT_METRICS_INTERVAL=300000
MONITORING_ENABLE_EVENT_METRICS_LOGGING=true
```

## 🔑 Variabili Obbligatorie per Produzione

Quando `ENVIRONMENT=production` o `NODE_ENV=production`, queste variabili DEVONO essere configurate:

- `MONGO_URI` - URI di connessione MongoDB
- `JWT_SECRET` - Secret per JWT (minimo 32 caratteri)
- `FRONTEND_URL` - URL del frontend (es: `https://app.example.com`)
- `BACKEND_URL` - URL del backend (es: `https://api.example.com`)

## 📝 Note Importanti

1. **JWT_SECRET**: In produzione, genera un secret sicuro con:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **CORS**: In produzione, configura `CORS_ALLOWED_ORIGINS` con gli URL esatti del tuo frontend separati da virgola.

3. **COOKIE_SECURE**: In produzione deve essere `true` (richiede HTTPS).

4. **COOKIE_SAME_SITE**: 
   - `lax` o `strict` se frontend e backend sono sullo stesso dominio
   - `none` se sono su domini diversi (richiede `COOKIE_SECURE=true`)

## 🚀 Quick Start

1. Copia questo contenuto in `server/.env`
2. Modifica i valori secondo le tue esigenze
3. Per produzione, assicurati di configurare tutte le variabili obbligatorie
4. Avvia il server: `npm start`
