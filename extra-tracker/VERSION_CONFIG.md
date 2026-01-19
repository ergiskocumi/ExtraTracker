# 📦 Gestione Versione Applicazione

## Configurazione

La versione dell'applicazione è ora centralizzata e gestita tramite variabile d'ambiente.

### Setup Iniziale

1. **Crea il file `.env`** nella root del progetto `extra-tracker/` con il seguente contenuto:

```env
# Application Version
# Update this value to change the version displayed throughout the application
VITE_APP_VERSION=0.0.4
```

2. **Il file `.env.example`** è già presente come template (committato nel repository).

### Come Aggiornare la Versione

Per aggiornare la versione dell'applicazione:

1. Modifica il valore di `VITE_APP_VERSION` nel file `.env`:
   ```env
   VITE_APP_VERSION=0.0.5
   ```

2. Riavvia il server di sviluppo o ricompila l'applicazione:
   ```bash
   npm run dev
   # oppure
   npm run build
   ```

### Priorità di Lettura

La versione viene letta nell'ordine seguente (priorità decrescente):

1. **`VITE_APP_VERSION`** dal file `.env` (priorità massima)
2. **`npm_package_version`** dal `package.json` (fallback)
3. **`0.0.4`** valore di default hardcoded (ultimo fallback)

### Dove Viene Utilizzata

La versione viene visualizzata in:

- **AppLayout.tsx**: Header dell'applicazione (logo + versione)
- Accessibile globalmente tramite `__APP_VERSION__` in qualsiasi componente React

### Note Importanti

- Il file `.env` è già aggiunto al `.gitignore` e non verrà committato
- Il file `.env.example` è committato come template per altri sviluppatori
- Dopo aver modificato `.env`, è necessario riavviare il server di sviluppo per vedere le modifiche
- In produzione, assicurati di configurare `VITE_APP_VERSION` nell'ambiente di deployment
