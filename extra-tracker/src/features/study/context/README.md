# 🎯 Sistema di Generazione Flashcard Asincrono

## Panoramica

Questo sistema permette di generare flashcard da PDF in modo **asincrono e non bloccante**. Gli utenti possono:

1. Avviare la generazione di flashcard
2. Chiudere il modal e continuare ad usare l'app
3. Vedere il progresso in tempo reale tramite un indicatore floating
4. Ricevere notifiche quando la generazione è completata
5. Riaprire il modal in qualsiasi momento per vedere i dettagli

## Architettura

### Componenti Principali

```
┌─────────────────────────────────────────────────────────────┐
│                    AppLayout                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         FloatingGenerationIndicator                   │   │
│  │    (visibile quando ci sono job attivi)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           MagicGenerateModal                          │   │
│  │    (modal per avviare e monitorare la generazione)   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         FlashcardGenerationContext                          │
│    (stato globale per tracciare i job di generazione)      │
└─────────────────────────────────────────────────────────────┘
```

### Flusso di Lavoro

```
Utente seleziona PDF
        │
        ▼
┌─────────────────┐
│  Clicca "Inizia" │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐     ┌──────────────────────┐
│  startJob()          │────▶│  Job aggiunto al     │
│  (context)           │     │  contesto globale    │
└──────────────────────┘     └──────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│ Upload PDF      │          │ Modal può       │          │ Indicatore      │
│ via API         │          │ essere chiuso   │          │ floating        │
│                 │          │                 │          │ mostra progress │
└────────┬────────┘          └─────────────────┘          └─────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        SSE Events (pdf-progress)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │analyzing │─▶│ chunking │─▶│ concepts │─▶│generating│─▶│completed │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │                                                       │        │
│         └───────────────────────────────────────────────────────┘        │
│                              │                                           │
│                              ▼                                           │
│                    updateJob() / completeJob()                          │
│                         (context)                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

## Usage

### Per gli sviluppatori

#### Avviare una nuova generazione

```tsx
import { useFlashcardGeneration } from '../context/FlashcardGenerationContext';

function MyComponent() {
    const { startJob } = useFlashcardGeneration();

    const handleGenerate = async (file: File) => {
        const jobId = startJob({
            deckId: 'deck-123',
            deckTitle: 'Il mio mazzo',
            fileName: file.name,
            maxCards: 120,
        });
        
        // Ora chiama l'API
        await studyService.generateFromPDF(deckId, file, { maxCards });
    };
}
```

#### Aggiornare lo stato di un job

```tsx
const { updateJob } = useFlashcardGeneration();

// Quando ricevi aggiornamenti SSE
updateJob(jobId, {
    step: 'generating',
    progress: 50,
    generatedCount: 60,
});
```

#### Completare un job

```tsx
const { completeJob } = useFlashcardGeneration();

// Quando la generazione è completata
completeJob(jobId, 120); // 120 flashcard generate
```

### Per gli utenti

1. **Avviare la generazione**:
   - Apri il modal "Genera con AI" in un mazzo
   - Carica un file PDF
   - Seleziona il numero target di flashcard
   - Clicca "Inizia Generazione"

2. **Durante la generazione**:
   - Il modal mostra il progresso dettagliato
   - Puoi chiudere il modal con il pulsante "Minimizza"
   - L'indicatore floating apparirà in alto a destra
   - Puoi continuare ad usare l'app normalmente

3. **Monitorare il progresso**:
   - Clicca sull'indicatore floating per vedere tutti i job attivi
   - Espandi un job per vedere i dettagli
   - Clicca "Apri dettagli" per riaprire il modal

4. **Completamento**:
   - Riceverai una notifica toast quando le flashcard sono pronte
   - Clicca "Vedi" nella notifica per andare al mazzo
   - L'indicatore mostrerà il job come completato

## API

### FlashcardGenerationContext

#### State

```typescript
interface FlashcardGenerationContextValue {
    jobs: GenerationJob[];           // Tutti i job
    activeJob: GenerationJob | null; // Job attualmente attivo nel modal
    hasActiveJobs: boolean;          // Ci sono job in corso?
    hasCompletedJobs: boolean;       // Ci sono job completati?
    isModalOpen: boolean;            // Il modal è aperto?
}
```

#### Actions

```typescript
startJob: (data: {
    deckId: string;
    deckTitle: string;
    fileName: string;
    maxCards: number;
}) => string;  // Restituisce l'ID del job

updateJob: (id: string, updates: Partial<GenerationJob>) => void;
completeJob: (id: string, generatedCount: number) => void;
failJob: (id: string, error: string) => void;
removeJob: (id: string) => void;
clearCompleted: () => void;
openModal: (jobId?: string) => void;
closeModal: () => void;
dismissToBackground: () => void;  // Chiudi modal ma continua job
```

### GenerationJob

```typescript
interface GenerationJob {
    id: string;
    deckId: string;
    deckTitle: string;
    step: 'uploading' | 'analyzing' | 'processing' | 'generating' | 'completed' | 'error';
    progress: number;
    generatedCount: number;
    totalChunks: number;
    currentChunk: number;
    message: string;
    elapsedTime: number;
    fileName: string;
    maxCards: number;
    startedAt: number;
    completedAt?: number;
}
```

## Vantaggi

1. **Non bloccante**: Gli utenti possono continuare ad usare l'app durante la generazione
2. **Multi-tasking**: Possono esserci più generazioni in parallelo
3. **Trasparente**: Indicatore di progresso sempre visibile
4. **Notifiche**: Gli utenti vengono avvisati quando tutto è pronto
5. **Resiliente**: Se si chiude il browser, il job continua sul server
