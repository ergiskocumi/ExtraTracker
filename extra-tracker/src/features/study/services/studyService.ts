import { apiClient, type ApiResponse } from '../../../shared/services/apiClient';

// ============================================
// TYPES
// ============================================

export type ReviewRating = 1 | 3 | 5;
export type CardStatus = 'new' | 'learning' | 'review' | 'mastered';

export interface Card {
    id: string;
    front: string;
    back: string;
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
    tags: string[];
    cards: Card[];
    totalCards: number;
    dueCount: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface StudySession {
    deck: Deck;
    cards: Card[];
    remaining: number;
    total: number;
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
        unwrap(response, 'Errore nell\'eliminazione del mazzo');
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
     * Carica una sessione di studio per un mazzo specifico
     * Recupera i dati freschi dal backend (risolve il problema del refresh)
     */
    async getSession(deckId: string): Promise<StudySession> {
        const deck = await this.getDeckById(deckId);
        
        // Filtra solo le carte da ripassare (nextReviewDate <= now)
        const now = new Date();
        const dueCards = deck.cards.filter(card => {
            const reviewDate = new Date(card.nextReviewDate);
            return reviewDate <= now;
        });

        return {
            deck,
            cards: dueCards.length > 0 ? dueCards : deck.cards, // Se nessuna scaduta, mostra tutte
            remaining: dueCards.length > 0 ? dueCards.length : deck.cards.length,
            total: deck.totalCards,
        };
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
}

export const studyService = new StudyService();
