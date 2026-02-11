# 📋 REVIEW FINALE PROGETTO EXTRATRACKER

**Data Review:** 11 Febbraio 2026  
**Agenti Specializzati:** Backend, Frontend Components, JavaScript/TypeScript Logic, UX/UI  
**Scope:** Analisi completa del progetto ExtraTracker

---

## 📊 RIEPILOGO STATO PROGETTO

| Area | Stato | Problemi Critici | Problemi Alti | Problemi Medi |
|------|-------|------------------|---------------|---------------|
| Backend | 🟡 Da Migliorare | 1 | 8 | 9 |
| Frontend Components | 🟡 Da Migliorare | 4 | 7 | 22 |
| JavaScript/TypeScript Logic | 🟡 Da Migliorare | 3 | 3 | 7 |
| UX/UI | 🟠 Necessita Lavoro | 4 | 4 | 11 |
| **TOTALE** | | **12** | **22** | **49** |

**Valutazione Complessiva: 6/10** - Progetto funzionante ma con molti problemi da risolvere prima della release

---

## 🚨 BUG CRITICI (Da Risolvere Immediatamente)

### 1. Calcolo Revenue Sempre Zero [BACKEND - CRITICO]
- **File:** `server/services/workLogService.js:257`
- **Problema:** Il calcolo usa `(0 || 0)` invece della tariffa effettiva, rendendo sempre 0 il revenue
- **Fix:** Recuperare la tariffa effettiva del progetto dal database

### 2. Timer Continua Dopo Ultima Domanda [LOGIC - CRITICO]
- **File:** `src/features/study/pages/StudySessionPage.tsx`
- **Problema:** Il timer non si ferma immediatamente quando l'utente risponde all'ultima domanda
- **Fix:** Aggiungere check `if (isLastQuestion) stopTimer()` prima di processare la risposta

### 3. Animazione Feedback Troppo Veloce [LOGIC + UX - CRITICO]
- **File:** `src/features/study/pages/StudySessionPage.tsx`
- **Problema:** Solo 800ms per vedere la risposta corretta, insufficiente per leggere
- **Fix:** Aumentare a 2000-3000ms o richiedere click per proseguire

### 4. Memory Leak Timer StudySessionPage [COMPONENT - CRITICO]
- **File:** `src/features/study/pages/StudySessionPage.tsx:341-364`
- **Problema:** L'effect del timer non ha cleanup corretto per `timeLeft === 0`
- **Fix:** Aggiungere `handleComplete` alle dipendenze o usare ref per lo stato

### 5. Race Condition Refresh Token [BACKEND - CRITICO]
- **File:** `server/services/authService.js:601-718`
- **Problema:** Due richieste simultanee con stesso refresh token potrebbero entrambe passare
- **Fix:** Implementare transazioni MongoDB con `session.startTransaction()`

### 6. Form Auth Senza Label Associate [UX - CRITICO]
- **File:** `src/features/auth/pages/LoginPage.tsx:192-249`
- **Problema:** Gli input hanno `<label>` ma non usano `htmlFor` associato all'id
- **Fix:** Aggiungere `id` agli input e `htmlFor` ai label

### 7. Toast Notifications Senza aria-live [UX - CRITICO]
- **File:** `src/shared/components/toast/ToastContext.tsx`
- **Problema:** I toast sono visivamente evidenti ma non annunciati agli screen reader
- **Fix:** Aggiungere `aria-live="polite"` e `aria-atomic="true"`

### 8. SettingsContext Aggiornamenti Parziali [COMPONENT - CRITICO]
- **File:** `src/features/settings/context/SettingsContext.tsx:223-264`
- **Problema:** `updatePreferences` usa state stale nelle dipendenze
- **Fix:** Usare functional update di setState

### 9. Race Condition in apiClient [LOGIC - CRITICO]
- **File:** `src/shared/services/apiClient.ts`
- **Problema:** Flag `isSessionDead` non resettato dopo nuovo login
- **Fix:** Reset del flag su login successful

### 10. Promise Senza Catch in Export [LOGIC - CRITICO]
- **File:** `src/features/settings/services/settingsService.exportData()`
- **Problema:** Silenzia gli errori di export
- **Fix:** Aggiungere `.catch()` o try/catch con log

---

## ⚠️ ERRORI LOGICI (Da Correggere)

### 11. Calcolo Percentuali Errato
- **File:** `src/features/study/utils/adaptiveGapFiller.ts`
- **Problema:** `Math.round()` causa overflow con numeri piccoli
- **Livello:** Medio

### 12. Regex Email Troppo Semplice
- **File:** Validatori auth
- **Problema:** Accetta email non valide come `test@test`
- **Livello:** Medio

