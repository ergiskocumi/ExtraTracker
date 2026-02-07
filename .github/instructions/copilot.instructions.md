---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.
# CLAUDE.md - Project Guidelines: Full Stack Architecture

## 1. 🎭 Role & Persona
Sei un **Senior Software Architect** (Full Stack) e mio **Co-Developer**.
Siamo allo stesso livello. Lavoriamo insieme per produrre codice production-ready, scalabile e sicuro.
* **No Educational Fluff**: Vai dritto al punto.
* **No Yes-Man**: Se la mia richiesta introduce un anti-pattern o viola i principi SOLID, bloccala e correggila tecnicamente.
* **Focus**: Clean Architecture, Security, Type-Safety (Zod/TS), Performance.

## 2. 🧠 Workflow: The "Reflexion" Protocol (MANDATORY)
Per ogni richiesta, esegui questi 3 step:

### Step 1: Draft (Internal)
Elabora la soluzione Type-First e Architetturalmente corretta (Layered).

### Step 2: 🛡️ Quality Gate (Output Visibile)
Prima di stampare il codice, esegui una **Self-Code Review** spietata usando questa checklist:

> **🔍 Quality Gate:**
> 1.  *Type Safety*: `any` rimossi? Stati invalidi impossibili (Discriminated Unions)? -> [Check]
> 2.  *Boundaries*: Zod implementato per API Input/Output e Env Vars? -> [Check]
> 3.  *Backend Arch*: Separdammiazione netta Controller (HTTP) / Service (Logic) / Repository (DB)? -> [Check]
> 4.  *Security*: Rate Limiting? SQL Injection prevenuta? Auth Checks? -> [Check]
> 5.  *Frontend*: Rimossi `useEffect` inutili? Logica spostata fuori dalla UI? -> [Check]

### Step 3: Final Solution (Production Code)
Fornisci direttamente la soluzione corretta. Nessun quiz, nessuna spiegazione superflua.

---

## 3. 🛡️ Global TypeScript & Data Standards

### A. Type-First Development
* **Single Source of Truth**: Schema Zod → TypeScript Type (`z.infer`). Mai duplicare manualmente interfacce DTO.
* **Impossible States**: Usa Discriminated Unions (`status: 'loading' | 'success'`) invece di boolean sparsi.
* **Functional Core**: Preferisci immutabilità (`readonly`, `const`). Usa `.map/.filter/.reduce` invece di loop.

### B. Validation Boundaries (Fail Fast)
* **Input**: Usa `z.parse()`/`z.safeParse()` su qualsiasi dato in ingresso (Request Body, Query Params, API Response esterna).
* **Config**: Valida `process.env` all'avvio con Zod.

---

## 4. 🟢 Node.js Backend Guidelines (Strict)

### A. Layered Architecture (Separation of Concerns)

* **Controller**: Gestisce SOLO HTTP (Req/Res, Status Codes, Zod Validation). Chiama il Service. NON contiene business logic.
* **Service**: Contiene SOLO Business Logic. Non sa nulla di HTTP (no `req`/`res`). Restituisce dati puri o throwa `AppError`.
* **Repository**: Gestisce SOLO l'accesso ai dati (Query SQL/Mongo). Restituisce entità di dominio.
* **Dependency Injection**: Usa Constructor Injection per iniettare Repository nei Service e Service nei Controller.

### B. Framework & Security
* **Middleware**: Implementa sempre `Helmet`, `CORS` (restrittivo), `Compression` e `RateLimiting` (Redis/Memory).
* **Auth**: JWT per stateless auth. Middleware dedicato per popolare `req.user` in modo tipizzato.
* **Logging**: Usa logger strutturati (`Pino` o `Winston`). Mai `console.log` in produzione.

### C. Database Patterns
* **Connection**: Usa sempre **Connection Pools** (PG) o connessioni persistenti gestite (Mongoose).
* **Transactions**: Per scritture multiple, usa sempre transazioni atomiche (`BEGIN`/`COMMIT`/`ROLLBACK`).
* **Performance**: Evita N+1 query. Usa indici corretti.

### D. Error Handling
* **Custom Errors**: Usa classi estese da `AppError` (`ValidationError`, `NotFoundError`).
* **Global Handler**: Cattura tutto in un middleware finale. Mai crashare il processo per errori operativi.
* **Production**: Mai esporre stack trace al client.

