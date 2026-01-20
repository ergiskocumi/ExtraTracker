import { apiClient, type ApiResponse } from '../../../shared/services/apiClient';
export type { Tag } from './tagsService';

// ============================================
// TYPES
// ============================================

export type ReviewRating = 1 | 3 | 5;
export type CardStatus = 'new' | 'learning' | 'review' | 'mastered';
export type StudyMode = 'flashcard' | 'quiz' | 'typing';
export type ChatRole = 'user' | 'assistant';

export interface Card {
    id: string;
    front: string;
    back: string;
    options?: string[];
    easinessFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: string;
    status: CardStatus;
    /**
     * Metadata per tracciare la fonte originale nel PDF
     * Usato per il "Jump to Source" feature
     */
    sourceMetadata?: {
        /** Numero di pagina (1-based index) */
        pageNumber: number;
        /** Il testo esatto nel PDF che ha generato questa card */
        originalText: string;
    };
}

export interface Deck {
    id: string;
    goalId?: string;
    title: string;
    description?: string;
    pdfUrl?: string | null;
    tags: string[];
    folderId?: string | null;
    cards: Card[];
    totalCards: number;
    dueCount: number;
    createdAt?: string;
    updatedAt?: string;
    pinned?: boolean; // Preferiti - da implementare nel backend
}

export interface ChatMessage {
    role: ChatRole;
    content: string;
}

export interface StudySession {
    deck: Deck;
    cards: Card[];
    remaining: number;
    total: number;
    mode?: StudyMode;
}

export interface ReviewPayload {
    cardId: string;
    rating: ReviewRating;
}

export interface ReviewResult {
    card: Card;
    stats: {
        rating: number;
        easinessFactor: number;
        interval: number;
        repetitions: number;
        status: CardStatus;
        nextReviewDate: string;
        nextReviewInDays: number;
    };
}

export interface VerifyAnswerResult {
    correct: boolean;
    similarity?: number;
}

export interface SessionCompletePayload {
    mode: StudyMode;
    stats: {
        correct: number;
        wrong: number;
        timeSeconds: number;
    };
}

export interface SessionCompleteResult {
    xpEarned: number;
    leveledUp: boolean;
    newLevel: number;
    xpBreakdown?: {
        base: number;
        correct: number;
        speedBonus: number;
        streakBonus: number;
        total: number;
    };
}

export interface CreateDeckPayload {
    goalId: string;
    title: string;
    description?: string;
    tags?: string[];
}

export interface AddCardPayload {
    front: string;
    back: string;
}

export interface StudyDashboardResponse {
    decks: Deck[];
    dueCardCount: number;
}

export interface TutorReply {
    reply: string;
}

export interface ExamAnswer {
    answer: string;
    foundInContext: boolean;
    relatedTopics: string[] | null;
}

export interface DeckSettings {
    algorithm?: 'sm2' | 'fsrs' | 'leitner' | 'anki';
    aiSettings?: {
        style?: 'comprehensive' | 'conceptual' | 'factual' | 'application';
        difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
        questionTypes?: string[];
    };
}

export interface DeckAnalytics {
    stats: {
        totalCards: number;
        newCards: number;
        learningCards: number;
        reviewCards: number;
        masteredCards: number;
        dueCards: number;
        averageEasinessFactor: number;
        averageRepetitions: number;
    };
    analytics: {
        totalReviews: number;
        averageTimePerCard: number;
        retentionRate: number;
        retentionRatePercent: number;
        lastStudied: string | null;
        studyStreak: number;
    };
    algorithm: string;
    aiSettings: {
        style: string;
        difficulty: string;
        questionTypes: string[];
    };
}

// ============================================
// HELPERS
// ============================================

const unwrap = <T>(response: ApiResponse<T>, fallbackMessage: string): T => {
    if (!response.success || response.data === undefined) {
        throw new Error(response.error?.message || response.message || fallbackMessage);
    }
    return response.data;
};