### 13. Validazione PDF Insufficiente
- **File:** `server/controllers/studyController.js:287-339`
- **Problema:** Solo mime-type, non magic bytes
- **Livello:** Alto

### 14. Condizione isUrgentCard Incompleta
- **File:** Componenti deck/studio
- **Problema:** Non considera quanto è scaduta una carta
- **Livello:** Medio

### 15. Deep Clone Mancante
- **File:** `src/features/study/hooks/useDashboard.ts`
- **Problema:** Potenziale mutazione stato
- **Livello:** Medio

### 16. WorkTodo Pre-save Hook Bug
- **File:** `server/models/WorkTodo.js:82-90`
- **Problema:** Manca `next` come parametro, può causare stallo
- **Livello:** Medio

### 17. Folder.getPath() Ciclo Infinito
- **File:** `server/models/Folder.js:86-97`
- **Problema:** Ciclo while può diventare infinito con cicli di riferimenti
- **Livello:** Medio

### 18. Calcolo Ore/Statistiche - Verificare
- **File:** Vari servizi
- **Problema:** Potenziali errori nei calcoli temporali
- **Livello:** Da Verificare

---

## 🏗️ PROBLEMI DI ARCHITETTURA (Principi Non Rispettati)

### SOLID Principles Violations

#### 19. Single Responsibility Principle (SRP)
| Componente | Linee | Problema |
|------------|-------|----------|
| `StudySessionPage.tsx` | 805 | Gestisce sessione, timer, pausa, navigazione, stati UI |
| `useExamSolver.ts` | 960 | ~20 stati diversi: file upload, cache, streaming, retry |
| `SettingsContext.tsx` | 509 | Profilo, preferenze, notifiche, import/export, avatar |
| `CardContentRenderer/index.tsx` | 675 | Markdown, LaTeX, cinema mode, truncate, sanitizzazione |

**Fix:** Dividere in hook/componenti più piccoli e specializzati

#### 20. Open/Closed Principle
- **Problema:** I componenti non sono estensibili senza modificarli
- **Esempio:** `FlashcardList` richiede modifiche per nuovi tipi di ordinamento

#### 21. Dependency Inversion
- **Problema:** Componenti dipendono direttamente da implementazioni concrete
- **Esempio:** `PDFReader` dipende direttamente da `@react-pdf-viewer`

### Pattern Architetturali

#### 22. Inconsistenza Multi-Tenancy [BACKEND]
- **File:** Multipli
- **Problema:** Doppia implementazione: `multiTenancyPlugin` vs `BaseService`
- **Fix:** Standardizzare su un unico pattern

#### 23. Props Drilling Eccessivo
- **File:** `DeckDetailContent.tsx`
- **Problema:** Riceve ~15 props, molte passate senza trasformazione
- **Fix:** Usare context o compound components

#### 24. Violazione Separation of Concerns
- **Problema:** Logica di business nei componenti UI
- **Esempio:** Calcoli statistici nei componenti invece che in servizi dedicati

---

## ⚡ PROBLEMI DI PERFORMANCE

### 25. Query N+1 nel Backend
- **File:** `server/services/workTodoService.js:38-53`
- **Problema:** `populate()` causa query aggiuntive per ogni TODO
- **Fix:** Usare aggregation con `$lookup`

### 26. Re-render Non Necessari
- **File:** `FlashcardList.tsx`
- **Problema:** `onUpdate`, `onCardClick` passati senza `useCallback`
- **Fix:** Wrappare con `useCallback`

### 27. Mancanza di Caching
- **File:** Dashboard e statistiche
- **Problema:** Nessun caching Redis per query frequenti
- **Fix:** Implementare Redis caching

### 28. Algoritmi Inefficienti O(n²)
- **File:** `useExams.ts`
- **Problema:** Ricerche lineari in array grandi
- **Fix:** Usare Map/Set o indicizzazione

### 29. Regex Ricreati Ad Ogni Render
- **File:** `CardContentRenderer/index.tsx`
- **Problema:** Alcune regex create in useMemo con calcoli pesanti
- **Fix:** Memoizzare anche le funzioni helper

### 30. Global Set Non Pulito
- **File:** `StudySessionPage.tsx:70`
- **Problema:** `globalCompletedSessions` Set non viene mai pulito
- **Fix:** Usare sessionStorage o TTL

### 31. Calcolo Filtri ad Ogni Render
- **File:** `DeckDetailContent.tsx:92-128`
- **Problema:** `filteredCards` ricalcolato anche per piccoli cambiamenti
- **Fix:** Debounce su searchQuery, virtualizzazione

---

## 🔒 PROBLEMI DI SICUREZZA