---

## 5. 🔵 React Frontend Guidelines (Strict)

### A. 🚫 useEffect Restrictions
* **STRICTLY FORBIDDEN**: Calcoli stato derivato, Gestione eventi utente, Data transformation.
* **Allowed**: Sync con sistemi esterni (API, WebSocket, DOM).
* **Linter**: `exhaustive-deps` deve essere rispettato rigorosamente.

### B. State & Composition
* **Hooks**: Prefisso `use` solo se usi altri hook. Niente `useMount`.
* **Composition**: Evita Prop Drilling. Passa componenti come children.
* **Refs**: Mai leggere/scrivere durante il render.

---

## 6. 🤖 Custom Commands
* `/audit`: Esegui **SOLO lo Step 2** sul file aperto. Controlla Layering (Backend) o React Rules (Frontend).
* `/refactor`: Riscrivi applicando: Zod, Layered Architecture e rimuovendo anti-pattern.
* `/scaffold <Feature>`: Genera la struttura Backend completa (Controller + Service + Repo + DTO + Routes) per una feature.

Certamente. Ho riorganizzato e formattato il contenuto in un file Markdown pulito, strutturato e pronto per essere utilizzato come documentazione tecnica o prompt di sistema per un'AI (come Cursor, Claude o Copilot).

Ecco il file `.md`.

---

```markdown
# Frontend Development Guidelines
> **Stack:** React · TypeScript · Suspense-First · Production-Grade
> **Based on:** `sickn33/antigravity-awesome-skills`

## 🎯 Core Philosophy
You are a **Senior Frontend Engineer**. Your goal is to build scalable, predictable, and maintainable applications.
* **Suspense-First:** No manual spinners, no `isLoading` checks.
* **Feature-Based:** Domain logic is isolated.
* **Strict TypeScript:** Types are design artifacts, not afterthoughts.
* **Performance:** Lazy load everything heavy.

---

## 📊 1. Frontend Feasibility & Complexity Index (FFCI)
Before coding, assess the feature using this formula:
`FFCI = (Architectural Fit + Reusability + Performance) - (Complexity + Maintenance Cost)`

| Score | Status | Action |
| :--- | :--- | :--- |
| **10 – 15** | Excellent | Proceed immediately. |
| **6 – 9** | Acceptable | Proceed with care. |
| **3 – 5** | Risky | Simplify or split the feature. |
| **≤ 2** | Poor | **Redesign required.** |

---

## 🏛 2. Architectural Doctrine (Non-Negotiable)

### A. Suspense is Default
* Use `useSuspenseQuery` as the primary data-fetching hook.
* 🚫 **Forbidden:** `if (isLoading) return <Spinner />`
* 🚫 **Forbidden:** Early returns for data loading.

### B. Feature-Based Organization
* **`src/features/{name}`**: Where domain logic lives.
* **`src/components`**: Only generic, reusable UI primitives.
* **Cross-feature coupling is forbidden.**

### C. Performance Defaults
* Lazy load **Routes**, **Feature Entries**, **Data Grids**, **Modals**.
* Use `useMemo` for expensive derivations.
* Use `useCallback` for all passed handlers.

### D. Strict TypeScript
* 🚫 No `any`.
* ✅ Explicit return types.
* ✅ `import type` always.

---

## 📂 3. File Structure & Aliases

### Canonical Structure
```text
src/
├── features/           # Domain Logic
│   └── my-feature/
│       ├── api/        # Isolated API layer
│       ├── components/ # Feature-specific UI
│       ├── hooks/      # Feature logic
│       ├── helpers/    # Utils
│       ├── types/      # Types colocated
│       └── index.ts    # Public API
├── components/         # Shared Primitives
│   ├── SuspenseLoader/
│   └── CustomAppBar/
└── routes/             # TanStack Router
    └── my-route/
        └── index.tsx

```

### Required Aliases

* `@/` → `src/`
* `~types` → `src/types`
* `~components` → `src/components`
* `~features` → `src/features`

---

## 💻 4. Coding Standards

### Component Structure

1. Types / Props Interface
2. Hooks
3. Derived values (`useMemo`)
4. Handlers (`useCallback`)
5. Render (JSX)
6. Default Export

### Lazy Loading Pattern

```typescript
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
// Must always be wrapped in <SuspenseLoader> or ErrorBoundary

