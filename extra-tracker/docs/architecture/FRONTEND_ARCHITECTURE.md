# Frontend Architecture - Documentazione Tecnica

**Silvi - React 19 + Vite Architecture**  
*Versione 1.0 - Febbraio 2026*

---

## 📑 Indice

1. [Panoramica](#panoramica)
2. [Feature-Based Architecture](#feature-based-architecture)
3. [API Client & Interceptors](#api-client--interceptors)
4. [State Management](#state-management)
5. [Real-time Updates (SSE)](#real-time-updates-sse)
6. [Export/Import System](#exportimport-system)
7. [Best Practices](#best-practices)

---

## Panoramica

### Stack Tecnologico

| Layer | Tecnologia | Scopo |
|-------|------------|-------|
| Framework | React 19 | UI Components |
| Build Tool | Vite 6 | Bundling, HMR |
| Language | TypeScript | Type Safety |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Animation | Framer Motion | Gestures, animations |
| HTTP Client | Axios | API Requests |
| Icons | Lucide React | Icon library |

### Project Structure

```
src/
├── features/              # Feature-based modules
│   ├── auth/             # Authentication feature
│   │   ├── components/   # LoginPage, RegisterPage
│   │   ├── context/      # AuthContext
│   │   ├── services/     # authService
│   │   └── validators/   # Form validation
│   ├── study/            # Study/Deck feature
│   │   ├── components/   # Flashcard, DeckGrid
│   │   ├── hooks/        # useDashboard, useExams
│   │   ├── services/     # studyService, examService
│   │   └── pages/        # StudySessionPage
│   ├── settings/         # Settings feature
│   │   ├── components/   # AccountSettings
│   │   └── services/     # settingsService
│   ├── dashboard/        # Dashboard feature
│   ├── feedback/         # Feedback system
│   └── ...
├── shared/               # Shared components/utilities
│   ├── components/       # Toast, Skeleton, Tutorial
│   ├── hooks/            # useMediaQuery, useFormat
│   ├── services/         # apiClient
│   ├── utils/            # dateUtils, calculations
│   └── layouts/          # AppLayout, AuthLayout
├── hooks/                # Global hooks (useSSE)
├── lib/                  # Library configs
└── App.tsx               # Root component
```

---

## Feature-Based Architecture

### Principio

Ogni feature è un modulo auto-contenuto con:
- **Components**: UI components specifici della feature
- **Hooks**: Custom hooks per la logica
- **Services**: API calls
- **Context**: State management (se necessario)
- **Pages**: Route components

### Esempio: Study Feature

```typescript
// src/features/study/services/studyService.ts
export const studyService = {
    async getDecks(): Promise<Deck[]> {
        const response = await apiClient.get<Deck[]>('/study/decks');
        return response.data || [];
    },
    
    async createDeck(data: CreateDeckDTO): Promise<Deck> {
        const response = await apiClient.post<Deck>('/study/decks', data);
        return response.data!;
    },
    
    async reviewCard(deckId: string, cardId: string, rating: number) {
        return apiClient.post(`/study/decks/${deckId}/cards/${cardId}/review`, { rating });
    },
};

// src/features/study/hooks/useDashboard.ts
export const useDashboard = () => {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const loadDecks = async () => {
            try {
                const data = await studyService.getDecks();
                setDecks(data);
            } finally {
                setIsLoading(false);
            }
        };
        loadDecks();
    }, []);
    
    return { decks, isLoading };
};

// src/features/study/components/DeckGrid.tsx
export const DeckGrid: React.FC = () => {
    const { decks, isLoading } = useDashboard();
    
    if (isLoading) return <DeckGridSkeleton />;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map(deck => <DeckCard key={deck.id} deck={deck} />)}
        </div>
    );
};
```

---

## API Client & Interceptors

### Architettura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API CLIENT ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

[Component] ──► [apiClient] ──► [Request Interceptor] ──► [Axios]
                                              │
                                              ▼
                                        [Add CSRF Token]
                                              │
                                              ▼
[Component] ◄── [apiClient] ◄── [Response Interceptor #1] ◄── [Backend]
                                              │
                                              ▼
                                    [401? → Refresh Token]
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                              [Mutex Queue]      [Refresh Success]
                                    │                   │
                                    ▼                   ▼
                              [Wait for Lock]    [Process Queue]
                                    │                   │
                                    └─────────┬─────────┘
                                              ▼
[Component] ◄── [apiClient] ◄── [Response Interceptor #2]
                                              │
                                              ▼
                                       [Show Toast Error]
```

### Implementazione

```typescript
// src/shared/services/apiClient.ts

import axios from 'axios';
import { emitToast } from '../components/toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrfToken';
const CSRF_HEADER_NAME = import.meta.env.VITE_CSRF_HEADER_NAME || 'X-CSRF-Token';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,  // CRITICO: Invia cookies HttpOnly
    timeout: 60000,
});

// ==========================================
// MUTEX PATTERN: Refresh Token Management
// ==========================================

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];
let isSessionExpiredToastShown = false;

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        error ? prom.reject(error) : prom.resolve(token);
    });
    failedQueue = [];
};

// ==========================================
// INTERCEPTOR: Request (CSRF Token)
// ==========================================

axiosInstance.interceptors.request.use(async (config) => {
    const method = (config.method || 'get').toUpperCase();
    
    // Aggiungi CSRF token per metodi non-safe
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
        if (csrfToken) {
            config.headers[CSRF_HEADER_NAME] = csrfToken;
        }
    }
    
    return config;
});

// ==========================================
// INTERCEPTOR #1: Response (Auto Refresh)
// ==========================================

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Gestione 401 con refresh automatico
        if (error.response?.status === 401 && !originalRequest._retry) {
            
            // CASO 1: Refresh già in corso → metti in coda
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => axiosInstance(originalRequest));
            }
            
            // CASO 2: Primo refresh → acquisisci lock
            originalRequest._retry = true;
            isRefreshing = true;
            
            try {
                await axiosInstance.post('/auth/refresh');
                processQueue(null, null);
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                
                // Mostra toast una sola volta
                if (!isSessionExpiredToastShown) {
                    isSessionExpiredToastShown = true;
                    emitToast.error('Sessione scaduta. Effettua nuovamente il login.');
                    window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
                }
                
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        
        return Promise.reject(error);
    }
);

