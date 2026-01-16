# 🎴 FlashcardList Improvements - Documentazione

## 📋 Panoramica

Refactoring completo del componente `FlashcardList` con nuove funzionalità per migliorare l'UX e la gestione delle card.

## ✨ Nuove Funzionalità

### 1. Numerazione delle Card

**Implementazione**: Ogni card mostra il suo numero di posizione (es: #1, #2, #3) in modo discreto ma visibile.

**Caratteristiche**:
- Numero posizionato accanto al drag handle
- Stile discreto (`text-white/40`) per non dare fastidio
- Sempre visibile per riferimento rapido
- Formato: `#{index + 1}`

**Posizione**: A sinistra della card, sopra il drag handle.

### 2. Drag & Drop per Riordinare

**Implementazione**: HTML5 Drag & Drop nativo (non richiede librerie esterne).

**Caratteristiche**:
- Drag handle visibile (icona `FiGripVertical`)
- Feedback visivo durante il drag (opacità ridotta)
- Immagine fantasma personalizzata durante il drag
- Rilevamento posizione basato su posizione del mouse
- Salvataggio automatico dell'ordine sul backend

**Come funziona**:
1. L'utente clicca e tiene premuto sul drag handle
2. Trascina la card nella posizione desiderata
3. Rilascia la card
4. Il sistema calcola la nuova posizione e salva sul backend
5. Il deck viene aggiornato con il nuovo ordine

**API Backend**: `PUT /api/study/:id/cards/reorder`
- Body: `{ cardIds: string[] }` - Array di card IDs nell'ordine desiderato

### 3. Inserimento Card in Posizione Specifica

**Implementazione**: Pulsante "+" che appare tra le card quando si passa il mouse.

**Caratteristiche**:
- Pulsante appare solo su hover (non invasivo)
- Linea visiva che indica la posizione di inserimento
- Inserimento preciso: la nuova card diventa la card N, quelle dopo si spostano
- Prompt per inserire domanda e risposta

**Come funziona**:
1. L'utente passa il mouse tra due card
2. Appare una linea con un pulsante "+" al centro
3. Cliccando il pulsante, appare un prompt per inserire domanda e risposta
4. La card viene inserita esattamente in quella posizione
5. Tutte le card successive si spostano di una posizione

**Esempio**:
- Card 1, Card 2, Card 3
- Inserisci nuova card tra Card 1 e Card 2
- Risultato: Card 1, **Nuova Card**, Card 2 (diventa Card 3), Card 3 (diventa Card 4)

**API Backend**: `POST /api/study/:id/cards/insert`
- Body: `{ front: string, back: string, position?: number }`
- `position` è 0-based (opzionale, default: fine)

## 🔧 Modifiche Backend

### Nuovi Endpoint

1. **PUT /api/study/:id/cards/reorder**
   - Riordina le card di un mazzo
   - Body: `{ cardIds: string[] }`
   - Valida che tutti i cardIds esistano e siano presenti

2. **POST /api/study/:id/cards/insert**
   - Aggiunge una card in una posizione specifica
   - Body: `{ front: string, back: string, position?: number }`
   - Se `position` non specificato, aggiunge alla fine

### Nuovi Metodi Service

**studyService.js**:
- `reorderCards(tenantScope, deckId, cardIds)` - Riordina le card
- `addCardAtPosition(tenantScope, deckId, cardData)` - Inserisce card in posizione

**studyService.ts** (frontend):
- `reorderCards(deckId, cardIds)` - Chiama API per riordinare
- `addCardAtPosition(deckId, payload)` - Chiama API per inserire

## 📁 File Modificati

### Frontend
- `src/features/study/components/Flashcard/FlashcardList.tsx` - Refactor completo
- `src/features/study/components/Flashcard/FlashcardItem.tsx` - Rimosso `layout` motion
- `src/features/study/services/studyService.ts` - Aggiunti metodi per riordinare/inserire
- `src/features/study/pages/CinemaPage.tsx` - Aggiunto `onDeckUpdate`
- `src/features/study/layout/CinemaLayout.tsx` - Passa `onDeckUpdate` a StudySidebar
- `src/features/study/components/Study/StudySidebar.tsx` - Passa `onDeckUpdate` a FlashcardList

### Backend
- `server/services/studyService.js` - Aggiunti `reorderCards` e `addCardAtPosition`
- `server/controllers/studyController.js` - Aggiunti `reorderCards` e `addCardAtPosition`
- `server/routes/study.js` - Aggiunte route per reorder e insert

## 🎨 UI/UX Improvements

1. **Numerazione Discreta**:
   - Colore: `text-white/40` (40% opacità)
   - Dimensione: `text-xs`
   - Posizione: sopra il drag handle

2. **Drag Handle**:
   - Icona: `FiGripVertical`
   - Colore: `text-white/30` → `text-white/60` on hover
   - Cursor: `cursor-grab` → `cursor-grabbing` on drag

3. **Pulsante Inserimento**:
   - Appare solo su hover
   - Animazione fluida (fade in/out)
   - Linea visiva con gradiente
   - Pulsante + centrale con ombra

4. **Feedback Visivo**:
   - Card in drag: opacità 40%
   - Area di drop: evidenziata durante il drag
   - Toast notifications per successo/errore

## 🧪 Test Implementati

**File**: `src/features/study/components/Flashcard/__tests__/FlashcardList.test.tsx`

**Test Cases**:
1. ✅ Numerazione delle card (mostra #1, #2, #3...)
2. ✅ Drag & Drop funziona correttamente
3. ✅ Riordinamento chiama l'API corretta
4. ✅ `onDeckUpdate` viene chiamato dopo riordinamento
5. ✅ Pulsante inserimento appare su hover
6. ✅ Inserimento card in posizione specifica
7. ✅ `onDeckUpdate` viene chiamato dopo inserimento
8. ✅ Gestione cancellazione prompt
9. ✅ Edge cases (deck vuoto, single card)

## 🚀 Come Usare

### Riordinare Card

1. Passa il mouse sulla card
2. Clicca e tieni premuto sul drag handle (icona grip)
3. Trascina la card nella posizione desiderata
4. Rilascia
5. La card viene riordinata e salvata automaticamente

### Inserire Card in Posizione Specifica

1. Passa il mouse tra due card
2. Appare una linea con pulsante "+"
3. Clicca il pulsante "+"
4. Inserisci domanda e risposta nei prompt
5. La card viene inserita esattamente in quella posizione

## 🔍 Clean Code Principles Applicati

1. **Single Responsibility**: Ogni funzione ha una responsabilità chiara
2. **DRY**: Logica riutilizzabile estratta in funzioni
3. **Documentation**: Commenti JSDoc per tutte le funzioni
4. **Type Safety**: TypeScript per type checking
5. **Error Handling**: Gestione errori centralizzata
6. **Separation of Concerns**: Logica di business separata dalla presentazione
7. **Memoization**: Callback memoizzati per evitare re-render inutili

## 📝 Note Tecniche

- **Drag & Drop**: Usa HTML5 Drag & Drop API nativo (non richiede librerie)
- **Posizione**: Le posizioni sono 0-based (prima card = 0, seconda = 1, etc.)
- **Persistenza**: L'ordine viene salvato immediatamente sul backend
- **Performance**: Memoization e callback ottimizzati per evitare re-render
- **Accessibility**: Tutti i pulsanti hanno `aria-label` e `title`

## ✅ Checklist Completamento

- [x] Numerazione card implementata
- [x] Drag & Drop implementato
- [x] Inserimento in posizione specifica implementato
- [x] Endpoint backend per riordinare
- [x] Endpoint backend per inserire
- [x] Refactor con clean code
- [x] Commenti JSDoc aggiunti
- [x] Test scritti
- [x] Error handling implementato
- [x] Toast notifications per feedback utente