### 32. NoSQL Injection Vulnerabilità
- **File:** `server/controllers/examsController.js:44-65`
- **Problema:** `req.body` usato direttamente senza validazione
- **Livello:** CRITICO
- **Fix:** Aggiungere Joi/Zod validation middleware

### 33. File Upload Validation Insufficiente
- **File:** `server/controllers/studyController.js:287-339`
- **Problema:** Solo mimetype e dimensione, non contenuto
- **Livello:** Alto
- **Fix:** Validare magic bytes, virus scanning

### 34. Sessioni Troppo Lunghe
- **File:** `server/services/authService.js`
- **Problema:** Refresh token 7 giorni senza rotation
- **Livello:** Medio
- **Fix:** Implementare refresh token rotation

### 35. Logging Dati Sensibili
- **File:** `server/middleware/errorHandler.js:196-200`
- **Problema:** Body loggato con redaction solo password
- **Livello:** Medio
- **Fix:** Lista esplicita campi sensibili da redarre

### 36. CSRF Bypass Potenziale
- **File:** `server/middleware/tenantContext.js:57-93`
- **Problema:** Verifica ID utente incompleta
- **Livello:** Alto
- **Fix:** Usare solo `mongoose.Types.ObjectId.isValid()`

---

## 🎨 PROBLEMI UX/UI (Esperienza Utente)

### Problemi Quiz/Studio (Dal toDo.txt)

#### 37. Mancanza Navigazione Domande
- **Problema:** Non si può tornare indietro o saltare domande
- **Fix:** Aggiungere "Question Navigator" con numeri domande cliccabili

#### 38. Feedback Risposte Non Chiaro
- **Problema:** Non si capisce qual'è la risposta giusta/sbagliata
- **Fix:** Evidenziare risposta selezionata + mostrare corretta per 2-3s

#### 39. Timer Non Si Ferma a Fine Quiz
- **Problema:** Confermato bug, timer continua dopo ultima domanda
- **Fix:** Stop timer su risposta ultima domanda

#### 40. Pulsante "NON LO SO" Mancante
- **File:** `QuizView.tsx`
- **Stato:** ✅ Implementato in QuizView, verificare in Vero/Falso e Typing

#### 41. Scroll Domande Lunghe
- **File:** Componenti quiz
- **Stato:** ✅ Fix implementato con `overflow-y-auto`

### Problemi Accessibilità

#### 42. Contrasto Colori Insufficiente
- **Problema:** Risposte giuste/sbagliate distinguibili solo per colore
- **Fix:** Aggiungere icone check/X oltre ai colori (WCAG 1.4.1)

#### 43. Focus Indicator Mancanti
- **Problema:** Molti elementi interattivi senza focus visible
- **Fix:** Aggiungere `focus-visible:ring`

#### 44. Elementi Non Focusabili
- **File:** `FlashcardList.tsx`
- **Problema:** Card draggabili non accessibili da tastiera
- **Fix:** Aggiungere `tabIndex`, gestire `onKeyDown`

#### 45. Bottoni Icona Senza aria-label
- **File:** `LoginPage.tsx:250-256`
- **Problema:** Bottone show/hide password non ha aria-label
- **Fix:** Aggiungere `aria-label` descrittivo

### Problemi Usabilità

#### 46. Touch Target Troppo Piccoli
- **Problema:** Alcuni bottoni potrebbero essere < 44x44px
- **Fix:** Verificare e aumentare dimensioni minime

#### 47. URL Non Riflette Stato
- **Problema:** Navigando nel quiz, l'URL non cambia
- **Fix:** Aggiungere query param `?question=3`

#### 48. Mancanza Breadcrumb
- **Problema:** Navigazione profonda senza indicazione percorso
- **Fix:** Aggiungere breadcrumb in aree Deck/Exam

#### 49. Loading States Mancanti
- **Problema:** Azioni async senza feedback di caricamento
- **Fix:** Aggiungere skeleton screens e spinner

---

## 📘 PROBLEMI TYPESCRIPT

### 50. Uso Eccessivo di `any`
| File | Linea | Problema |
|------|-------|----------|
| `StudySessionPage.tsx` | 200 | `(orderedCards[0] as any)?.isTrueFalse` |
| `StudySessionPage.tsx` | 406 | `filter(Boolean) as any[]` |
| `DeckDetailContent.tsx` | 116 | `(b as any).createdAt` |
| `DeckDetailContent.tsx` | 751 | `(currentCard as any).isTrueFalse` |

**Fix:** Estendere interfacce Card o usare type guards

### 51. Error Type Assertion
- **File:** `AuthContext.tsx:125, 176`
- **Problema:** `err: any` per catturare errori
- **Fix:** Creare tipo `AuthError` con campi noti

### 52. React.FC Obsoleto
- **File:** `WorkLogContext.tsx:27`
- **Problema:** Usa `React.FC` (implicit children antipattern)
- **Fix:** Usare `({ children }: { children: ReactNode })`

