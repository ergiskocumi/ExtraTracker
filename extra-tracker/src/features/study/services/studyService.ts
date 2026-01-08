import { apiClient, type ApiResponse } from '../../../shared/services/apiClient';

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
}

export interface Deck {
    id: string;
    goalId?: string;
    title: string;
    description?: string;
    pdfUrl?: string | null;
    tags: string[];
    cards: Card[];
    totalCards: number;
    dueCount: number;
    createdAt?: string;
    updatedAt?: string;
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

const normalizeCard = (raw: any): Card => ({
    id: raw.id || raw._id,
    front: raw.front || '',
    back: raw.back || '',
    options: Array.isArray(raw.options) ? raw.options : undefined,
    easinessFactor: safeNumber(raw.easinessFactor, 2.5),
    interval: safeNumber(raw.interval, 0),
    repetitions: safeNumber(raw.repetitions, 0),
    nextReviewDate: raw.nextReviewDate || new Date().toISOString(),
    status: raw.status || 'new',
});

const normalizeDeck = (raw: any): Deck => {
    const cards = Array.isArray(raw.cards) ? raw.cards.map(normalizeCard) : [];
    return {
        id: raw.id || raw._id,
        goalId: raw.goalId,
        title: raw.title || 'Senza titolo',
        description: raw.description,
        pdfUrl: typeof raw.pdfUrl === 'string' && raw.pdfUrl.length > 0 ? raw.pdfUrl : null,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
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
     * Elimina una carta da un mazzo
     */
    async deleteCard(deckId: string, cardId: string): Promise<Deck> {
        const response = await apiClient.delete<any>(`${this.baseUrl}/${deckId}/cards/${cardId}`);
        const raw = unwrap(response, 'Errore nell\'eliminazione della carta');
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
    async generateFromPDF(deckId: string, file: File): Promise<{ generatedCount: number; deck: Deck }> {
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
     * Ottiene analytics dettagliate per un deck
     */
    async getDeckAnalytics(deckId: string): Promise<DeckAnalytics> {
        const response = await apiClient.get<DeckAnalytics>(`${this.baseUrl}/${deckId}/analytics`);
        return unwrap(response, 'Errore nel recupero delle analytics');
    }
}

export const studyService = new StudyService();