// ==========================================
// INTERCEPTOR #2: Response (Error Toast)
// ==========================================

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Non mostrare toast per 401 (gestito sopra) o richieste annullate
        if (error.response?.status === 401 || error.code === 'ERR_CANCELED') {
            return Promise.reject(error);
        }
        
        // Estrai messaggio dal backend
        const message = error.response?.data?.error?.message 
            || error.response?.data?.message 
            || 'Si è verificato un errore';
        
        // Mostra toast
        emitToast.error(message, {
            title: 'Errore',
            duration: 6000,
            id: `api-error-${message.substring(0, 50)}`,
        });
        
        return Promise.reject(error);
    }
);

// API Client wrapper
export const apiClient = {
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await axiosInstance.get<ApiResponse<T>>(url, config);
        return response.data;
    },
    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
        return response.data;
    },
    // ... put, patch, delete
};
```

### Vantaggi del Pattern Mutex

1. **Previene "Avalanche Effect"**: Solo una richiesta di refresh anche con 100 richieste simultanee
2. **No Toast Spam**: Una sola notifica di sessione scaduta
3. **UX Fluida**: Le richieste in coda vengono automaticamente riprovate dopo il refresh
4. **No Loop Infiniti**: Flag `isSessionDead` per account disattivati

---

## State Management

### Context API Pattern

```typescript
// src/features/auth/context/AuthContext.tsx

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginDTO) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Check sessione al mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await authService.checkSession();
                setUser(response.user);
            } catch {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);
    
    // Ascolta evento sessione scaduta dall'apiClient
    useEffect(() => {
        const handleSessionExpired = () => {
            setUser(null);
            window.location.href = '/login';
        };
        
        window.addEventListener('auth:sessionExpired', handleSessionExpired);
        return () => window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    }, []);
    
    const login = async (credentials: LoginDTO) => {
        const response = await authService.login(credentials);
        setUser(response.user);
    };
    
    const logout = async () => {
        await authService.logout();
        setUser(null);
    };
    
    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook per usare il context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