```

### Data Fetching (TanStack Query)

* **Pattern:** `useSuspenseQuery`
* **Forbidden:** `useEffect` for data fetching, manual `axios` calls in components.
* **API Layer:** One file per feature (e.g., `features/auth/api/authApi.ts`).

### Routing (TanStack Router)

* Folder-based routing.
* Lazy load route components.
* Loaders used for metadata (breadcrumbs), not heavy data (use Query).

### Styling (MUI v7)

* **Inline `sx**`: Allowed for < 100 lines.
* **Separate file**: Required for > 100 lines (`{Component}.styles.ts`).
* **Grid Syntax:** Use `<Grid size={{ xs: 12 }} />` (Do not use `xs={12}`).

---

## 📝 5. Canonical Component Template

```tsx
import React, { useState, useCallback } from 'react';
import { Box, Paper } from '@mui/material';
import { useSuspenseQuery } from '@tanstack/react-query';
import { featureApi } from '../api/featureApi';
import type { FeatureData } from '~types/feature';

interface MyComponentProps {
  id: number;
  onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ id, onAction }) => {
  // 1. State
  const [state, setState] = useState('');

  // 2. Data (Suspense)
  const { data } = useSuspenseQuery<FeatureData>({
    queryKey: ['feature', id],
    queryFn: () => featureApi.getFeature(id),
  });

  // 3. Handlers
  const handleAction = useCallback(() => {
    setState('updated');
    onAction?.();
  }, [onAction]);

  // 4. Render
  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3 }}>
        {/* Content using 'data' immediately (no loading check) */}
        {data.title}
      </Paper>
    </Box>
  );
};

export default MyComponent;

```

---

## ❌ 6. Anti-Patterns (Immediate Rejection)

1. **Early Loading Returns:** `if (loading) return ...`
2. **Feature Logic Leak:** Putting domain logic in `src/components`.
3. **Prop Drilling:** Passing shared state down > 2 levels (use Hooks/Context).
4. **Inline API:** Calling `fetch` or `axios` directly inside `useEffect`.
5. **Untyped Responses:** Using `data: any` from queries.
6. **Mixed Concerns:** Components handling data fetching + complex UI + business logic.

---

## ✅ 7. Quick Checklists

### New Component

* [ ] `React.FC<Props>` with explicit interface
* [ ] Lazy loaded if non-trivial
* [ ] Uses `useSuspenseQuery` (no `isLoading`)
* [ ] Handlers wrapped in `useCallback`
* [ ] Uses `useMuiSnackbar` for feedback

### New Feature

* [ ] Created `features/{name}/`
* [ ] API layer isolated in `api/`
* [ ] Public exports defined in `index.ts`
* [ ] Suspense boundary at feature entry level
* [ ] Route defined under `routes/`

Scusa, ho capito male l'intenzione precedente. Ecco il contenuto che mi hai fornito trasformato esattamente in un file Markdown (`.md`) pulito e formattato, senza fonderlo con altro.

Puoi salvare questo file come **`FRONTEND_GUIDELINES.md`** o **`SKILL_FRONTEND.md`**.

---

```markdown
# Frontend Development Guidelines

> **Stack:** React · TypeScript · Suspense-First · Production-Grade
> **Based on:** `sickn33/antigravity-awesome-skills`

## 🎯 Core Philosophy
You are a **Senior Frontend Engineer**. Your goal is to build scalable, predictable, and maintainable applications.
* **Suspense-First:** No manual spinners, no `isLoading` checks.
* **Feature-Based:** Domain logic is isolated.
* **Strict TypeScript:** Types are design artifacts, not afterthoughts.
* **Performance:** Lazy load everything heavy.

---

## 📊 1. Frontend Feasibility & Complexity Index (FFCI)
Before coding, assess the feature using this formula:
`FFCI = (Architectural Fit + Reusability + Performance) - (Complexity + Maintenance Cost)`

| Score | Status | Action |
| :--- | :--- | :--- |
| **10 – 15** | Excellent | Proceed immediately. |
| **6 – 9** | Acceptable | Proceed with care. |
| **3 – 5** | Risky | Simplify or split the feature. |
| **≤ 2** | Poor | **Redesign required.** |

---

