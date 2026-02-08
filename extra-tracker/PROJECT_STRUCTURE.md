# 🎓 Silvi.AI - Struttura Progetto

```
extra-tracker/
├── 📁 landing/              ← SITO MARKETING (pubblico)
│   ├── src/
│   │   └── pages/
│   │       └── LandingPage.tsx    # Landing page per studenti
│   ├── package.json
│   └── ...
│   
├── 📁 src/                  ← APPLICAZIONE (richiede login)
│   ├── features/
│   │   ├── study/           # Flashcards, deck, sessioni studio
│   │   ├── tracker/         # Time tracking (se presente)
│   │   ├── dashboard/       # Dashboard utente
│   │   └── ...
│   ├── App.tsx
│   └── ...
│   
├── 📁 server/               ← BACKEND API
│   └── ...
│   
├── package.json
└── ...
```

## 🚀 Come Avviare

### 1. Avvia il Backend
```bash
cd server
npm install
npm start
```

### 2. Avvia l'Applicazione (porta 5173)
```bash
# Dalla root
cd extra-tracker
npm install
npm run dev
```
Accesso: `http://localhost:5173` (richiede login)

### 3. Avvia la Landing Page (porta 5174)
```bash
# Da un altro terminale
cd extra-tracker
npm run landing
# oppure
cd landing && npm run dev
```
Accesso: `http://localhost:5174` (pubblica, no login)

## 🎯 Flusso Utente

1. **Landing Page** (`localhost:5174`) → Visitatore scopre il prodotto
2. Click "Inizia Gratis" → Redirect a `localhost:5173/register`
3. **Registrazione** → Utente crea account
4. **Dashboard App** → Utente usa tutte le funzionalità

## 📝 Configurazione URL

Se cambi le porte o deploy su domini diversi:

**Landing Page** → modifica `APP_URL` in `landing/src/pages/LandingPage.tsx`:
```typescript
const APP_URL = "http://localhost:5173"; // <-- Cambia qui
```

## 🎓 Target Utente

La landing page è ottimizzata per **studenti universitari** con:
- Focus su flashcards e preparazione esami
- Pricing student-friendly (€4.99/mese con sconto 50%)
- Testimonianze da studenti
- Copy mirato al percorso universitario

## 🏗️ Build Produzione

### Landing Page
```bash
cd landing
npm run build
# Output: landing/dist/
```

### Applicazione
```bash
npm run build
# Output: dist/
```

## 🔗 Collegamenti

- Landing → App: I link "Accedi" e "Inizia Gratis" puntano all'app
- App → Landing: Eventuali link marketing possono puntare alla landing
