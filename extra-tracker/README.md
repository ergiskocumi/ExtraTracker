# 💜 ExtraTracker

**ExtraTracker** è un'applicazione Full-Stack moderna per la gestione delle ore di lavoro, il tracciamento degli straordinari e il calcolo automatico dei guadagni basato su tariffe orarie per progetto.

Il progetto è pensato per freelance o dipendenti che necessitano di tenere traccia delle proprie attività lavorative con un'interfaccia elegante (Dark Mode) e intuitiva.

![Status](https://img.shields.io/badge/Status-Development-blue)
![License](https://img.shields.io/badge/License-GPLv3-green)

---

## 🚀 Funzionalità Principali

* **📊 Dashboard Interattiva:** Visualizzazione immediata delle ore totali lavorate e del guadagno generato nel mese corrente.
* **⏱️ Time Tracking:** Inserimento rapido di log di lavoro con selezione di data, ora inizio/fine e progetto.
* **📁 Gestione Progetti:** Creazione di clienti/progetti con definizione di **Codice Commessa** e **Tariffa Oraria**.
* **📅 Timeline Visiva:** Storico cronologico delle attività svolte con filtri mensili.
* **🌓 UI Moderna:** Interfaccia curata con TailwindCSS, animazioni (Framer Motion) e tema scuro predefinito.

---

## 🛠️ Stack Tecnologico & Architettura

Il progetto segue un'architettura **Client-Server** disaccoppiata con database containerizzato.

### Frontend (Client)
* **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) (Build tool rapido).
* **Linguaggio:** TypeScript (per la sicurezza dei tipi).
* **Stile:** TailwindCSS (Utility-first CSS).
* **State Management:** React Context API (senza librerie esterne complesse).
* **Routing:** React Router v7.

### Backend (Server API)
* **Runtime:** Node.js.
* **Framework:** Express.js (REST API).
* **ODM:** Mongoose (Modellazione dati per MongoDB).

### Database & DevOps
* **Database:** MongoDB.
* **Orchestrazione:** Docker Compose (gestisce DB e interfaccia grafica Mongo-Express).

---

## 📋 Prerequisiti

Prima di iniziare, assicurati di avere installato sulla tua macchina:

1.  [Node.js](https://nodejs.org/) (v18 o superiore).
2.  [Docker Desktop](https://www.docker.com/products/docker-desktop/) (necessario per il database).
3.  Git.

---

## ⚙️ Guida all'Avvio (Quick Start)

Per avviare l'intero progetto in locale, segui questi 3 step.

### 1. Avviare il Database (Docker)
Dalla cartella principale del progetto, avvia i container Docker per MongoDB e Mongo Express.

```bash
docker-compose up -d
```
MongoDB sarà attivo su: localhost:27017

Mongo Express (GUI per vedere i dati) su: http://localhost:8081

```bash
User: admin
Pass: password123
```
---
### 2. Avviare il Backend (Server API)

Apri un nuovo terminale in VsCode o l'IDE in uso, spostati nella cartella server e installa le dipendenze:
```bash
cd extra-tracker/server
npm install
npm start
# Il server sarà attivo su http://localhost:5000
```
---


### 3. Avviare il Frontend (React App)

Apri un altro terminale (sempre dall'IDE), spostati nella cartella del frontend e avvia l'app:

```bash
cd extra-tracker
npm install
npm run dev
# L'applicazione sarà disponibile all'indirizzo che appare nel terminale (es. http://localhost:5173)
```


---
## 📂 Struttura del Progetto
La struttura delle cartelle segue un approccio Feature-First per mantenere il codice organizzato e scalabile.

```bash
extra-tracker/
├── docker-compose.yml      # Configurazione Database
├── server/                 # Backend Node.js
│   ├── models/             # Schemi Mongoose (Project, WorkLog)
│   ├── routes/             # API Endpoints
│   └── index.js            # Entry point server
└── src/                    # Frontend React
    ├── components/         # Componenti UI riutilizzabili (Icons, TimeSelect)
    ├── context/            # Gestione Stato Globale (Projects, WorkLogs)
    ├── features/           # Logica specifica per dominio
    │   ├── projects/       # Logica gestione progetti
    │   └── tracker/        # Logica tracciamento ore
    ├── pages/              # Pagine principali (Dashboard, Settings, Timeline)
    └── utils/              # Funzioni di aiuto (Date, Calcoli, Valuta)
```
--- 

## Configurazione Variabili d'Ambiente

Attualmente le credenziali sono configurate per l'ambiente di sviluppo locale. Nel file server/index.js, la stringa di connessione è: 
```bash
mongodb://admin:password123@localhost:27017/extra-tracker?authSource=admin
```
Nota: In produzione, assicurarsi di usare file .env per gestire le credenziali sensibili.

--- 
# 🤝 Contribuire 
Sentiti libero di aprire issue o pull request per migliorare il progetto. Alcuni miglioramenti futuri pianificati:

- Autenticazione Utente (Login/Register).
- Esportazione Report in PDF/CSV.
- Grafici statistici avanzati.