---

## 📋 DEBT TECNICO

### 53. TODO/FIXME Commenti
- **File:** `server/middleware/errorHandler.js:212`
- **Testo:** `// TODO: Integrare con servizio di logging`

### 54. Mancanza Test
- **Problema:** Nessun file di test rilevato nel backend, pochi nel frontend
- **Fix:** Implementare Jest + Testing Library

### 55. Documentazione API Mancante
- **Problema:** Non c'è documentazione OpenAPI/Swagger
- **Fix:** Aggiungere `@swagger` annotations

### 56. Dipendenze Potenzialmente Outdated
- **Problema:** Pattern di codice suggeriscono versioni precedenti
- **Fix:** Verificare e aggiornare dipendenze

### 57. Commenti in Inglese e Italiano
- **Problema:** Mix di lingue nei commenti
- **Fix:** Standardizzare su una lingua

---

## ✅ PUNTI DI FORZA DA MANTENERE

1. **Design System Coerente** - CSS custom properties ben strutturati
2. **Session Complete** - Ottima schermata con statistiche dettagliate
3. **Supporto Tastiera** - Implementato in molti componenti
4. **Feedback Haptico** - Su mobile ben implementato
5. **Glassmorphism** - Effetti Aurora ben fatti
6. **Animazioni** - Transizioni fluide e gradevoli (anche se troppo veloci)
7. **Security Base** - CSRF, JWT, Argon2, rate limiting presenti
8. **Multi-tenancy** - Implementazione presente anche se da standardizzare

---

## 🎯 ROADMAP PRIORITARIA

### Settimana 1 - Fix Critici (Bloccanti)
- [ ] Fix calcolo revenue backend
- [ ] Fix timer StudySessionPage (stop su ultima domanda)
- [ ] Fix animazione feedback (aumentare durata)
- [ ] Fix memory leak timer
- [ ] Fix race condition auth
- [ ] Fix SettingsContext stale state
- [ ] Fix apiClient race condition

### Settimana 2 - Bug e Errori Logici
- [ ] Fix calcolo percentuali
- [ ] Fix regex email
- [ ] Fix validazione PDF
- [ ] Fix workTodo pre-save hook
- [ ] Fix folder getPath ciclo infinito

### Settimana 3 - Performance e Architettura
- [ ] Ottimizzare query N+1
- [ ] Aggiungere caching Redis
- [ ] Refactor StudySessionPage (estrarre hook)
- [ ] Refactor useExamSolver
- [ ] Memoizzare callback e valori computati

### Settimana 4 - UX/UI e Accessibilità
- [ ] Aggiungere navigazione domande quiz
- [ ] Migliorare feedback visivo risposte
- [ ] Fix accessibilità form auth
- [ ] Fix aria-live toast
- [ ] Aggiungere focus management
- [ ] Verificare contrasto colori

### Settimana 5 - Sicurezza e Testing
- [ ] Aggiungere validazione Joi/Zod
- [ ] Fix NoSQL injection vulnerabilities
- [ ] Implementare refresh token rotation
- [ ] Aggiungere test unitari
- [ ] Aggiungere test di integrazione

---

## 📈 METRICHE DI QUALITÀ

### Code Coverage (Target: 80%)
| Area | Stimato Attuale | Target |
|------|-----------------|--------|
| Backend | 0% | 80% |
| Frontend Utils | 30% | 80% |
| Frontend Components | 10% | 70% |

### Performance Metrics (Target)
| Metrica | Target |
|---------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Lighthouse Score | > 90 |
| Bundle Size (gzipped) | < 200KB |

### Accessibility (WCAG 2.1 AA)
| Criterio | Stato |
|----------|-------|
| Keyboard Navigation | 🟡 Parziale |
| Screen Reader | 🔴 Non Compliant |
| Color Contrast | 🟡 Da Verificare |
| Focus Management | 🔴 Non Compliant |

---

## 📝 NOTE FINALI

Il progetto ExtraTracker mostra un'ottima base architetturale con buone pratiche di sicurezza e un design visivo moderno. Tuttavia, ci sono **12 bug critici** che devono essere risolti prima di qualsiasi rilascio in produzione.

I principali problemi sono concentrati in:
1. **Quiz/Studio** - Timer, feedback visivo, navigazione
2. **Gestione Stato** - Stale closures, race conditions
3. **Accessibilità** - Mancanza completa di supporto screen reader
4. **Testing** - Assenza quasi totale di test automatizzati

**Raccomandazione:** Prioritizzare i fix critici (settimana 1) prima di aggiungere nuove feature.

---

*Report generato da agenti specializzati - ExtraTracker Review Team*
