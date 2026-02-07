# 🎓 Silvi.AI - Landing Page per Studenti Universitari

Sito marketing pubblico per Silvi.AI, l'app che aiuta gli studenti universitari a studiare meglio con l'AI.

## 🎯 Target Audience

- Studenti universitari che vogliono ottimizzare lo studio
- Studenti che preparano esami difficili (Medicina, Giurisprudenza, Ingegneria...)
- Studenti che cercano un metodo di studio efficiente con flashcards e ripetizione spaziata

## 🚀 Avvio Rapido

```bash
cd landing
npm install
npm run dev
```

La landing page sarà disponibile su `http://localhost:5174`

## 🏗️ Build Produzione

```bash
npm run build
```

I file statici saranno generati nella cartella `dist/`.

## 🔗 Collegamento con l'App

La landing page si collega all'applicazione principale tramite:
- **Login**: `http://localhost:5173/login`
- **Registrazione**: `http://localhost:5173/register`

Modifica la variabile `APP_URL` in `src/pages/LandingPage.tsx` se necessario.

## 📱 Funzionalità Evidenziate

1. **Flashcards AI Generate** - Carica PDF/appunti e l'IA crea automaticamente le flashcards
2. **Spaced Repetition** - Algoritmo SM-2 ottimizzato per la memorizzazione duratura
3. **Gestione Corsi & Esami** - Organizza corsi, professori e scadenze
4. **Analisi Documenti AI** - Estrae concetti chiave e crea quiz d'esame
5. **Timer Pomodoro** - Sessioni di focus con tracciamento statistico
6. **Tutor AI 24/7** - Assistente personale per domande e spiegazioni

## 🎨 Sezioni Landing Page

1. **Hero** - Headline e CTA principali
2. **Come Funziona** - Processo in 4 step
3. **Funzionalità** - 6 feature card per studenti
4. **AI Features** - Dettaglio capacità AI con chat demo
5. **Strumenti di Studio** - Tool aggiuntivi
6. **Testimonianze** - Storie di studenti di successo
7. **Prezzi** - Piani con sconto studenti 50%
8. **CTA Finale** - Conversione

## 🎨 Stack Tecnico

- React 19 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Framer Motion (animazioni)
- Lucide React (icone)

## 📝 Note Copy

Il copy è ottimizzato per studenti universitari con:
- Linguaggio giovane e diretto
- Focus su risultati concreti (esami superati, voti migliori)
- Prezzi student-friendly con sconto 50%
- Social proof da studenti reali (fittizi per ora)