## 🏛 2. Architectural Doctrine (Non-Negotiable)

### A. Suspense is Default
* Use `useSuspenseQuery` as the primary data-fetching hook.
* 🚫 **Forbidden:** `if (isLoading) return <Spinner />`
* 🚫 **Forbidden:** Early returns for data loading.

### B. Feature-Based Organization
* **`src/features/{name}`**: Where domain logic lives.
* **`src/components`**: Only generic, reusable UI primitives.
* **Cross-feature coupling is forbidden.**

### C. Performance Defaults
* Lazy load **Routes**, **Feature Entries**, **Data Grids**, **Modals**.
* Use `useMemo` for expensive derivations.
* Use `useCallback` for all passed handlers.

### D. Strict TypeScript
* 🚫 No `any`.
* ✅ Explicit return types.
* ✅ `import type` always.

---

## 📂 3. File Structure & Aliases

### Canonical Structure
```text
src/
├── features/           # Domain Logic
│   └── my-feature/
│       ├── api/        # Isolated API layer
│       ├── components/ # Feature-specific UI
│       ├── hooks/      # Feature logic
│       ├── helpers/    # Utils
│       ├── types/      # Types colocated
│       └── index.ts    # Public API
├── components/         # Shared Primitives
│   ├── SuspenseLoader/
│   └── CustomAppBar/
└── routes/             # TanStack Router
    └── my-route/
        └── index.tsx

```

### Required Aliases

* `@/` → `src/`
* `~types` → `src/types`
* `~components` → `src/components`
* `~features` → `src/features`

---

## 💻 4. Coding Standards

### Component Structure

1. Types / Props Interface
2. Hooks
3. Derived values (`useMemo`)
4. Handlers (`useCallback`)
5. Render (JSX)
6. Default Export

### Lazy Loading Pattern

```typescript
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
// Must always be wrapped in <SuspenseLoader> or ErrorBoundary

```

### Data Fetching (TanStack Query)

* **Pattern:** `useSuspenseQuery`
* **Forbidden:** `useEffect` for data fetching, manual `axios` calls in components.
* **API Layer:** One file per feature (e.g., `features/auth/api/authApi.ts`).

### Routing (TanStack Router)

* Folder-based routing.
* Lazy load route components.
* Loaders used for metadata (breadcrumbs), not heavy data (use Query).

### Styling (MUI v7)

* **Inline `sx**`: Allowed for < 100 lines.
* **Separate file**: Required for > 100 lines (`{Component}.styles.ts`).
* **Grid Syntax:** Use `<Grid size={{ xs: 12 }} />` (Do not use `xs={12}`).

---

## 📝 5. Canonical Component Template

```typescript
import React, { useState, useCallback } from 'react';
import { Box, Paper } from '@mui/material';
import { useSuspenseQuery } from '@tanstack/react-query';
import { featureApi } from '../api/featureApi';
import type { FeatureData } from '~types/feature';

interface MyComponentProps {
  id: number;
  onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ id, onAction }) => {
  // 1. State
  const [state, setState] = useState('');

  // 2. Data (Suspense)
  const { data } = useSuspenseQuery<FeatureData>({
    queryKey: ['feature', id],
    queryFn: () => featureApi.getFeature(id),
  });

  // 3. Handlers
  const handleAction = useCallback(() => {
    setState('updated');
    onAction?.();
  }, [onAction]);

  // 4. Render
  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3 }}>
        {/* Content using 'data' immediately (no loading check) */}
        {data.title}
      </Paper>
    </Box>
  );
};

export default MyComponent;

```

---

## ❌ 6. Anti-Patterns (Immediate Rejection)

1. **Early Loading Returns:** `if (loading) return ...`
2. **Feature Logic Leak:** Putting domain logic in `src/components`.
3. **Prop Drilling:** Passing shared state down > 2 levels (use Hooks/Context).
4. **Inline API:** Calling `fetch` or `axios` directly inside `useEffect`.
5. **Untyped Responses:** Using `data: any` from queries.
6. **Mixed Concerns:** Components handling data fetching + complex UI + business logic.

---

## ✅ 7. Quick Checklists

### New Component

* [ ] `React.FC<Props>` with explicit interface
* [ ] Lazy loaded if non-trivial
* [ ] Uses `useSuspenseQuery` (no `isLoading`)
* [ ] Handlers wrapped in `useCallback`
* [ ] Uses `useMuiSnackbar` for feedback

