# Authentication Component - Documentazione Tecnica

**Silvi - JWT, 2FA, CSRF Security System**  
*Versione 1.0 - Febbraio 2026*

---

## 📑 Indice

1. [Introduzione](#introduzione)
2. [Data Model](#data-model)
3. [JWT Token System](#jwt-token-system)
4. [CSRF Protection](#csrf-protection)
5. [Two-Factor Authentication](#two-factor-authentication)
6. [Middleware Stack](#middleware-stack)
7. [Frontend Architecture](#frontend-architecture)
8. [Security Best Practices](#security-best-practices)
9. [API Endpoints](#api-endpoints)

---

## Introduzione

### Panoramica del Sistema

Il componente Authentication implementa un sistema di sicurezza enterprise-grade:

- **JWT Authentication**: Access token (15m) + Refresh token (7d) rotation
- **HttpOnly Cookies**: Token non accessibili da JavaScript (XSS protection)
- **2FA/TOTP**: Time-based One-Time Password con backup codes
- **CSRF Protection**: Double Submit Cookie pattern
- **Password Security**: Argon2id hashing con memory/time cost elevati
- **Session Management**: Multi-device con trusted device fingerprinting
- **Token Blacklist**: Redis-based revocation immediata
- **Account Protection**: Lockout dopo 5 tentativi falliti
- **Audit Logging**: Tracciamento completo di login/logout/security events

### Architettura Security Stack

```
┌─────────┐      +CSRF Header      ┌──────────┐      +JWT Cookie      ┌──────────┐
│ Client  │───────────────────────>│  CSRF    │──────────────────────>│   JWT    │
│  React  │                        │ Middleware                      │  Auth    │
└─────────┘                        └──────────┘                     └────┬─────┘
                                                                          │
                                                                          ▼
                                                                   ┌──────────┐
                                                                   │  Tenant  │
                                                                   │ Context  │
                                                                   └────┬─────┘
                                                                        │
                                                                        ▼
┌──────────┐     Check       ┌──────────┐     Sessions       ┌──────────┐
│  Redis   │<────────────────│   JWT    │───────────────────>│ MongoDB  │
│ Blacklist│                 │  Auth    │                    │  User    │
└──────────┘                 └──────────┘                    └──────────┘
```

---

## Data Model

### User Schema Completo

```javascript
const userSchema = new mongoose.Schema({
    // ================================
    // CREDENTIALS
    // ================================
    email: {
        type: String,
        required: [true, 'Email obbligatoria'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Formato email non valido'],
    },
    password: {
        type: String,
        required: [true, 'Password obbligatoria'],
        select: false,  // Non inclusa nelle query di default
    },
    passwordHistory: [{  // Ultimi 5 hash per prevenire riutilizzo
        hash: String,
        changedAt: { type: Date, default: Date.now },
    }],
    passwordChangedAt: { type: Date, default: Date.now },
    
    // ================================
    // 2FA / TOTP
    // ================================
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },  // Cifrato
    twoFactorBackupCodes: [{ type: String, select: false }],  // Hashati
    twoFactorSetupAt: Date,
    
    // ================================
    // TRUSTED DEVICES
    // ================================
    trustedDevices: [{
        fingerprint: { type: String, required: true },
        name: String,           // "Chrome su Windows"
        browser: String,
        os: String,
        ip: String,
        trustedAt: { type: Date, default: Date.now },
        lastUsedAt: { type: Date, default: Date.now },
    }],
    
    // ================================
    // SESSION MANAGEMENT
    // ================================
    refreshTokens: [{  // Active sessions
        hash: { type: String, required: true },
        jti: String,              // JWT ID per tracking
        device: String,
        userAgent: String,        // Cifrato
        ip: String,               // Cifrato
        createdAt: { type: Date, default: Date.now },
        lastUsedAt: { type: Date, default: Date.now },
    }],
    gracePeriodTokens: [{  // Per race condition durante refresh
        hash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
    }],
    maxSessions: { type: Number, default: 5 },
    
    // ================================
    // EMAIL VERIFICATION
    // ================================
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    
    // ================================
    // PASSWORD RESET
    // ================================
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    
    // ================================
    // ACCOUNT SECURITY
    // ================================
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    lockUntil: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    lastFailedLogin: Date,
    lastLoginAt: Date,
    lastLoginIp: String,
    
    // ================================
    // PROFILE & PREFERENCES
    // ================================
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profile: {
        firstName: { type: String, maxlength: 50 },
        lastName: { type: String, maxlength: 50 },
        displayName: { type: String, maxlength: 100 },
        avatar: String,
    },
    preferences: {
        language: { type: String, enum: ['it', 'en', 'es', 'de', 'fr'], default: 'it' },
        theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
        notifications: {
            email: { enabled: Boolean, securityAlerts: Boolean },
        },
    },
    
    // ================================
    // GDPR / SOFT DELETE
    // ================================
    deletedAt: Date,
    deletedReason: String,
}, { timestamps: true });
```

### Metodi di Sicurezza

```javascript
// Lockout account dopo tentativi falliti
userSchema.methods.incrementFailedAttempts = async function() {
    this.failedLoginAttempts += 1;
    this.lastFailedLogin = new Date();
    
    if (this.failedLoginAttempts >= 5) {
        this.isLocked = true;
        this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30min
    }
    await this.save();
};

// Verifica account bloccato con auto-sblocco
userSchema.methods.isAccountLocked = function() {
    if (!this.isLocked || !this.lockUntil) return false;
    
    if (this.lockUntil < Date.now()) {
        this.isLocked = false;
        this.lockUntil = undefined;
        this.failedLoginAttempts = 0;
        return false;
    }
    return true;
};

// Previene riutilizzo password
userSchema.methods.isPasswordInHistory = async function(password) {
    for (const entry of this.passwordHistory) {
        if (await argon2.verify(entry.hash, password)) {
            return true;
        }
    }
    return false;
};

// Trusted device management
userSchema.methods.addTrustedDevice = async function(deviceInfo) {
    this.trustedDevices = this.trustedDevices.filter(
        d => d.fingerprint !== deviceInfo.fingerprint
    );
    this.trustedDevices.push({ ...deviceInfo, trustedAt: new Date() });
    
    if (this.trustedDevices.length > 10) {
        this.trustedDevices = this.trustedDevices.slice(-10);
    }
    await this.save();
};

// Soft delete GDPR-compliant
userSchema.methods.softDelete = async function(reason) {
    this.deletedAt = new Date();
    this.deletedReason = reason;
    this.email = `deleted_${this._id}_${this.email}`;  // Anonimizza
    this.isActive = false;
    this.password = undefined;
    this.refreshTokens = [];
    this.twoFactorSecret = undefined;
    await this.save();
};
```

---

## JWT Token System

### Token Structure

```javascript
// Access Token (15 minuti)
generateAccessToken(user, options = {}) {
    const payload = {
        iss: 'silvi-api',          // Issuer
        aud: 'silvi-app',          // Audience
        sub: user._id.toString(),  // Subject
        email: user.email,
        type: 'access',
        jti: crypto.randomUUID(),  // JWT ID univoco
        iat: Math.floor(Date.now() / 1000),
        ...(options.deviceFingerprint && { dfp: options.deviceFingerprint }),
    };
    
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '15m',
        algorithm: 'HS256',
    });
}

// Refresh Token (7 giorni)
async generateRefreshToken(user, deviceInfo = {}) {
    const jti = crypto.randomUUID();
    const payload = {
        iss: 'silvi-api',
        aud: 'silvi-app',
        sub: user._id.toString(),
        type: 'refresh',
        jti,
        iat: Math.floor(Date.now() / 1000),
    };
    
    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d',
        algorithm: 'HS256',
    });
    
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    
    const sessionData = {
        hash,
        jti,
        device: deviceInfo.device || 'Unknown',
        userAgent: encryptString(deviceInfo.userAgent || 'Unknown'),
        ip: encryptString(deviceInfo.ip || 'Unknown'),
        createdAt: new Date(),
        lastUsedAt: new Date(),
    };
    
    return { token, hash, sessionData, jti };
}
```

### Token Verification

```javascript
verifyToken(token, expectedType = 'access') {
    try {
        const payload = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
        });
        
        // Verifica issuer e audience (previene token replay)
        if (payload.iss !== 'silvi-api') {
            throw AppError.unauthorized('Token issuer non valido');
        }
        if (payload.aud !== 'silvi-app') {
            throw AppError.unauthorized('Token audience non valido');
        }
        if (payload.type !== expectedType) {
            throw AppError.unauthorized('Token type non valido');
        }
        
        return payload;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw AppError.unauthorized('Sessione scaduta');
        }
        if (error.name === 'JsonWebTokenError') {
            throw AppError.unauthorized('Token non valido');
        }
        throw AppError.unauthorized('Errore verifica token');
    }
}
```

### Refresh Token Rotation

Il sistema implementa **refresh token rotation** con **grace period** per gestire race conditions:

```javascript
async refreshAccessToken(refreshToken, deviceInfo) {
    // 1. Verifica token
    const payload = this.verifyToken(refreshToken, 'refresh');
    const user = await User.findByRefreshToken(payload.sub);
    
    if (!user) throw AppError.unauthorized('Utente non trovato');
    
    // 2. Calcola hash del token ricevuto
    const tokenHash = crypto.createHash('sha256')
        .update(refreshToken).digest('hex');
    
    // 3. Cerca sessione attiva
    const session = user.findSessionByHash(tokenHash);
    
    if (session) {
        // Token valido: ROTATION
        // Rimuovi vecchia sessione
        await user.removeSessionByHash(tokenHash);
        
        // Genera nuova coppia di token
        const accessToken = this.generateAccessToken(user);
        const { token: newRefreshToken, sessionData } = 
            await this.generateRefreshToken(user, deviceInfo);
        
        // Salva nuova sessione
        await User.updateOne(
            { _id: user._id },
            { $push: { refreshTokens: sessionData } }
        );
        
        return { accessToken, refreshToken: newRefreshToken };
    }
    
    // 4. Grace Period: token potrebbe essere stato usato ma
    //    la risposta non è arrivata al client (race condition)
    const graceToken = user.findInGracePeriod(tokenHash);
    
    if (graceToken) {
        // Rigenera senza invalidare (il client sta ritentando)
        await user.removeFromGracePeriod(tokenHash);
        
        const accessToken = this.generateAccessToken(user);
        const { token: newRefreshToken, sessionData } = 
            await this.generateRefreshToken(user, deviceInfo);
        
        await User.updateOne(
            { _id: user._id },
            { $push: { refreshTokens: sessionData } }
        );
        
        return { accessToken, refreshToken: newRefreshToken };
    }
    
    // 5. Token non trovato: potrebbe essere stato rubato!
    // Invalida TUTTE le sessioni dell'utente (security measure)
    await user.removeAllSessions();
    throw AppError.unauthorized('Sessione non valida. Rifai il login.');
}
```

---

## CSRF Protection

Il sistema implementa il pattern **Double Submit Cookie**:

```javascript
// server/middleware/csrf.js
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Genera token casuale
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Imposta cookie CSRF
const setCsrfCookie = (res, token = null) => {
    const csrfToken = token || generateToken();
    res.cookie('csrfToken', csrfToken, {
        httpOnly: false,        // Deve essere leggibile da JS
        secure: true,           // Solo HTTPS
        sameSite: 'strict',     // Protezione CSRF
        maxAge: 24 * 60 * 60 * 1000,  // 24 ore
    });
    return csrfToken;
};

// Middleware: assicura cookie CSRF esista
const ensureCsrfCookie = (req, res, next) => {
    const existing = req.cookies?.csrfToken;
    if (existing) {
        req.csrfToken = existing;
        return next();
    }
    req.csrfToken = setCsrfCookie(res);
    return next();
};

// Middleware: verifica CSRF per metodi non-safe
const requireCsrf = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
        return next();  // GET/HEAD/OPTIONS non richiedono CSRF
    }
    
    const cookieToken = req.cookies?.csrfToken;
    const headerToken = req.get('X-CSRF-Token');
    
    if (!cookieToken || !headerToken) {
        return next(AppError.forbidden('CSRF token mancante'));
    }
    
    // Timing-safe comparison (previene timing attacks)
    if (!timingSafeEquals(cookieToken, headerToken)) {
        return next(AppError.forbidden('CSRF token non valido'));
    }
    
    return next();
};
```

### Frontend CSRF Handling

```typescript
// apiClient.ts - Interceptor richieste
let cachedCsrfToken: string | null = null;

const syncCsrfFromCookie = () => {
    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrfToken='))
        ?.split('=')[1];
    if (token) cachedCsrfToken = decodeURIComponent(token);
};

axiosInstance.interceptors.request.use(async (config) => {
    const method = (config.method || 'get').toUpperCase();
    
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        syncCsrfFromCookie();
        if (cachedCsrfToken) {
            config.headers['X-CSRF-Token'] = cachedCsrfToken;
        }
    }
    return config;
});
```

---

## Two-Factor Authentication

### Setup 2FA

```javascript
// Genera secret TOTP
generateTwoFactorSecret() {
    const secret = authenticator.generateSecret();  // Base32
    const backupCodes = this.generateBackupCodes(); // 10 codici
    return { secret, backupCodes };
}

// Genera URL per QR Code
generateTotpUrl(secret, email, appName = 'Silvi') {
    return authenticator.keyuri(email, appName, secret);
    // otpauth://totp/Silvi:user@example.com?secret=XXXX&issuer=Silvi
}

// Genera backup codes (10 codici monouso)
generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        // 8 caratteri alfanumerici, formattati come XXXX-XXXX
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }
    return codes;
}

// Setup endpoint
async setupTwoFactor(userId, tempCode) {
    const user = await User.findById(userId).select('+twoFactorSecret');
    
    // Verifica codice temporaneo
    const isValid = this.verifyTwoFactorCode(user.tempTwoFactorSecret, tempCode);
    if (!isValid) throw AppError.badRequest('Codice non valido');
    
    // Abilita 2FA
    user.twoFactorSecret = encryptString(user.tempTwoFactorSecret);
    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = await this.hashBackupCodes(user.tempBackupCodes);
    user.twoFactorSetupAt = new Date();
    await user.save();
    
    return { backupCodes: user.tempBackupCodes };  // Mostra una sola volta
}
```

### Verifica 2FA durante Login

```javascript
async login(data, deviceInfo = {}, req = null) {
    const { email, password, twoFactorCode } = data;
    
    const user = await User.findForLogin(email);
    
    // Verifica password...
    
    // Se 2FA abilitato, richiedi codice
    if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
            // Ritorna temp token per completare 2FA
            const tempToken = this.generateAccessToken(user, { 
                type: 'temp',
                expiresIn: '5m'
            });
            
            return { 
                user: { requiresTwoFactor: true },
                tempToken,
                requiresTwoFactor: true 
            };
        }
        
        // Verifica TOTP
        const isValid2FA = this.verifyTwoFactorCode(
            decryptString(user.twoFactorSecret), 
            twoFactorCode
        );
        
        if (!isValid2FA) {
            // Prova backup codes
            const isValidBackup = await this.verifyBackupCode(
                twoFactorCode,
                user.twoFactorBackupCodes
            );
            
            if (!isValidBackup) {
                throw AppError.unauthorized('Codice 2FA non valido');
            }
            
            // Log uso backup code
            await auditService.log({ action: '2FA_BACKUP_USED', ... });
        }
    }
    
    // Genera token finali
    const accessToken = this.generateAccessToken(user);
    const { token: refreshToken } = await this.generateRefreshToken(user, deviceInfo);
    
    return { user, accessToken, refreshToken };
}
```

---

## Middleware Stack

### requireAuth

```javascript
const requireAuth = async (req, res, next) => {
    try {
        // 1. Estrai token dal cookie HttpOnly
        const token = req.cookies?.accessToken;
        
        if (!token) {
            throw AppError.unauthorized('Accesso negato');
        }
        
        // 2. Verifica JWT (firma, exp, iss, aud)
        const payload = authService.verifyToken(token, 'access');
        
        // 3. Verifica blacklist (token revocato?)
        const isBlacklisted = await authService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            throw AppError.unauthorized('Token revocato');
        }
        
        // 4. Verifica blacklist utente (account bannato?)
        const isUserBanned = await authService.isUserBlacklisted(payload.sub);
        if (isUserBanned) {
            throw AppError.unauthorized('Account disattivato');
        }
        
        // 5. Aggiungi dati utente alla request
        req.user = {
            id: payload.sub,
            email: payload.email,
        };
        
        next();
    } catch (error) {
        next(error);
    }
};
```

### Utilizzo nelle Routes

```javascript
const { requireAuth } = require('../middleware/auth');
const { tenantContext } = require('../middleware/tenantContext');
const { ensureCsrfCookie, requireCsrf } = require('../middleware/csrf');

// Applica globalmente
app.use('/api', ensureCsrfCookie);
app.use('/api', requireCsrf);

// Protected routes
router.use(requireAuth);
router.use(tenantContext({ required: true }));

router.get('/profile', userController.getProfile);
router.put('/settings', settingsController.update);
```

---

## Frontend Architecture

### AuthContext

```typescript
interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true,  // Inizia con loading
        error: null,
    });
    
    // Verifica sessione all'avvio
    useEffect(() => {
        checkAuth();
    }, []);
    
    const checkAuth = async () => {
        try {
            const response = await authService.checkAuth();
            
            if (response.success && response.data?.user) {
                setState({
                    user: response.data.user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
            } else {
                setState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null,
                });
            }
        } catch {
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        }
    };
    
    // Gestione sessione scaduta da apiClient
    useEffect(() => {
        const handleSessionExpired = () => {
            setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'Sessione scaduta',
            });
        };
        
        window.addEventListener('auth:sessionExpired', handleSessionExpired);
        return () => window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    }, []);
    
    return (
        <AuthContext.Provider value={{ ...state, login, register, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook per utilizzo
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
```

### ProtectedRoute

```typescript
export const ProtectedRoute = ({ 
    children, 
    redirectTo = '/login' 
}: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-2 rounded-full border-primary-500 
                               border-t-transparent animate-spin" />
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    
    return <>{children}</>;
};

// Utilizzo nelle routes
<Route path="/dashboard" element={
    <ProtectedRoute>
        <DashboardPage />
    </ProtectedRoute>
} />
```

---

## Security Best Practices

### Password Hashing (Argon2)

```javascript
async hashPassword(password) {
    return argon2.hash(password, {
        type: argon2.argon2id,      // Resistente a side-channel e GPU attacks
        memoryCost: 65536,          // 64MB
        timeCost: 3,                // 3 iterazioni
        parallelism: 4,             // 4 thread paralleli
        hashLength: 32,             // 32 bytes output
    });
}
```

### Token Blacklist (Redis)

```javascript
async addToBlacklist(token, ttlSeconds = 15 * 60) {
    if (!redisAvailable) return;
    
    const tokenHash = crypto.createHash('sha256')
        .update(token).digest('hex');
    
    await redisClient.setEx(
        `blacklist:${tokenHash}`, 
        ttlSeconds, 
        '1'
    );
}

async isTokenBlacklisted(token) {
    if (!redisAvailable) return false;
    
    const tokenHash = crypto.createHash('sha256')
        .update(token).digest('hex');
    
    const result = await redisClient.get(`blacklist:${tokenHash}`);
    return result === '1';
}
```

### Cookie Security Configuration

```javascript
const cookieOptions = {
    // Access Token Cookie
    access: {
        httpOnly: true,        // Non accessibile da JS (XSS protection)
        secure: true,          // Solo HTTPS
        sameSite: 'strict',    // CSRF protection
        maxAge: 15 * 60 * 1000,  // 15 minuti
        path: '/',
    },
    
    // Refresh Token Cookie
    refresh: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 giorni
        path: '/api/auth/refresh',  // Solo per endpoint refresh
    },
};
```

---

## API Endpoints

| Endpoint | Method | Descrizione |
|----------|--------|-------------|
| `/api/auth/register` | POST | Registrazione nuovo utente + invio email verifica |
| `/api/auth/login` | POST | Login (richiede 2FA se abilitato) |
| `/api/auth/refresh` | POST | Rinnova access token (rotazione refresh token) |
| `/api/auth/logout` | POST | Logout + invalidazione sessione |
| `/api/auth/me` | GET | Profilo utente corrente |
| `/api/auth/check` | GET | Verifica autenticazione |
| `/api/auth/password` | PUT | Cambio password |
| `/api/auth/csrf` | GET | Ottieni CSRF token |
| `/api/auth/verify-email` | POST | Verifica email con token |
| `/api/auth/resend-verification` | POST | Re-invia email verifica |
| `/api/auth/forgot-password` | POST | Richiesta reset password |
| `/api/auth/reset-password` | POST | Reset password con token |
| `/api/auth/2fa/setup` | POST | Inizia setup 2FA (genera QR) |
| `/api/auth/2fa/verify` | POST | Verifica codice 2FA e abilita |
| `/api/auth/2fa/disable` | POST | Disabilita 2FA |

---

## Flusso Completo Login

1. **Client** invia `POST /login` con `{email, password}` + CSRF header
2. **CSRF Middleware** verifica token (double submit cookie)
3. **Controller** chiama `authService.login()`
4. **Service** verifica credenziali con Argon2
5. **Service** verifica se account è bloccato
6. **Service** verifica se 2FA è abilitato
7. Se 2FA: ritorna `tempToken`, client richiede codice
8. Se no 2FA: genera access + refresh token
9. **Controller** setta cookies HttpOnly
10. **Client** riceve 200 OK, aggiorna AuthContext

---

## Glossario

| Termine | Definizione |
|---------|-------------|
| **JWT** | JSON Web Token - standard per token di autenticazione |
| **TOTP** | Time-based One-Time Password - algoritmo 2FA (RFC 6238) |
| **CSRF** | Cross-Site Request Forgery - tipo di attacco mitigato con Double Submit Cookie |
| **Argon2** | Algoritmo di password hashing vincitore Password Hashing Competition |
| **JTI** | JWT ID - identificatore univoco del token |
| **Grace Period** | Periodo di tolleranza per race condition nel refresh token |
| **HttpOnly Cookie** | Cookie non accessibile da JavaScript (protezione XSS) |
| **SameSite** | Attributo cookie per protezione CSRF |

---

*Documento generato automaticamente da Kimi Code CLI.*  
*Ultimo aggiornamento: Febbraio 2026*