```

### Local State vs Global State

| Tipo | Uso | Esempio |
|------|-----|---------|
| **Local State** | UI temporanea, form | `useState` nel componente |
| **Feature Context** | Stato condiviso nella feature | `AuthContext`, `FeedbackContext` |
| **Server State** | Dati dal backend | React Query / SWR (consigliato) |
| **Global State** | Raro, solo se necessario | Redux/Zustand (non usato in Silvi) |

---

## Real-time Updates (SSE)

### Hook useSSE

```typescript
// src/hooks/useSSE.ts

export type SSEPayload<T = unknown> = {
    event?: string;
    data?: T;
};

export type SSEListener<T = unknown> = {
    event: string;
    handler: (payload: SSEPayload<T>) => void;
};

export const useSSE = <T = unknown>(
    url: string,
    listenersOrCallback?: SSEListener<T>[] | ((payload: SSEPayload<T>) => void)
): {
    isConnected: boolean;
    lastEvent: SSEPayload<T> | null;
    error: string | null;
} => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<SSEPayload<T> | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!url) return;

        const eventSource = new EventSource(url, { withCredentials: true });

        eventSource.addEventListener('open', () => {
            setIsConnected(true);
            setError(null);
        });

        eventSource.addEventListener('error', () => {
            setIsConnected(false);
            setError('SSE connection error');
        });

        eventSource.addEventListener('message', (event) => {
            try {
                const payload = JSON.parse(event.data);
                setLastEvent(payload);
                
                // Route to specific listeners
                if (Array.isArray(listenersOrCallback)) {
                    listenersOrCallback
                        .filter(l => l.event === payload.event)
                        .forEach(l => l.handler(payload));
                } else if (typeof listenersOrCallback === 'function') {
                    listenersOrCallback(payload);
                }
            } catch (err) {
                setError('Invalid SSE JSON payload');
            }
        });

        return () => {
            eventSource.close();
            setIsConnected(false);
        };
    }, [url]);

    return { isConnected, lastEvent, error };
};

// Utilizzo
const StudyProgress: React.FC = () => {
    const { lastEvent } = useSSE('/api/study/progress', [
        { 
            event: 'cardReviewed', 
            handler: (payload) => console.log('Card reviewed:', payload.data) 
        },
        { 
            event: 'deckCompleted', 
            handler: (payload) => toast.success('Deck completato!') 
        },
    ]);
    
    return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>;
};
```

---

## Export/Import System

### Architettura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXPORT/IMPORT FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

EXPORT:
[Settings Page] ──► [ExportSection] ──► [settingsService.export()]
                                              │
                                              ▼
                                         [API /settings/export]
                                              │
                                              ▼
[Download] ◄── [JSON File] ◄── [Backend]  [Generate JSON]

IMPORT:
[Settings Page] ──► [ImportSection] ──► [Select File]
                                              │
                                              ▼
                                        [Validate JSON]
                                              │
                                              ▼
                                        [Check Import]
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                              [Identical?]         [Less Data?]
                                    │                   │
                              [Block Import]      [Show Warning]
                                    │                   │
                                    └─────────┬─────────┘
                                              ▼
                                        [Confirm Import]
                                              │
                                              ▼
                                        [API /settings/import]
                                              │
                                              ▼
[Success] ◄── [Show Result] ◄── [Backend]  [Merge Data]
```

### Frontend Implementation