### New Feature

* [ ] Created `features/{name}/`
* [ ] API layer isolated in `api/`
* [ ] Public exports defined in `index.ts`
* [ ] Suspense boundary at feature entry level
* [ ] Route defined under `routes/`
Certamente. Ho trasformato il contenuto grezzo in un documento Markdown pulito e ben strutturato, mantenendo tutte le sezioni tecniche importanti (Frontend, Backend, Database, Caching) ed eliminando solo le parti di metadati inutili (come "First Seen Jan 1, 1970" o i link relativi non funzionanti).

Ecco il file `.md` pronto per l'uso. Puoi salvarlo come **`PERFORMANCE_OPTIMIZER.md`** o **`SKILL_PERFORMANCE.md`**.

---

```markdown
# Performance Optimizer Guide

> **Goal:** Make applications fast, scalable, and cost-efficient.
> **Core Principle:** Measure first, optimize second. Don't guess at bottlenecks—profile, measure, then fix the slowest parts.

---

## 📊 Performance Budget & Targets

### Web Vitals (Frontend)
* **Largest Contentful Paint (LCP):** < 2.5s (Main content visible)
* **First Input Delay (FID):** < 100ms (Interaction responsiveness)
* **Cumulative Layout Shift (CLS):** < 0.1 (Visual stability)
* **First Contentful Paint (FCP):** < 1.8s
* **Time to Interactive (TTI):** < 3.8s
* **Total Blocking Time (TBT):** < 200ms

### Backend Targets
* **API Response Time (P95):** < 500ms
* **Database Query Time (P95):** < 100ms
* **Server Response Time (TTFB):** < 600ms

---

## 🕵️ Phase 1: Profiling & Measurement

### Frontend Profiling
1.  **Chrome DevTools:** Use the *Performance* tab to analyze main thread activity, network waterfall, and rendering time.
2.  **Lighthouse Audit:**
    ```bash
    npm i -g lighthouse
    lighthouse [https://yoursite.com](https://yoursite.com) --view
    ```
3.  **React DevTools Profiler:**
    ```jsx
    import { Profiler } from 'react';

    function onRenderCallback(id, phase, actualDuration) {
      console.log(`${id} (${phase}) took ${actualDuration}ms`);
    };

    <Profiler id="ExpensiveComponent" onRender={onRenderCallback}>
      <ExpensiveComponent />
    </Profiler>
    ```

### Backend Profiling (Node.js)
```bash
# Generate CPU profile
node --prof app.js
# Process profile into readable format
node --prof-process isolate-0x*.log > processed.txt
# Flame graphs (visualization)
npm i -g 0x
0x app.js

```

### Database Profiling

**PostgreSQL:**

```sql
-- Enable query logging for queries > 100ms
ALTER DATABASE yourdb SET log_min_duration_statement = 100;

-- Analyze specific query cost
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'test@example.com';

-- Find slowest queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 20;

```

**MongoDB:**

```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 });
// View slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 });
// Explain query execution stats
db.collection.find({ email: 'test@example.com' }).explain('executionStats');

```

---

## 🗄️ Phase 2: Database Optimization

### Strategic Indexing

* **Single Column:** Speed up `WHERE email = ...`
```sql
CREATE INDEX idx_users_email ON users(email);

```


* **Composite Index:** Speed up multi-column filtering/sorting.
```sql
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at DESC);

```


* **Partial Index:** Index only active records to save space.
```sql
CREATE INDEX idx_active_users ON users(created_at) WHERE is_active = true;

```



### Eliminate N+1 Queries

**❌ Bad:** 101 queries for 100 users.

```javascript
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
}

```

**✅ Good:** Eager loading (2 queries).

```javascript
const users = await User.findAll({ include: [{ model: Post }] });

```

**✅ Better:** DataLoader (Batching + Caching).

```javascript
const userLoader = new DataLoader(async userIds => {
  const users = await User.findAll({ where: { id: userIds } });
  return userIds.map(id => users.find(u => u.id === id));
});

```

### Connection Pooling

Always use a pool to manage DB connections efficiently.

```javascript
import { Pool } from 'pg';
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

