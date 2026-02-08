# PDF Viewer + AI Chat Component - Documentazione Tecnica

**Silvi - PDF Visualization & RAG-based AI Tutoring**  
*Versione 1.0 - Febbraio 2026*

---

## 📑 Indice

1. [Introduzione](#introduzione)
2. [Architettura RAG](#architettura-rag)
3. [PDF Viewer (Frontend)](#pdf-viewer-frontend)
4. [AI Chat Component](#ai-chat-component)
5. [Vector Store Service](#vector-store-service)
6. [PDF Cache Service](#pdf-cache-service)
7. [Backend Integration](#backend-integration)
8. [API Endpoints](#api-endpoints)

---

## Introduzione

### Panoramica

Il componente **PDF Viewer + AI Chat** implementa un sistema completo di:

- **Visualizzazione PDF**: Due implementazioni (FluidPDFViewer e PDFReader)
- **AI Tutoring**: Chat contestuale basata sul contenuto del PDF (RAG)
- **Vector Search**: Ricerca semantica con embeddings (Pinecone + OpenAI)
- **Source Grounding**: Tracciamento della fonte per ogni risposta
- **Performance**: Caching LRU per PDF parsing

### Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| PDF Rendering | `react-pdf` + `@react-pdf-viewer` |
| Vector DB | Pinecone |
| Embeddings | OpenAI `text-embedding-3-small` |
| Text Splitting | LangChain `RecursiveCharacterTextSplitter` |
| AI Model | OpenAI GPT-4o-mini |
| Caching | In-memory LRU con TTL |

### Architettura Generale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PDF + AI ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐         PDF URL         ┌──────────────┐
     │   Frontend   │◄───────────────────────►│   Backend    │
     │  PDFViewer   │                         │   Express    │
     └──────┬───────┘                         └──────┬───────┘
            │                                         │
            │ React State                             │ PDF Parsing
            │                                         │ (pdf-parse)
            ▼                                         ▼
     ┌──────────────┐                         ┌──────────────┐
     │   PDFChat    │                         │  PDF Cache   │
     │  Component   │                         │  Service     │
     │              │                         │  (LRU+TTL)   │
     └──────┬───────┘                         └──────┬───────┘
            │                                         │
            │ User Question                           │ Text Extraction
            │                                         │
            ▼                                         ▼
     ┌──────────────┐                         ┌──────────────┐
     │  Chat History│                         │ Text Splitter│
     │  (useState)  │                         │ (LangChain)  │
     └──────┬───────┘                         └──────┬───────┘
            │                                         │
            │ API Call                                │ Embeddings
            │ /api/study/:id/chat                     │ (OpenAI)
            │                                         │
            ▼                                         ▼
     ┌──────────────┐                         ┌──────────────┐
     │   Backend    │◄───────────────────────►│  Pinecone    │
     │  askTutor()  │    Vector Search        │ Vector Store │
     │              │    (Similarity)         │              │
     └──────┬───────┘                         └──────────────┘
            │
            │ RAG Prompt (context + question)
            │
            ▼
     ┌──────────────┐
     │  OpenAI API  │
     │  GPT-4o-mini │
     └──────┬───────┘
            │
            │ AI Response
            │
            ▼
     ┌──────────────┐
     │   Frontend   │
     │  Display Msg │
     └──────────────┘
```

---

## Architettura RAG

### Retrieval Augmented Generation (RAG) Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAG PIPELINE                                       │
└─────────────────────────────────────────────────────────────────────────────┘

INGESTION (Upload PDF)                    QUERY (User Question)
    │                                           │
    ▼                                           ▼
┌──────────────┐                        ┌──────────────┐
│  PDF Upload  │                        │   Question   │
│   Multer     │                        │   "Cos'è     │
└──────┬───────┘                        │   il DOM?"   │
       │                                └──────┬───────┘
       ▼                                       │
┌──────────────┐                               │ Embedding
│  PDF Parse   │                               │ (OpenAI)
│ (pdf-parse)  │                               ▼
└──────┬───────┘                        ┌──────────────┐
       │                                │ Query Vector │
       ▼                                └──────┬───────┘
┌──────────────┐                              │
│  Extracted   │                              ▼
│    Text      │                        ┌──────────────┐
└──────┬───────┘                        │   Pinecone   │
       │                                │   Search     │
       ▼                                │   (topK=5)   │
┌──────────────┐                        └──────┬───────┘
│ Text Splitter│                               │
│ (Recursive   │                               ▼
│ Character)   │                        ┌──────────────┐
│ 1000 chars   │                        │   Results    │
│ overlap 200  │                        │  [chunk1,    │
└──────┬───────┘                        │   chunk2...] │
       │                                └──────┬───────┘
       ▼                                       │
┌──────────────┐                               ▼
│   Chunks     │                        ┌──────────────┐
│  [array]     │                        │   Context    │
└──────┬───────┘                        │  Assembly    │
       │                                └──────┬───────┘
       ▼                                       │
┌──────────────┐                               ▼
│ Embeddings   │                        ┌──────────────┐
│ (OpenAI)     │                        │ RAG Prompt   │
│ text-embed   │                        │              │
│ -3-small     │                        │ Context:     │
└──────┬───────┘                        │ [chunks]     │
       │                                │              │
       ▼                                │ Question:    │
┌──────────────┐                        │ Cos'è il DOM?│
│  Pinecone    │                        └──────┬───────┘
│  Upsert      │                               │
└──────────────┘                               ▼
                                        ┌──────────────┐
                                        │  GPT-4o-mini │
                                        │   Generate   │
                                        └──────┬───────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │   Response   │
                                        │ "Il DOM è    │
                                        │  un modello  │
                                        │  ad albero..."│
                                        └──────────────┘
```

---

## PDF Viewer Frontend

### FluidPDFViewer (react-pdf)

Visualizzatore PDF "fluido" con lazy loading delle pagine.

```tsx
// src/features/study/components/PDF/FluidPDFViewer.tsx

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configurazione Worker PDF.js (CDN)
const PDFJS_VERSION = '3.11.174';
const configurePdfWorker = (): void => {
    if (typeof window === 'undefined') return;
    const workerVersion = pdfjs.version || PDFJS_VERSION;
    const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
};
configurePdfWorker();

interface FluidPDFViewerProps {
    pdfUrl: string;
}

// Hook per gestire il resize del contenitore con debounce
const useContainerWidth = (containerRef: React.RefObject<HTMLDivElement | null>): number => {
    const [width, setWidth] = useState<number>(800);

    useEffect(() => {
        if (!containerRef.current) return;

        const debouncedSetWidth = debounce((newWidth: number) => {
            if (newWidth > 0) setWidth(newWidth);
        }, 150);

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                debouncedSetWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [containerRef]);

    return width;
};

// Hook per gestire lo scroll e caricare pagine on-demand
const usePageVisibility = (
    numPages: number | null,
    containerRef: React.RefObject<HTMLDivElement | null>
): Set<number> => {
    const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!numPages) return;

        // Carica sempre le prime 5 pagine immediatamente
        const initialPages = new Set<number>();
        for (let i = 1; i <= Math.min(5, numPages); i++) {
            initialPages.add(i);
        }
        setVisiblePages(initialPages);

        if (!containerRef.current) return;

        const handleScroll = () => {
            if (!containerRef.current) return;

            const scrollTop = containerRef.current.scrollTop;
            const estimatedPageHeight = 1000;
            const currentPage = Math.floor(scrollTop / estimatedPageHeight) + 1;
            
            setVisiblePages(prev => {
                const newVisiblePages = new Set(prev);
                // Pre-loading: pagina corrente + 2 precedenti + 5 successive
                for (let i = Math.max(1, currentPage - 2); i <= Math.min(numPages, currentPage + 5); i++) {
                    newVisiblePages.add(i);
                }
                return newVisiblePages;
            });
        };

        // Throttle scroll handler
        let ticking = false;
        const throttledHandleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        containerRef.current.addEventListener('scroll', throttledHandleScroll, { passive: true });
        handleScroll();

        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener('scroll', throttledHandleScroll);
            }
        };
    }, [numPages, containerRef]);

    return visiblePages;
};

// Componente principale
export const FluidPDFViewer: React.FC<FluidPDFViewerProps> = ({ pdfUrl }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const width = useContainerWidth(containerRef);
    const visiblePages = usePageVisibility(numPages, containerRef);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const onDocumentLoadError = (error: Error) => {
        setError(getErrorMessage(error, classifyError(error)));
    };

    return (
        <div ref={containerRef} className="h-full overflow-auto">
            <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<LoadingState pdfUrl={pdfUrl} />}
            >
                {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
                    <PDFPage
                        key={pageNumber}
                        pageNumber={pageNumber}
                        width={width - 16}
                        isVisible={visiblePages.has(pageNumber)}
                    />
                ))}
            </Document>
        </div>
    );
};

// Componente pagina memoizzato
const PDFPage = memo<{
    pageNumber: number;
    width: number;
    isVisible: boolean;
}>(({ pageNumber, width, isVisible }) => {
    if (!isVisible) {
        // Placeholder per pagine non visibili
        return (
            <div 
                style={{ height: Math.max(400, width * 1.414) }}
                className="mb-6 flex items-center justify-center"
            >
                <div className="text-white/20 text-sm">Pagina {pageNumber}</div>
            </div>
        );
    }

    return (
        <div className="mb-6 last:mb-0">
            <Page
                pageNumber={pageNumber}
                width={width}
                className="block mx-auto shadow-lg shadow-violet-500/10 rounded-sm"
                renderTextLayer={false}      // Disabilitato per performance
                renderAnnotationLayer={true}
                loading={<PageLoading pageNumber={pageNumber} />}
            />
        </div>
    );
});

PDFPage.displayName = 'PDFPage';
```

### PDFReader (@react-pdf-viewer)

Visualizzatore PDF avanzato con funzionalità professionali.

```tsx
// src/features/study/components/PDF/PDFReader.tsx

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { searchPlugin } from '@react-pdf-viewer/search';

// Import CSS required
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';

const PDFJS_VERSION = '3.11.174';
const LOCAL_WORKER_URL = localWorkerUrl;
const CDN_WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

// Hook per rilevare il tema corrente
const useTheme = (): 'dark' | 'light' => {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const root = document.documentElement;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    const dataTheme = root.getAttribute('data-theme');
                    setTheme(dataTheme === 'light' ? 'light' : 'dark');
                }
            });
        });

        observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    return theme;
};

export interface PDFReaderRef {
    jumpToPage: (pageIndex: number) => void;
    highlightText: (text: string, options?: { caseSensitive?: boolean; wholeWords?: boolean }) => void;
    jumpToPageAndHighlight: (pageNumber: number, text: string) => void;
}

export const PDFReader = forwardRef<PDFReaderRef, PDFReaderProps>(({
    pdfUrl,
    onError,
    onLoadSuccess,
    className = '',
}, ref) => {
    // CRITICAL: defaultLayoutPlugin() IS A HOOK - must be called first
    const defaultLayoutPluginInstance = defaultLayoutPlugin({
        sidebarTabs: (defaultTabs) => [defaultTabs[0]], // Solo thumbnails
    });

    const pageNavigationPluginInstance = pageNavigationPlugin();
    const searchPluginInstance = searchPlugin();
    const isDarkMode = useTheme() === 'dark';

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        jumpToPage: (pageIndex: number) => {
            pageNavigationPluginInstance.jumpToPage(pageIndex);
        },
        highlightText: (text: string, options = {}) => {
            searchPluginInstance.highlight(text, options);
        },
        jumpToPageAndHighlight: (pageNumber: number, text: string) => {
            pageNavigationPluginInstance.jumpToPage(pageNumber - 1);
            setTimeout(() => {
                searchPluginInstance.highlight(text, { caseSensitive: false });
            }, 300);
        },
    }));

    return (
        <div className={`h-full ${className} ${isDarkMode ? 'rpv-core__viewer--dark' : ''}`}>
            <Worker workerUrl={workerUrl}>
                <Viewer
                    fileUrl={pdfUrl}
                    plugins={[
                        defaultLayoutPluginInstance,
                        pageNavigationPluginInstance,
                        searchPluginInstance,
                    ]}
                    onError={onError}
                    onDocumentLoad={onLoadSuccess}
                    renderLoader={(progress) => (
                        <PDFLoadingState progress={progress} />
                    )}
                />
            </Worker>
        </div>
    );
});

PDFReader.displayName = 'PDFReader';
```

---

## AI Chat Component

### PDFChat (RAG-based)

Componente chat che utilizza RAG per rispondere basandosi sul PDF.

```tsx
// src/features/study/components/PDF/PDFChat.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiCpu, FiAlertCircle } from 'react-icons/fi';
import { studyService, type ChatMessage } from '../../services/studyService';

interface PDFChatProps {
    deckId: string;
    disabled?: boolean;
}

const LoadingBubble = () => (
    <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <FiCpu className="w-4 h-4 text-white/60" />
        </div>
        <div className="px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-sm text-white/70 animate-pulse">
            L&apos;AI sta scrivendo...
        </div>
    </div>
);

export const PDFChat: React.FC<PDFChatProps> = ({ deckId, disabled = false }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Ciao! Sono il tuo AI Tutor. Chiedimi un chiarimento sul PDF (es. "Spiegami il polimorfismo").',
        },
    ]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<ChatMessage[]>(messages);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSending]);

    const canSend = useMemo(() => {
        if (disabled) return false;
        if (isSending) return false;
        if (!deckId) return false;
        return input.trim().length > 0;
    }, [deckId, disabled, input, isSending]);

    const sendMessage = useCallback(async (raw: string) => {
        if (disabled || isSending || !deckId) return;

        const content = raw.trim();
        if (!content) return;

        setInput('');
        setError(null);
        setIsSending(true);
        
        // Aggiungi messaggio utente
        setMessages((prev) => [...prev, { role: 'user', content }]);

        try {
            // Prepara history (ultimi 12 messaggi)
            const history = messagesRef.current
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .slice(-12);

            // Chiama API RAG
            const reply = await studyService.askTutor(deckId, content, history);
            
            // Aggiungi risposta AI
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (err: any) {
            const msg = err?.message || 'Errore nella chat con l\'AI';
            setError(msg);
        } finally {
            setIsSending(false);
        }
    }, [deckId, disabled, isSending]);

    return (
        <div className="h-full flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-auto p-4 space-y-3 scrollbar-macos">
                {messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    return (
                        <motion.div
                            key={`${m.role}-${idx}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                                    isUser
                                        ? 'bg-blue-500/20 border-blue-500/25 text-white'
                                        : 'bg-white/[0.06] border-white/[0.08] text-white/85'
                                }`}
                            >
                                {m.content}
                            </div>
                        </motion.div>
                    );
                })}

                {isSending && <LoadingBubble />}

                {error && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                            <FiAlertCircle className="w-4 h-4 text-rose-300" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-200">
                            {error}
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/[0.08]">
                <div className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (canSend) sendMessage(input);
                            }
                        }}
                        placeholder={
                            disabled
                                ? 'Chat non disponibile (manca il PDF).'
                                : 'Scrivi una domanda... (Invio per inviare, Shift+Invio per andare a capo)'
                        }
                        rows={2}
                        disabled={disabled || isSending}
                        className="flex-1 px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-2xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none disabled:opacity-50"
                    />
                    <motion.button
                        whileHover={{ scale: canSend ? 1.02 : 1 }}
                        whileTap={{ scale: canSend ? 0.98 : 1 }}
                        onClick={() => sendMessage(input)}
                        disabled={!canSend}
                        className="h-[46px] px-4 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <FiSend className="w-4 h-4" />
                        Invia
                    </motion.button>
                </div>
                <p className="text-xs text-white/40 mt-2">
                    L&apos;AI risponde solo usando il contenuto del PDF. Se l&apos;informazione non è nel testo, te lo dirà.
                </p>
            </div>
        </div>
    );
};
```

---

## Vector Store Service

### Pinecone + LangChain Integration

Servizio per la gestione degli embeddings e la ricerca vettoriale.

```javascript
// server/services/vectorStoreService.js

/**
 * 📦 VECTOR STORE SERVICE (Pinecone + LangChain)
 * =============================================
 *
 * Gestisce l'ingestione e la ricerca vettoriale dei chunk di testo dei PDF.
 * - Chunking: RecursiveCharacterTextSplitter (1000 chars, overlap 200)
 * - Embedding: OpenAI Embeddings (default text-embedding-3-small)
 * - Vector DB: Pinecone (filtrato per deckId)
 */

const AppError = require('../utils/AppError');

const DEFAULT_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const DEFAULT_TOP_K = 5;

let pineconeIndex = null;
let embedder = null;

const ensureEnv = () => {
    if (!process.env.PINECONE_API_KEY) {
        throw AppError.internal({ message: 'PINECONE_API_KEY mancante' });
    }
    if (!process.env.PINECONE_INDEX) {
        throw AppError.internal({ message: 'PINECONE_INDEX mancante' });
    }
    if (!process.env.OPENAI_API_KEY) {
        throw AppError.internal({ message: 'OPENAI_API_KEY mancante' });
    }
};

const getPineconeIndex = async () => {
    if (pineconeIndex) return pineconeIndex;
    ensureEnv();

    const { Pinecone } = await import('@pinecone-database/pinecone');
    const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    pineconeIndex = client.index(process.env.PINECONE_INDEX);
    return pineconeIndex;
};

const getEmbedder = async () => {
    if (embedder) return embedder;
    ensureEnv();

    const { OpenAIEmbeddings } = await import('@langchain/openai');
    embedder = new OpenAIEmbeddings({
        apiKey: process.env.OPENAI_API_KEY,
        model: DEFAULT_EMBED_MODEL,
    });
    return embedder;
};

const getTextSplitter = async () => {
    const { RecursiveCharacterTextSplitter } = await import('langchain/text_splitter');
    return new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
};

const buildVectorId = (deckId, index) => `${deckId}-${Date.now()}-${index}`;

/**
 * Ingestione di un deck nel vector store.
 * @param {string} deckId
 * @param {string} text
 */
const ingestDeck = async (deckId, text) => {
    if (!deckId) throw AppError.validation('deckId mancante per ingestione vettoriale');
    if (!text || text.trim().length < 20) {
        throw AppError.validation('Testo insufficiente per la creazione degli embedding');
    }

    const splitter = await getTextSplitter();
    const chunks = await splitter.splitText(text);
    if (!Array.isArray(chunks) || chunks.length === 0) {
        throw AppError.validation('Nessun chunk generato dal testo');
    }

    const [index, embeddings] = await Promise.all([getPineconeIndex(), getEmbedder()]);

    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        if (!chunkText || chunkText.trim().length === 0) continue;

        const values = await embeddings.embedQuery(chunkText);
        vectors.push({
            id: buildVectorId(deckId, i),
            values,
            metadata: {
                deckId,
                text: chunkText,
                chunkIndex: i,
            },
        });
    }

    if (vectors.length === 0) {
        throw AppError.validation('Nessun vettore valido generato dal testo');
    }

    await index.upsert(vectors);
    return { deckId, vectors: vectors.length };
};

/**
 * Query vettoriale su un deck.
 * @param {string} deckId
 * @param {string} question
 * @param {number} topK
 * @returns {Promise<string[]>} array di testi più rilevanti
 */
const queryDeck = async (deckId, question, topK = DEFAULT_TOP_K) => {
    if (!deckId) throw AppError.validation('deckId mancante per query vettoriale');
    if (!question || question.trim().length < 2) {
        throw AppError.validation('Domanda non valida per la query vettoriale');
    }

    const [index, embeddings] = await Promise.all([getPineconeIndex(), getEmbedder()]);
    const queryVector = await embeddings.embedQuery(question);

    const result = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter: { deckId },  // Filtro per deck specifico
    });

    const matches = Array.isArray(result?.matches) ? result.matches : [];
    return matches
        .map((m) => (m?.metadata?.text && typeof m.metadata.text === 'string' ? m.metadata.text : null))
        .filter(Boolean);
};

module.exports = {
    ingestDeck,
    queryDeck,
};
```

---

## PDF Cache Service

### LRU Cache con TTL

Servizio di caching in-memory per il parsing PDF.

```javascript
// server/services/pdfCacheService.js

const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * PDF Cache Service
 *
 * Servizio di caching in-memory per parsing PDF.
 * Utilizza strategia LRU (Least Recently Used) per limitare l'uso di memoria.
 *
 * Features:
 * - Cache con hash MD5 del file come chiave
 * - TTL (Time To Live) di 5 minuti
 * - Limite massimo di 50 PDF in cache
 * - Auto-cleanup di entries scaduti
 * - Stats per monitoring
 */
class PDFCacheService {
    constructor() {
        this.cache = new Map();
        this.MAX_CACHE_SIZE = 50; // Max 50 PDF in cache
        this.TTL = 5 * 60 * 1000; // 5 minuti in millisecondi

        // Stats
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            errors: 0,
        };

        console.log('[PDFCache] Initialized (max size: 50, TTL: 5min)');
    }

    /**
     * Calcola hash MD5 del file per cache key
     */
    async _getFileHash(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            return crypto.createHash('md5').update(buffer).digest('hex');
        } catch (err) {
            console.error('[PDFCache] Hash calculation error:', err.message);
            throw err;
        }
    }

    /**
     * Pulisce cache entries scaduti
     */
    _cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.TTL) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[PDFCache] Cleanup: removed ${cleaned} expired entries`);
        }
    }

    /**
     * Pulisce cache se troppo grande (LRU eviction)
     */
    _evictIfNeeded() {
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            // Trova l'entry meno recente (Least Recently Used)
            const entries = [...this.cache.entries()];
            const oldest = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];

            if (oldest) {
                this.cache.delete(oldest[0]);
                this.stats.evictions++;
                console.log(`[PDFCache] Evicted (LRU): ${oldest[0].substring(0, 12)}... (size: ${this.cache.size})`);
            }
        }
    }

    /**
     * Aggiorna timestamp per LRU
     */
    _touchEntry(key) {
        const entry = this.cache.get(key);
        if (entry) {
            entry.timestamp = Date.now();
            this.cache.set(key, entry);
        }
    }

    /**
     * Parsa PDF con caching
     */
    async parsePDF(filePath, buffer = null) {
        try {
            // Cleanup periodico ogni 10 richieste
            if ((this.stats.hits + this.stats.misses) % 10 === 0) {
                this._cleanup();
            }

            // Calcola hash per cache key
            let hash;
            if (buffer) {
                hash = crypto.createHash('md5').update(buffer).digest('hex');
            } else {
                hash = await this._getFileHash(filePath);
            }

            const cacheKey = `pdf_${hash}`;

            // Check cache
            const cached = this.cache.get(cacheKey);
            if (cached) {
                this.stats.hits++;
                this._touchEntry(cacheKey);
                console.log(`[PDFCache] ✅ HIT: ${cacheKey.substring(0, 16)}... (hits: ${this.stats.hits})`);
                return cached.data;
            }

            // Cache MISS: parsa PDF
            this.stats.misses++;
            console.log(`[PDFCache] ❌ MISS: ${cacheKey.substring(0, 16)}... (misses: ${this.stats.misses})`);

            const startTime = Date.now();
            const pdfBuffer = buffer || await fs.readFile(filePath);
            const pdfData = await pdfParse(pdfBuffer);
            const parseTime = Date.now() - startTime;

            console.log(`[PDFCache] Parsed in ${parseTime}ms (${pdfData.numpages} pages, ${pdfData.text.length} chars)`);

            // Salva in cache
            this._evictIfNeeded();

            this.cache.set(cacheKey, {
                data: pdfData,
                timestamp: Date.now(),
                filePath: filePath,
                size: pdfBuffer.length,
            });

            console.log(`[PDFCache] Cached: ${cacheKey.substring(0, 16)}... (cache size: ${this.cache.size}/${this.MAX_CACHE_SIZE})`);
            return pdfData;

        } catch (err) {
            this.stats.errors++;
            console.error('[PDFCache] Parse error:', err.message);
            throw err;
        }
    }

    /**
     * Stats per debugging e monitoring
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
            : '0.00';

        return {
            size: this.cache.size,
            maxSize: this.MAX_CACHE_SIZE,
            ttl: this.TTL,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: `${hitRate}%`,
            evictions: this.stats.evictions,
            errors: this.stats.errors,
        };
    }
}

// Singleton instance
const pdfCacheService = new PDFCacheService();
module.exports = pdfCacheService;
```

---

## Backend Integration

### askTutor Service (RAG Implementation)

Servizio backend che implementa il RAG per la chat AI.

```javascript
// server/services/studyService.js (estratto askTutor)

/**
 * 🤖 AI Tutor - Chat con PDF (RAG)
 * 
 * Utilizza il testo estratto dal PDF e il vector store per rispondere
 * alle domande degli utenti basandosi esclusivamente sul contenuto del PDF.
 */
async askTutor(tenantScope, deckId, message, history = []) {
    const userId = this._getUserId(tenantScope);
    
    // Validazioni
    if (!message || typeof message !== 'string' || !message.trim()) {
        throw AppError.validation('Il messaggio è obbligatorio');
    }
    if (message.length > 2000) {
        throw AppError.validation('Il messaggio non può superare 2000 caratteri');
    }
    if (!Array.isArray(history)) {
        throw AppError.validation('La history deve essere un array');
    }

    // Recupera deck
    const deck = await Deck.findOne({ _id: deckId, user: userId });
    if (!deck) throw AppError.notFound('Mazzo non trovato');

    // Verifica che ci sia il testo estratto
    const extractedText = deck.extractedText;
    if (!extractedText || typeof extractedText !== 'string' || extractedText.trim().length < 100) {
        throw AppError.validation('Testo del PDF non disponibile o insufficiente');
    }

    try {
        // 1. QUERY VETTORIALE: Trova i chunk più rilevanti
        const relevantChunks = await vectorStoreService.queryDeck(deckId, message.trim(), 5);
        
        if (!relevantChunks || relevantChunks.length === 0) {
            return "Non ho trovato informazioni rilevanti nel PDF per rispondere a questa domanda. Prova a riformularla o chiedi qualcosa di diverso.";
        }

        // 2. ASSEMBLY CONTEXTO: Unisci i chunk rilevanti
        const context = relevantChunks.join('\n\n---\n\n');
        
        // Limita contesto a 4000 caratteri per evitare token limit
        const truncatedContext = context.length > 4000 
            ? context.substring(0, 4000) + '... [testo troncato]' 
            : context;

        // 3. COSTRUZIONE MESSAGGI per OpenAI
        const systemPrompt = `Sei un tutor AI che risponde SOLO basandosi sul contenuto fornito.
REGOLE CRITICHE:
1. Rispondi SOLO usando le informazioni nel contesto fornito.
2. Se l'informazione non è nel contesto, dillo chiaramente: "Non trovo questa informazione nel PDF."
3. Non fare supposizioni o inferenze oltre il testo fornito.
4. Cita parti rilevanti del contesto quando possibile.
5. Usa markdown per formattare la risposta.
6. Sii conciso ma completo.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { 
                role: 'user', 
                content: `CONTESTO DEL PDF:\n${truncatedContext}\n\n---\n\nDOMANDA: ${message.trim()}` 
            },
        ];

        // Aggiungi history se presente (limitata agli ultimi 12 messaggi)
        if (history.length > 0) {
            const recentHistory = history.slice(-12);
            // Inserisci history dopo il system message
            messages.splice(1, 0, ...recentHistory);
        }

        // 4. CHIAMATA OPENAI
        const completion = await openai.chat.completions.create({
            model: ACTIVE_AI_MODEL,  // gpt-4o-mini
            messages,
            max_tokens: 1000,
            temperature: 0.3,  // Bassa temperatura per risposte factual
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        
        if (!reply) {
            throw AppError.internal({ message: 'Risposta AI vuota' });
        }

        // 5. LOGGING (opzionale, per analytics)
        console.log(`[AI Tutor] Q: "${message.substring(0, 50)}..." | A: "${reply.substring(0, 50)}..."`);

        return reply;

    } catch (error) {
        console.error('[AI Tutor] Error:', error.message);
        throw AppError.internal({ message: 'Errore nella generazione della risposta AI' });
    }
}
```

---

## API Endpoints

| Endpoint | Method | Descrizione |
|----------|--------|-------------|
| `/api/study/:id/generate-pdf` | POST | Upload PDF + generazione flashcard AI |
| `/api/study/:id/chat` | POST | Chat AI Tutor con RAG |
| `/api/study/:id/answer-question` | POST | Risposta a domanda d'esame (contesto PDF) |

---

## Configurazione Environment

```bash
# Vector Store (Pinecone)
PINECONE_API_KEY=pc_xxx...
PINECONE_INDEX=silvi-vectors

# Embeddings (OpenAI)
OPENAI_API_KEY=sk-...
OPENAI_EMBED_MODEL=text-embedding-3-small

# AI Model
OPENAI_MODEL=gpt-4o-mini
```

---

## Glossario

| Termine | Definizione |
|---------|-------------|
| **RAG** | Retrieval Augmented Generation - tecnica che combina retrieval di documenti con generazione testuale |
| **Embedding** | Rappresentazione vettoriale di un testo (numeri) che cattura il significato semantico |
| **Vector Store** | Database specializzato per la ricerca per similarità tra vettori |
| **Chunking** | Divisione di un testo lungo in segmenti più piccoli per l'elaborazione |
| **Similarity Search** | Ricerca dei vettori più simili a una query (coseno similarity) |
| **Source Grounding** | Ancoraggio della risposta AI al documento fonte |
| **LRU Cache** | Least Recently Used - strategia di caching che elimina prima gli elementi meno usati |
| **TTL** | Time To Live - durata di vita di un elemento in cache |

---

*Documento generato automaticamente da Kimi Code CLI.*  
*Ultimo aggiornamento: Febbraio 2026*