```typescript
// src/features/settings/services/settingsService.ts

export const settingsService = {
    // Export dati utente
    async exportData(): Promise<Blob> {
        const response = await axiosInstance.get('/settings/export', {
            responseType: 'blob',
        });
        return response.data;
    },
    
    // Verifica dati prima dell'import
    async checkImport(file: File): Promise<ImportComparison> {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await apiClient.post<ImportComparison>(
            '/settings/import/check',
            formData
        );
        return response.data!;
    },
    
    // Import dati
    async importData(file: File, force?: boolean): Promise<ImportResult> {
        const formData = new FormData();
        formData.append('file', file);
        if (force) formData.append('force', 'true');
        
        const response = await apiClient.post<ImportResult>(
            '/settings/import',
            formData
        );
        return response.data!;
    },
};

// src/features/settings/components/AccountSettings/ExportSection.tsx
export function ExportSection({ isLoading, onExport }: ExportSectionProps) {
    return (
        <motion.div className="...">
            <h3>Esporta dati</h3>
            <p>Scarica una copia completa dei tuoi dati in formato JSON.</p>
            <button onClick={onExport} disabled={isLoading}>
                <Download /> {isLoading ? 'Esportazione...' : 'Esporta dati'}
            </button>
        </motion.div>
    );
}

// src/features/settings/components/AccountSettings/ImportSection.tsx
export function ImportSection({ isLoading, onCheckImport, onImport }: ImportSectionProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [comparison, setComparison] = useState<ImportComparison | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    
    const handleFileSelect = async (file: File) => {
        // Validazione
        if (file.size > 50 * 1024 * 1024) {
            alert('File troppo grande (max 50MB)');
            return;
        }
        
        setSelectedFile(file);
        
        // Check import
        const checkResult = await onCheckImport(file);
        setComparison(checkResult);
        
        if (checkResult.isIdentical) {
            // Blocca: dati identici
            return;
        }
        
        if (checkResult.hasLessData) {
            // Mostra warning
            setShowWarning(true);
        }
    };
    
    const handleImport = async (force = false) => {
        if (!selectedFile) return;
        const result = await onImport(selectedFile, force);
        // Show success...
    };
    
    return (
        <div>
            <input 
                type="file" 
                accept=".json" 
                onChange={(e) => handleFileSelect(e.target.files![0])}
            />
            
            {comparison?.isIdentical && (
                <IdenticalDataWarning />
            )}
            
            {showWarning && (
                <LessDataWarning 
                    comparison={comparison!}
                    onCancel={() => setSelectedFile(null)}
                    onConfirm={() => handleImport(true)}
                />
            )}
            
            {selectedFile && !comparison?.isIdentical && !showWarning && (
                <button onClick={() => handleImport()}>Importa dati</button>
            )}
        </div>
    );
}
```

### Types

```typescript
// src/features/settings/components/AccountSettings/types.ts

interface ImportComparison {
    existing: Record<string, number>;   // Dati attuali: { exams: 5, decks: 10 }
    importing: Record<string, number>;  // Dati da importare
    differences: Record<string, number>;// Differenze: { exams: -2 }
    isIdentical: boolean;
    hasLessData: boolean;
}

interface ImportResult {
    success: boolean;
    imported: Record<string, number>;   // Cosa è stato importato
    errors?: string[];
}
```

---

## Best Practices

### 1. Organizzazione Codice

```typescript
// ✅ CORRETTO: Feature-based
// src/features/study/components/Flashcard.tsx
// src/features/study/hooks/useStudySession.ts
// src/features/study/services/studyService.ts

// ❌ SBAGLIATO: Tipo-based
// src/components/Flashcard.tsx
// src/hooks/useStudySession.ts
// src/services/studyService.ts
```

### 2. Error Handling

```typescript
// ✅ CORRETTO: Centralizzato nell'apiClient
const createDeck = async () => {
    try {
        await studyService.createDeck(data);
        // Toast di successo
    } catch {
        // Toast di errore già mostrato dall'interceptor
    }
};

// ❌ SBAGLIATO: Duplicazione gestione errori
try {
    await api.post('/decks', data);
} catch (err) {
    if (err.response.status === 401) {
        // Gestione duplicata!
    }
}
```

### 3. Loading States

```typescript
// ✅ CORRETTO: Loading percepito
const [isLoading, setIsLoading] = useState(true);

if (isLoading) return <Skeleton />;
if (error) return <ErrorState />;
return <DataView data={data} />;
```

### 4. Type Safety

```typescript
// ✅ CORRETTO: Tipi espliciti
interface Deck {
    id: string;
    title: string;
    cards: Card[];
}

const [decks, setDecks] = useState<Deck[]>([]);

// ❌ SBAGLIATO: any implicito
const [decks, setDecks] = useState([]); // any[]
```

---

*Documento generato automaticamente da Kimi Code CLI.*  
*Ultimo aggiornamento: Febbraio 2026*