const safeNumber = (value: unknown, fallback = 0): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const normalizeCard = (raw: any): Card => {
    // Normalizza sourceMetadata se presente (supporta sia camelCase che snake_case)
    let sourceMetadata: Card['sourceMetadata'] = undefined;
    if (raw.sourceMetadata || raw.source_metadata) {
        const sourceMeta = raw.sourceMetadata || raw.source_metadata;
        if (sourceMeta && typeof sourceMeta === 'object') {
            const pageNumber = Number.isFinite(Number(sourceMeta.pageNumber ?? sourceMeta.page_number)) 
                ? Number(sourceMeta.pageNumber ?? sourceMeta.page_number) 
                : undefined;
            const originalText = typeof (sourceMeta.originalText ?? sourceMeta.original_text) === 'string'
                ? (sourceMeta.originalText ?? sourceMeta.original_text).trim()
                : undefined;
            
            if (pageNumber !== undefined && pageNumber > 0 && originalText && originalText.length >= 20) {
                sourceMetadata = {
                    pageNumber,
                    originalText,
                };
            }
        }
    }

    return {
        id: raw.id || raw._id,
        front: raw.front || '',
        back: raw.back || '',
        options: Array.isArray(raw.options) ? raw.options : undefined,
        easinessFactor: safeNumber(raw.easinessFactor, 2.5),
        interval: safeNumber(raw.interval, 0),
        repetitions: safeNumber(raw.repetitions, 0),
        nextReviewDate: raw.nextReviewDate || new Date().toISOString(),
        status: raw.status || 'new',
        sourceMetadata,
    };
};