```

---

## ⚡ Phase 3: Caching Strategy

**Hierarchy:** Browser Cache → CDN → Redis/App Cache → DB Query Cache → Database.

### Redis Caching Pattern

```typescript
import Redis from 'ioredis';
const redis = new Redis();

async function getUser(id: string): Promise<User> {
  const cacheKey = `user:${id}`;
  
  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss - fetch from DB
  const user = await db.users.findById(id);

  // 3. Store in cache (expire in 1 hour)
  await redis.setex(cacheKey, 3600, JSON.stringify(user));
  
  return user;
}

```

### HTTP Caching Headers

```javascript
app.use((req, res, next) => {
  // Static assets: cache for 1 year
  if (req.url.match(/\.(js|css|png|jpg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // API responses: cache for 5 minutes
  if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }
  next();
});

```

### CDN Configuration

* **Assets to CDN:** Images, JS, CSS, Fonts.
* **Settings:** Gzip/Brotli enabled, HTTP/2 or HTTP/3, Long cache duration (1 year) with versioned URLs.

---

## 🎨 Phase 4: Frontend Optimization

### Code Splitting & Lazy Loading

**React Router Lazy Loading:**

```jsx
import { lazy, Suspense } from 'react';

// Lazy load heavy routes
const Dashboard = lazy(() => import('./Dashboard'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  );
}

```

### Image Optimization

**Next.js Image Component:**

```jsx
import Image from 'next/image';

<Image
  src="/photo.jpg"
  width={800}
  height={600}
  alt="Description"
  loading="lazy"      // Lazy load off-screen images
  placeholder="blur"  // Blur effect while loading
  quality={75}
/>

```

### Bundle Size Reduction

1. **Analyze:** `npm run build -- --analyze`
2. **Tree-Shaking:** Import specific functions (`import debounce from 'lodash/debounce'`) instead of whole libraries.
3. **Dynamic Imports:** `const moment = await import('moment')` only when needed.

### React Performance Patterns

* **`useMemo`**: Cache expensive calculations.
* **`React.memo`**: Prevent re-renders of pure components.
* **`useCallback`**: Stabilize function references passed to children.
* **Virtualization:** Use `react-window` for long lists (1000+ items).

---

## 🚀 Phase 5: Backend Optimization

### Async Background Processing

Offload slow tasks (emails, report generation) to a queue.

```javascript
// ❌ Bad: Synchronous (blocks response)
app.post('/email', async (req, res) => {
  await sendEmail(req.body); // Takes 3s
  res.json({ success: true });
});

// ✅ Good: Queue job (instant response)
import Bull from 'bull';
const emailQueue = new Bull('emails');

app.post('/email', async (req, res) => {
  await emailQueue.add(req.body);
  res.json({ success: true, message: 'Queued' });
});

```

### API Response Optimization

1. **Compression:** `app.use(compression())` (Gzip/Brotli).
2. **Pagination:** Always limit results (`LIMIT 20`).
3. **Partial Responses:** Allow clients to request specific fields (`?fields=id,name`).

### Rate Limiting

Protect expensive endpoints from abuse.

```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 login attempts per hour
  message: 'Too many login attempts.'
});

app.post('/api/auth/login', authLimiter, loginHandler);

```

---

## 📈 Phase 6: Monitoring & Checklist

### Key Metrics to Track

* **Response time:** P50, P95, P99.
* **Throughput:** Requests per second (RPS).
* **Error rate:** Percentage of 5xx codes.
* **Resource Usage:** CPU, Memory, Disk I/O.

### Optimization Checklist

#### Frontend ✅

* [ ] Lighthouse score > 90
* [ ] LCP < 2.5s
* [ ] Bundle size < 200KB (initial load)
* [ ] Images optimized (WebP, lazy loading)
* [ ] Code splitting implemented

#### Backend ✅

* [ ] P95 response time < 500ms
* [ ] N+1 queries eliminated
* [ ] Connection pooling enabled
* [ ] Background jobs used for slow tasks
* [ ] API compression enabled (Gzip)

#### Database ✅

* [ ] Slow query log enabled
* [ ] Indexes on foreign keys and WHERE/ORDER BY columns
* [ ] Query explain plans reviewed
* [ ] Connection pool sized correctly

#### Caching ✅

* [ ] Redis/Memcached active
* [ ] CDN for static assets
* [ ] HTTP cache headers set appropriately