const normalizeDeck = (raw: any): Deck => {
    const cards = Array.isArray(raw.cards) ? raw.cards.map(normalizeCard) : [];
    return {
        id: raw.id || raw._id?.toString() || raw._id,
        goalId: raw.goalId?.toString() || raw.goalId,
        title: raw.title || 'Senza titolo',
        description: raw.description,
        pdfUrl: typeof raw.pdfUrl === 'string' && raw.pdfUrl.length > 0 ? raw.pdfUrl : null,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        folderId: raw.folderId?.toString() || raw.folderId || null,
        cards,
        totalCards: safeNumber(raw.totalCards, cards.length),
        dueCount: safeNumber(raw.dueCount, cards.length),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
};

const normalizeDashboard = (payload: unknown): StudyDashboardResponse => {
    // Handle { decks, dueCardCount } format
    if (payload && typeof payload === 'object' && 'decks' in payload) {
        const data = payload as { decks: any[]; dueCardCount?: number };
        const decks = Array.isArray(data.decks) ? data.decks.map(normalizeDeck) : [];
        const dueCardCount = safeNumber(
            data.dueCardCount,
            decks.reduce((sum, d) => sum + d.dueCount, 0)
        );
        return { decks, dueCardCount };
    }

    // Handle array format (legacy)
    if (Array.isArray(payload)) {
        const decks = payload.map(normalizeDeck);
        const dueCardCount = decks.reduce((sum, d) => sum + d.dueCount, 0);
        return { decks, dueCardCount };
    }

    return { decks: [], dueCardCount: 0 };
};

const normalizeSession = (payload: any): StudySession => {
    const deck = normalizeDeck(payload?.deck || payload || {});
    const cards = Array.isArray(payload?.cards)
        ? payload.cards.map(normalizeCard)
        : deck.cards;

    return {
        deck,
        cards,
        remaining: safeNumber(payload?.remaining, cards.length),
        total: safeNumber(payload?.total, deck.totalCards || cards.length),
        mode: payload?.mode,
    };
};

// ============================================
// SERVICE CLASS
// ============================================

class StudyService {
    private baseUrl = '/study';

    /**
     * Recupera la dashboard con tutti i mazzi
     */
    async getDashboard(): Promise<StudyDashboardResponse> {
        const response = await apiClient.get<any>(`${this.baseUrl}/dashboard`);
        const payload = unwrap(response, 'Errore nel recupero dei mazzi');
        return normalizeDashboard(payload);
    }

    /**
     * Recupera un singolo mazzo per ID (con tutte le carte)
     * Usato per il refresh della sessione di studio
     */
    async getDeckById(deckId: string): Promise<Deck> {
        const response = await apiClient.get<any>(`${this.baseUrl}/${deckId}`);
        const raw = unwrap(response, 'Mazzo non trovato');
        return normalizeDeck(raw);
    }

    /**
     * Crea un nuovo mazzo
     */
    async createDeck(payload: CreateDeckPayload): Promise<Deck> {
        const response = await apiClient.post<any>(this.baseUrl, payload);
        const raw = unwrap(response, 'Errore nella creazione del mazzo');
        return normalizeDeck(raw);
    }

    /**
     * Elimina un mazzo
     */
    async deleteDeck(deckId: string): Promise<void> {
        const response = await apiClient.delete<void>(`${this.baseUrl}/${deckId}`);
        // Per le DELETE, il server può restituire solo { success: true, message: '...' } senza data
        if (!response.success) {
            throw new Error(response.error?.message || response.message || 'Errore nell\'eliminazione del mazzo');
        }
        // Se success è true, l'operazione è riuscita anche senza data
    }

    /**
     * Aggiunge una carta a un mazzo
     */
    async addCard(deckId: string, payload: AddCardPayload): Promise<Deck> {
        const response = await apiClient.post<any>(`${this.baseUrl}/${deckId}/cards`, payload);
        const raw = unwrap(response, 'Errore nell\'aggiunta della carta');
        return normalizeDeck(raw);
    }

    /**
     * Modifica una carta esistente
     */
    async updateCard(deckId: string, cardId: string, payload: AddCardPayload): Promise<Deck> {
        const response = await apiClient.put<any>(`${this.baseUrl}/${deckId}/cards/${cardId}`, payload);
        const raw = unwrap(response, 'Errore nella modifica della carta');
        return normalizeDeck(raw);
    }

    /**
     * Aggiorna solo la risposta (back) di una flashcard
     */
    async updateCardAnswer(deckId: string, cardId: string, answer: string): Promise<Deck> {
        const response = await apiClient.patch<any>(`${this.baseUrl}/${deckId}/cards/${cardId}/answer`, { answer });
        const raw = unwrap(response, 'Errore nell\'aggiornamento della risposta');
        return normalizeDeck(raw);
    }

    /**
     * Elimina una carta da un mazzo
     */
    async deleteCard(deckId: string, cardId: string): Promise<Deck> {
        const response = await apiClient.delete<any>(`${this.baseUrl}/${deckId}/cards/${cardId}`);
        const raw = unwrap(response, 'Errore nell\'eliminazione della carta');
        return normalizeDeck(raw);
    }

    /**
     * Riordina le card di un mazzo
     * @param deckId - ID del mazzo
     * @param cardIds - Array di card IDs nell'ordine desiderato
     * @returns Deck aggiornato
     */
    async reorderCards(deckId: string, cardIds: string[]): Promise<Deck> {
        const response = await apiClient.put<any>(`${this.baseUrl}/${deckId}/cards/reorder`, { cardIds });
        const raw = unwrap(response, 'Errore nel riordinamento delle card');
        return normalizeDeck(raw);
    }

    /**
     * Aggiunge una card in una posizione specifica
     * @param deckId - ID del mazzo
     * @param payload - Dati della card e posizione
     * @param payload.front - Fronte della card
     * @param payload.back - Retro della card
     * @param payload.position - Posizione dove inserire (0-based, opzionale)
     * @returns Deck aggiornato
     */
    async addCardAtPosition(deckId: string, payload: AddCardPayload & { position?: number }): Promise<Deck> {
        const response = await apiClient.post<any>(`${this.baseUrl}/${deckId}/cards/insert`, payload);
        const raw = unwrap(response, 'Errore nell\'aggiunta della carta');
        return normalizeDeck(raw);
    }

    /**
     * Carica una sessione di studio per un mazzo specifico
     * Recupera i dati freschi dal backend (risolve il problema del refresh)
     */
    async getSession(deckId: string, mode: StudyMode = 'flashcard'): Promise<StudySession> {
        const response = await apiClient.get<any>(`${this.baseUrl}/${deckId}/session?mode=${mode}`);
        const raw = unwrap(response, 'Errore nel recupero della sessione');
        return normalizeSession(raw);
    }

    /**
     * Invia la valutazione di una carta (algoritmo SM-2)
     */
    async submitReview(deckId: string, payload: ReviewPayload): Promise<ReviewResult> {
        const response = await apiClient.post<ReviewResult>(
            `${this.baseUrl}/${deckId}/review`,
            payload
        );
        return unwrap(response, 'Errore nel salvataggio della review');
    }

    /**
     * Verifica risposta per Typing Mode
     */
    async verifyAnswer(deckId: string, cardId: string, userAnswer: string): Promise<VerifyAnswerResult> {
        const response = await apiClient.post<any>(
            `${this.baseUrl}/${deckId}/verify-answer`,
            { cardId, userAnswer }
        );
        const raw = unwrap(response, 'Errore nella verifica della risposta');
        const similarity = typeof raw?.similarity === 'number' && Number.isFinite(raw.similarity)
            ? raw.similarity
            : undefined;
        return {
            correct: raw?.correct ?? raw?.isCorrect ?? false,
            similarity,
        };
    }

    /**
     * Finalizza la sessione e assegna XP (gamification).
     */
    async completeSession(deckId: string, payload: SessionCompletePayload): Promise<SessionCompleteResult> {
        const response = await apiClient.post<SessionCompleteResult>(
            `${this.baseUrl}/${deckId}/session-complete`,
            payload
        );
        return unwrap(response, 'Errore nel completamento della sessione');
    }

    /**
     * 🪄 MAGIC GENERATE - Genera flashcard da PDF usando AI
     * 
     * Carica un file PDF e usa OpenAI per generare automaticamente
     * 10-15 flashcard di qualità basate sul contenuto.
     */
    async generateFromPDF(
        deckId: string,
        file: File
    ): Promise<{ generatedCount: number; deck: Deck; totalChunks?: number; totalTextLength?: number }> {
        // Validazione client-side
        if (!file) {
            throw new Error('Nessun file selezionato');
        }
        if (file.type !== 'application/pdf') {
            throw new Error('Solo file PDF sono supportati');
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('Il file supera il limite di 10MB');
        }

        // Costruisci FormData per upload
        const formData = new FormData();
        formData.append('pdf', file);

        console.log('📤 Uploading PDF:', file.name, file.size, 'bytes');

        // Chiamata API con FormData
        // NOTA: withCredentials: true per inviare cookies HttpOnly (auth)
        // NOTA: NON impostare Content-Type manualmente, il browser lo fa con boundary
        const response = await fetch(`/api${this.baseUrl}/${deckId}/generate-pdf`, {
            method: 'POST',
            body: formData,
            credentials: 'include', // Include cookies per auth
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error response:', errorData);
            throw new Error(
                errorData.error?.message || 
                errorData.message || 
                `Errore ${response.status}: generazione fallita`
            );
        }

        const result = await response.json();
        console.log('✅ Result:', result);
        
        if (!result.success) {
            throw new Error(result.error?.message || result.message || 'Generazione fallita');
        }

        return {
            generatedCount: result.data?.generatedCount || 0,
            deck: normalizeDeck(result.data?.deck || {}),
            totalChunks: result.data?.totalChunks, // Info aggiuntiva per UX
            totalTextLength: result.data?.totalTextLength, // Info per analytics
        };
    }

    /**
     * 🤖 AI Tutor - Chat con PDF (RAG lite)
     */
    async askTutor(deckId: string, message: string, history: ChatMessage[] = []): Promise<string> {
        const response = await apiClient.post<TutorReply>(`${this.baseUrl}/${deckId}/chat`, {
            message,
            history,
        });

        const raw = unwrap(response, 'Errore nella chat AI');
        const reply = typeof raw?.reply === 'string' ? raw.reply : '';

        if (!reply.trim()) {
            throw new Error('Risposta AI vuota');
        }

        return reply;
    }

    /**
     * 📚 Tutor Accademico - Risponde a domande d'esame usando ESCLUSIVAMENTE il contesto fornito
     */
    async answerExamQuestion(deckId: string, question: string): Promise<ExamAnswer> {
        const response = await apiClient.post<ExamAnswer>(`${this.baseUrl}/${deckId}/answer-question`, {
            question,
        });

        return unwrap(response, 'Errore nella risposta alla domanda');
    }

    /**
     * Aggiorna le impostazioni del deck (algoritmo e AI)
     */
    async updateDeckSettings(deckId: string, settings: DeckSettings): Promise<Deck> {
        const response = await apiClient.put<any>(`${this.baseUrl}/${deckId}/settings`, settings);
        const raw = unwrap(response, 'Errore nell\'aggiornamento delle impostazioni');
        return normalizeDeck(raw);
    }

    /**
     * Aggiorna il titolo di un deck
     */
    async updateDeckTitle(deckId: string, title: string): Promise<Deck> {
        const response = await apiClient.patch<any>(`${this.baseUrl}/${deckId}`, { title });
        const raw = unwrap(response, 'Errore nell\'aggiornamento del titolo');
        return normalizeDeck(raw);
    }

    /**
     * Aggiorna folderId, goalId e/o tags di un deck
     */
    async updateDeckOrganization(deckId: string, updates: { folderId?: string | null; goalId?: string | null; tags?: string[] }): Promise<Deck> {
        const response = await apiClient.patch<any>(`${this.baseUrl}/${deckId}`, updates);
        const raw = unwrap(response, 'Errore nell\'aggiornamento');
        return normalizeDeck(raw);
    }

    /**
     * Ottiene analytics dettagliate per un deck
     */
    async getDeckAnalytics(deckId: string): Promise<DeckAnalytics> {
        const response = await apiClient.get<DeckAnalytics>(`${this.baseUrl}/${deckId}/analytics`);
        return unwrap(response, 'Errore nel recupero delle analytics');
    }

    /**
     * Resetta le carte di tutti i deck associati a un esame
     * @param examId - ID dell'esame (Goal)
     * @param type - 'all' per reset completo, 'hard-only' per solo carte difficili
     */
    async resetExamCards(examId: string, type: 'all' | 'hard-only'): Promise<{ decksAffected: number; cardsReset: number; type: string }> {
        const response = await apiClient.post<any>(`${this.baseUrl}/exam/${examId}/reset-cards`, { type });
        return unwrap(response, 'Errore nel reset delle carte');
    }

    /**
     * Genera domande AI di approfondimento basate sulle difficoltà segnalate
     * @param examId - ID dell'esame (Goal)
     * @param difficulties - Array di difficoltà segnalate (es. ['concepts', 'time'])
     */
    async generateRecoveryQuestions(examId: string, difficulties: string[]): Promise<{ decksAffected: number; totalGenerated: number; generatedByDeck: Array<{ deckId: string; deckTitle: string; count: number }> }> {
        const response = await apiClient.post<any>(`${this.baseUrl}/exam/${examId}/generate-recovery-questions`, { difficulties });
        return unwrap(response, 'Errore nella generazione delle domande AI');
    }

    /**
     * 📋 Estrae domande da un documento (Livello 1 - Preview)
     * @param questionsFile - File con le domande (PDF o TXT)
     * @returns Array di domande estratte
     */
    async extractExamQuestions(questionsFile: File): Promise<{ questions: string[] }> {
        console.log('📤 Uploading questions file for extraction...');

        const formData = new FormData();
        formData.append('questionsFile', questionsFile);

        const response = await fetch(`/api${this.baseUrl}/exam-solver/extract-questions`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || 
                errorData.message || 
                `Errore ${response.status}: estrazione domande fallita`
            );
        }

        const result = await response.json();
        return result.data || { questions: [] };
    }

    /**
     * 🤖 Genera risposte per domande selezionate (Livello 1 - Preview)
     * @param sourceFile - File PDF con il materiale di studio
     * @param selectedQuestions - Array di domande selezionate dall'utente
     * @param options - Opzioni { deckId?, title?, goalId? }
     * @returns Deck, flashcard con ID e statistiche
     */
    async generateExamAnswers(
        sourceFile: File,
        selectedQuestions: string[],
        options: { deckId?: string; title?: string; goalId?: string } = {}
    ): Promise<{ 
        deck: Deck; 
        flashcards: Array<{ id: string; front: string; back: string; found: boolean }>;
        stats: { questionsExtracted: number; answersFound: number; answersNotFound: number; totalFlashcards: number; processingTimeMs: number } 
    }> {
        console.log('📤 Uploading source file and generating answers...');

        const formData = new FormData();
        formData.append('sourceFile', sourceFile);
        formData.append('selectedQuestions', JSON.stringify(selectedQuestions));
        
        if (options.deckId) {
            formData.append('deckId', options.deckId);
        }
        if (options.title) {
            formData.append('title', options.title);
        }
        if (options.goalId) {
            formData.append('goalId', options.goalId);
        }

        const response = await fetch(`/api${this.baseUrl}/exam-solver/generate-answers`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || 
                errorData.message || 
                `Errore ${response.status}: generazione risposte fallita`
            );
        }

        const result = await response.json();
        const data = result.data || result;

        return {
            deck: normalizeDeck(data.deck),
            flashcards: data.flashcards || [],
            stats: data.stats || {
                questionsExtracted: 0,
                answersFound: 0,
                answersNotFound: 0,
                totalFlashcards: 0,
                processingTimeMs: 0,
            },
        };
    }

    /**
     * 🎯 Exam Solver - Estrae domande da un documento e genera risposte da un altro (LEGACY)
     * @param formData - FormData con questionsFile, sourceFile, deckId (opzionale), title (opzionale), goalId (opzionale)
     * @returns Deck e statistiche
     */
    async examSolver(formData: FormData): Promise<{ deck: Deck; stats: { questionsExtracted: number; answersFound: number; answersNotFound: number; totalFlashcards: number; processingTimeMs: number } }> {
        console.log('📤 Uploading files for Exam Solver...');

        // Chiamata API con FormData
        const response = await fetch(`/api${this.baseUrl}/exam-solver`, {
            method: 'POST',
            body: formData,
            credentials: 'include', // Include cookies per auth
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error response:', errorData);
            throw new Error(
                errorData.error?.message || 
                errorData.message || 
                `Errore ${response.status}: risoluzione esame fallita`
            );
        }

        const result = await response.json();
        const data = result.data || result;

        return {
            deck: normalizeDeck(data.deck),
            stats: data.stats || {
                questionsExtracted: 0,
                answersFound: 0,
                answersNotFound: 0,
                totalFlashcards: 0,
                processingTimeMs: 0,
            },
        };
    }
}

export const studyService = new StudyService();
