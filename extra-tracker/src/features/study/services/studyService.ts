import { apiClient, getCsrfHeader } from '../../../shared/services/apiClient';
import { unwrap } from '../../../shared/services/apiHelpers';
export type { Tag } from './tagsService';
import type {
    Card,
    Deck,
    SavedQuizSnapshot,
    QuizAttempt,
    ExamSavedQuiz,
    ReviewRating,
    CardStatus,
    StudyMode,
    QuizType,
    SessionFocus,
    SessionLength,
    SessionDirection,
    ChatRole,
} from '../../../types/domain';

// Re-export canonical types so consumers can import from studyService
export type {
    Card,
    Deck,
    SavedQuizSnapshot,
    QuizAttempt,
    ExamSavedQuiz,
    ReviewRating,
    CardStatus,
    StudyMode,
    QuizType,
    SessionFocus,
    SessionLength,
    SessionDirection,
    ChatRole,
};

// ============================================
// STUDY-SPECIFIC TYPES (not in domain.ts)
// ============================================

export interface SavedQuizRetakeResponse {
    quizId: string;
    name: string;
    quizType: QuizType;
    questionCount: number;
    cards: Card[];
    attempts: QuizAttempt[];
    strategy?: QuizRetakeStrategy;
    session?: StudySession;
}

export interface QuizRetakeStrategyParams {
    wrongWeight?: number;
    recencyWeight?: number;
    difficultyWeight?: number;
    noveltyWeight?: number;
    shuffleStrength?: number;
}

export interface QuizRetakeStrategy {
    mode?: 'full' | 'weak_first' | 'errors_only' | 'spaced_mix';
    targetCount?: number;
    seed?: string;
    params?: QuizRetakeStrategyParams;
}

export interface SavedQuizReviewQuestion {
    questionText: string;
    correctAnswer: string;
    distractors: string[];
    distractorExplanations: string[];
    correctAnswerExplanation: string;
    difficulty: string;
    options: string[];
}

export interface SavedQuizReviewResponse {
    quizId: string;
    name: string;
    quizType: QuizType;
    questions: SavedQuizReviewQuestion[];
    attempts: QuizAttempt[];
}

export interface PersistedQuizGenerationPayload {
    name?: string;
    quizType: QuizType;
    questionCount: number;
    source?: 'chapter' | 'repeat' | 'errors' | 'saved';
}

export interface PersistedQuizGenerationResult {
    quiz: ExamSavedQuiz & { hasQuestions?: boolean };
    session: StudySession;
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
    cardModes?: Record<string, StudyMode>;
    meta?: {
        focus?: SessionFocus;
        limit?: number;
        timeLimitMinutes?: number;
        questionCount?: number;
        direction?: SessionDirection;
        quizType?: QuizType;
        quizId?: string;
        retakeStrategy?: QuizRetakeStrategy;
    };
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
    answersDetails?: Array<{
        cardId: string;
        front: string;
        back: string;
        rating: number;
        correct: boolean;
    }>;
}

export interface SessionRequestOptions {
    mode?: StudyMode;
    focus?: SessionFocus;
    limit?: number;
    timeLimitMinutes?: number;
    questionCount?: number;
    direction?: SessionDirection;
    examType?: string;
    examDifficulty?: string;
    quizType?: QuizType;
    sourceCardIds?: string[];
    quizId?: string;
    savedQuizId?: string;
}

export interface SaveQuizSnapshotPayload {
    name?: string;
    quizType: QuizType;
    questionCount: number;
    sourceCardIds: string[];
    source?: 'chapter' | 'repeat' | 'errors' | 'saved';
    questions?: Array<{
        questionText: string;
        correctAnswer: string;
        distractors: string[];
        distractorExplanations?: string[];
        correctAnswerExplanation?: string;
        difficulty?: string;
        options?: string[];
    }>;
}

export interface SessionCompleteResult {
    stats?: {
        correctCount?: number;
        wrongCount?: number;
        timeSpentSeconds?: number;
        totalCards?: number;
        mode?: string;
    };
}

export interface CreateDeckPayload {
    examId?: string;
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


// ============================================
// HELPERS
// ============================================

const safeNumber = (value: unknown, fallback = 0): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const normalizeCard = (raw: unknown): Card => {
    const r = raw as Record<string, unknown>;
    // Normalizza sourceMetadata se presente (supporta sia camelCase che snake_case)
    let sourceMetadata: Card['sourceMetadata'] = undefined;
    if (r.sourceMetadata || r.source_metadata) {
        const sourceMeta = (r.sourceMetadata || r.source_metadata) as Record<string, unknown>;
        if (sourceMeta && typeof sourceMeta === 'object') {
            const pageNumber = Number.isFinite(Number(sourceMeta.pageNumber ?? sourceMeta.page_number))
                ? Number(sourceMeta.pageNumber ?? sourceMeta.page_number)
                : undefined;
            const originalTextValue = sourceMeta.originalText ?? sourceMeta.original_text;
            const originalText = typeof originalTextValue === 'string'
                ? originalTextValue.trim()
                : undefined;

            if (pageNumber !== undefined && pageNumber > 0 && originalText && originalText.length >= 20) {
                sourceMetadata = { pageNumber, originalText };
            }
        }
    }

    return {
        id: (r.id || r._id) as string,
        front: typeof r.front === 'string' ? r.front : '',
        back: typeof r.back === 'string' ? r.back : '',
        canonicalBack: typeof r.canonicalBack === 'string' ? r.canonicalBack : undefined,
        quizAnswerVariant: typeof r.quizAnswerVariant === 'string' ? r.quizAnswerVariant : undefined,
        options: Array.isArray(r.options) ? (r.options as string[]) : undefined,
        distractors: Array.isArray(r.distractors) ? (r.distractors as string[]) : undefined,
        aiDistractorsFailed: Boolean(r.aiDistractorsFailed ?? r.ai_distractors_failed),
        distractorExplanations: Array.isArray(r.distractorExplanations)
            ? Object.fromEntries((r.distractorExplanations as string[]).map((v, i) => [i, v]))
            : (r.distractorExplanations && typeof r.distractorExplanations === 'object')
                ? r.distractorExplanations as Record<string, string>
                : undefined,
        easinessFactor: safeNumber(r.easinessFactor, 2.5),
        interval: safeNumber(r.interval, 0),
        repetitions: safeNumber(r.repetitions, 0),
        nextReviewDate: typeof r.nextReviewDate === 'string' ? r.nextReviewDate : new Date().toISOString(),
        status: (r.status as Card['status']) || 'new',
        isTrueFalse: r.isTrueFalse === true ? true : undefined,
        correctStatement: typeof r.correctStatement === 'string' ? r.correctStatement : undefined,
        explanation: typeof r.explanation === 'string' ? r.explanation
            : typeof r.correctAnswerExplanation === 'string' ? r.correctAnswerExplanation
            : undefined,
        sourceMetadata,
    };
};

const normalizeSavedQuiz = (raw: unknown): SavedQuizSnapshot => {
    const r = raw as Record<string, unknown> | null | undefined;
    const source = typeof r?.source === 'string' ? r.source.toLowerCase() : 'chapter';
    const allowedSources: SavedQuizSnapshot['source'][] = ['chapter', 'repeat', 'errors', 'saved'];
    const normalizedSource = allowedSources.includes(source as SavedQuizSnapshot['source'])
        ? source as SavedQuizSnapshot['source']
        : 'chapter';

    return {
        id: String(r?.id || r?._id || ''),
        name: typeof r?.name === 'string' ? r.name : '',
        quizType: r?.quizType === 'true_false' ? 'true_false' : 'multiple_choice',
        questionCount: safeNumber(r?.questionCount, 0),
        sourceCardIds: Array.isArray(r?.sourceCardIds)
            ? (r.sourceCardIds as unknown[]).map((id) => String(id).trim()).filter(Boolean)
            : [],
        source: normalizedSource,
        createdAt: r?.createdAt as string | undefined,
        attemptCount: typeof r?.attemptCount === 'number' ? r.attemptCount : undefined,
        lastScore: typeof r?.lastScore === 'number' ? r.lastScore : undefined,
        bestScore: typeof r?.bestScore === 'number' ? r.bestScore : undefined,
        hasQuestions: typeof r?.hasQuestions === 'boolean' ? r.hasQuestions : undefined,
    };
};

const normalizeDeck = (raw: unknown): Deck => {
    const r = raw as Record<string, unknown>;
    const cards = Array.isArray(r.cards) ? (r.cards as unknown[]).map(normalizeCard) : [];

    return {
        id: (r.id || (r._id != null ? String(r._id) : undefined)) as string,
        examId: r.examId != null ? String(r.examId) : undefined,
        title: typeof r.title === 'string' ? r.title : 'Senza titolo',
        description: typeof r.description === 'string' ? r.description : undefined,
        pdfUrl: typeof r.pdfUrl === 'string' && r.pdfUrl.length > 0 ? r.pdfUrl : null,
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
        folderId: r.folderId != null ? String(r.folderId) : null,
        cards,
        totalCards: safeNumber(r.totalCards, cards.length),
        dueCount: safeNumber(r.dueCount, cards.length),
        createdAt: r.createdAt as string | undefined,
        updatedAt: r.updatedAt as string | undefined,
        savedQuizzes: Array.isArray(r.savedQuizzes) ? (r.savedQuizzes as unknown[]).map(normalizeSavedQuiz) : [],
    };
};

const normalizeDashboard = (payload: unknown): StudyDashboardResponse => {
    // Handle { decks, dueCardCount } format
    if (payload && typeof payload === 'object' && 'decks' in payload) {
        const data = payload as { decks: unknown[]; dueCardCount?: number };
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

const normalizeSession = (payload: unknown): StudySession => {
    const p = payload as Record<string, unknown> | null | undefined;
    const deck = normalizeDeck(p?.deck ?? payload ?? {});
    const cards = Array.isArray(p?.cards)
        ? (p.cards as unknown[]).map(normalizeCard)
        : deck.cards;
    const cardModes = p?.cardModes && typeof p.cardModes === 'object'
        ? p.cardModes as Record<string, StudyMode>
        : undefined;
    const meta = p?.meta && typeof p.meta === 'object'
        ? p.meta as StudySession['meta']
        : undefined;

    return {
        deck,
        cards,
        remaining: safeNumber(p?.remaining, cards.length),
        total: safeNumber(p?.total, deck.totalCards || cards.length),
        mode: p?.mode as StudyMode | undefined,
        cardModes,
        meta,
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
    async getSession(deckId: string, options: SessionRequestOptions = {}): Promise<StudySession> {
        const params = new URLSearchParams();
        if (options.mode) params.set('mode', options.mode);
        if (options.focus) params.set('focus', options.focus);
        if (options.limit) params.set('limit', String(options.limit));
        if (options.timeLimitMinutes) params.set('time', String(options.timeLimitMinutes));
        if (options.questionCount) params.set('questions', String(options.questionCount));
        if (options.direction) params.set('direction', options.direction);
        if (options.examType) params.set('examType', options.examType);
        if (options.examDifficulty) params.set('examDifficulty', options.examDifficulty);
        if (options.quizType) params.set('quizType', options.quizType);
        if (options.quizId) params.set('quizId', options.quizId);
        if (options.savedQuizId) params.set('savedQuizId', options.savedQuizId);
        if (Array.isArray(options.sourceCardIds) && options.sourceCardIds.length > 0) {
            params.set('sourceCardIds', options.sourceCardIds.join(','));
        }

        const query = params.toString();
        const response = await apiClient.get<any>(`${this.baseUrl}/${deckId}/session${query ? `?${query}` : ''}`);
        const raw = unwrap(response, 'Errore nel recupero della sessione');
        return normalizeSession(raw);
    }

    /**
     * Salva lo snapshot di un quiz appena generato
     */
    async saveQuizSnapshot(deckId: string, payload: SaveQuizSnapshotPayload): Promise<ExamSavedQuiz> {
        const response = await apiClient.post<any>(`${this.baseUrl}/${deckId}/quizzes`, payload);
        const raw = unwrap(response, 'Errore nel salvataggio del quiz');
        const normalized = normalizeSavedQuiz(raw);
        return {
            ...normalized,
            deckId: String(raw?.deckId || deckId),
            deckTitle: typeof raw?.deckTitle === 'string' ? raw.deckTitle : '',
            examId: raw?.examId || null,
        };
    }

    async generatePersistedQuiz(deckId: string, payload: PersistedQuizGenerationPayload, signal?: AbortSignal): Promise<PersistedQuizGenerationResult> {
        const response = await apiClient.post<any>(`${this.baseUrl}/${deckId}/quizzes/generate`, payload, {
            timeout: 300_000, // 5 minuti — la generazione AI può richiedere diversi minuti su PDF grandi
            signal,
        });
        const raw = unwrap(response, 'Errore nella generazione del quiz persistito');
        const quizRaw = raw?.quiz ?? {};
        const quiz: ExamSavedQuiz & { hasQuestions?: boolean } = {
            ...normalizeSavedQuiz(quizRaw),
            deckId: String(quizRaw?.deckId || deckId),
            deckTitle: typeof quizRaw?.deckTitle === 'string' ? quizRaw.deckTitle : '',
            examId: quizRaw?.examId || null,
            hasQuestions: Boolean(quizRaw?.hasQuestions),
        };

        return {
            quiz,
            session: normalizeSession(raw?.session ?? {}),
        };
    }

    /**
     * Avvia generazione quiz asincrona con SSE progress.
     * Restituisce jobId — il progresso arriva via EventSource.
     */
    async generatePersistedQuizAsync(
        deckId: string,
        payload: PersistedQuizGenerationPayload,
    ): Promise<{ jobId: string; estimatedSeconds: number }> {
        const response = await apiClient.post<{ jobId: string; estimatedSeconds: number }>(
            `${this.baseUrl}/${deckId}/quizzes/generate-async`,
            payload,
            { timeout: 120_000 }, // 2 min — il controller deve rispondere in <2s, ma margine di sicurezza
        );
        return unwrap(response, 'Errore nell\'avvio della generazione quiz');
    }

    /**
     * Polling dello stato di un job di generazione quiz.
     * Usato come fallback quando SSE non è disponibile.
     */
    async getQuizGenerationStatus(
        deckId: string,
        jobId: string,
    ): Promise<{
        jobId: string;
        status: string;
        totalChunks?: number;
        completedChunks?: number;
        failedChunks?: number;
        partialResult?: boolean;
        error?: string;
        result?: { quiz: Record<string, unknown>; session: Record<string, unknown> } | null;
    }> {
        const response = await apiClient.get<any>(
            `${this.baseUrl}/${deckId}/quizzes/generate/${jobId}/status`,
            { timeout: 15_000 }, // 15s — lettura veloce, se lento c'è un problema
        );
        return unwrap(response, 'Errore nel recupero stato generazione');
    }

    /**
     * Recupera lo storico quiz salvati per un esame
     */
    async getExamSavedQuizzes(examId: string): Promise<ExamSavedQuiz[]> {
        const response = await apiClient.get<any>(`${this.baseUrl}/exam/${examId}/quizzes`);
        const raw = unwrap(response, 'Errore nel recupero dei quiz salvati');
        if (!Array.isArray(raw)) return [];

        return raw.map((item: unknown) => {
            const normalized = normalizeSavedQuiz(item);
            const i = item as Record<string, unknown>;
            return {
                ...normalized,
                deckId: String(i?.deckId || ''),
                deckTitle: typeof i?.deckTitle === 'string' ? i.deckTitle : 'Mazzo',
                examId: (i?.examId as string | null | undefined) ?? null,
            };
        });
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
     * Finalizza la sessione.
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
     * un numero dinamico di flashcard di qualità basate sul contenuto.
     */
    async generateFromPDF(
        deckId: string,
        file: File,
        options: { maxCards?: number } = {}
    ): Promise<{ generatedCount: number; deck: Deck; totalChunks?: number; totalTextLength?: number }> {
        // Validazione client-side
        if (!file) {
            throw new Error('Nessun file selezionato');
        }
        if (file.type !== 'application/pdf') {
            throw new Error('Solo file PDF sono supportati');
        }
        if (file.size > 15 * 1024 * 1024) {
            throw new Error('Il file supera il limite di 15MB');
        }

        // Costruisci FormData per upload
        const formData = new FormData();
        formData.append('pdf', file);
        if (Number.isFinite(options.maxCards) && Number(options.maxCards) > 0) {
            formData.append('maxCards', String(Math.round(Number(options.maxCards))));
        }

        // Chiamata API con FormData
        // NOTA: withCredentials: true per inviare cookies HttpOnly (auth)
        // NOTA: NON impostare Content-Type manualmente, il browser lo fa con boundary
        const csrfHeader = await getCsrfHeader();
        const response = await fetch(`/api${this.baseUrl}/${deckId}/generate-pdf`, {
            method: 'POST',
            body: formData,
            credentials: 'include', // Include cookies per auth
            headers: csrfHeader,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message ||
                errorData.message ||
                `Errore ${response.status}: generazione fallita`
            );
        }

        const result = await response.json();
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
     * Aggiorna il titolo di un deck
     */
    async updateDeckTitle(deckId: string, title: string): Promise<Deck> {
        const response = await apiClient.patch<any>(`${this.baseUrl}/${deckId}`, { title });
        const raw = unwrap(response, 'Errore nell\'aggiornamento del titolo');
        return normalizeDeck(raw);
    }

    /**
     * Aggiorna folderId, examId e/o tags di un deck
     */
    async updateDeckOrganization(deckId: string, updates: { folderId?: string | null; examId?: string | null; tags?: string[] }): Promise<Deck> {
        const response = await apiClient.patch<any>(`${this.baseUrl}/${deckId}`, updates);
        const raw = unwrap(response, 'Errore nell\'aggiornamento');
        return normalizeDeck(raw);
    }

    /**
     * Resetta le carte di tutti i deck associati a un esame
     * @param examId - ID dell'esame
     * @param type - 'all' per reset completo, 'hard-only' per solo carte difficili
     */
    async resetExamCards(examId: string, type: 'all' | 'hard-only'): Promise<{ decksAffected: number; cardsReset: number; type: string }> {
        const response = await apiClient.post<any>(`${this.baseUrl}/exam/${examId}/reset-cards`, { type });
        return unwrap(response, 'Errore nel reset delle carte');
    }

    /**
     * Genera domande AI di approfondimento basate sulle difficoltà segnalate
     * @param examId - ID dell'esame
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
        const formData = new FormData();
        formData.append('questionsFile', questionsFile);

        const csrfHeader = await getCsrfHeader();
        const response = await fetch(`/api${this.baseUrl}/exam-solver/extract-questions`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: csrfHeader,
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
        if (!result.success) {
            throw new Error(
                result.error?.message ||
                result.message ||
                'Estrazione domande fallita'
            );
        }
        return result.data || { questions: [] };
    }

    /**
     * 🤖 Genera risposte per domande selezionate (Livello 1 - Preview)
     * @param sourceFile - File PDF con il materiale di studio
     * @param selectedQuestions - Array di domande selezionate dall'utente
     * @param options - Opzioni { deckId?, title?, examId? }
     * @returns Deck, flashcard con ID e statistiche
     */
    async generateExamAnswers(
        sourceFile: File,
        selectedQuestions: string[],
        options: { deckId?: string; title?: string; examId?: string } = {}
    ): Promise<{ 
        deck: Deck; 
        flashcards: Array<{ id: string; front: string; back: string; found: boolean }>;
        stats: { questionsExtracted: number; answersFound: number; answersNotFound: number; totalFlashcards: number; processingTimeMs: number } 
    }> {
        const formData = new FormData();
        formData.append('sourceFile', sourceFile);
        formData.append('selectedQuestions', JSON.stringify(selectedQuestions));
        
        if (options.deckId) {
            formData.append('deckId', options.deckId);
        }
        if (options.title) {
            formData.append('title', options.title);
        }
        if (options.examId) {
            formData.append('examId', options.examId);
        }

        const csrfHeader = await getCsrfHeader();
        const response = await fetch(`/api${this.baseUrl}/exam-solver/generate-answers`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: csrfHeader,
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
        if (!result.success) {
            throw new Error(
                result.error?.message ||
                result.message ||
                'Generazione risposte fallita'
            );
        }
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
     * @param formData - FormData con questionsFile, sourceFile, deckId (opzionale), title (opzionale), examId (opzionale)
     * @returns Deck e statistiche
     */
    async examSolver(formData: FormData): Promise<{ deck: Deck; stats: { questionsExtracted: number; answersFound: number; answersNotFound: number; totalFlashcards: number; processingTimeMs: number } }> {
        // Chiamata API con FormData
        const csrfHeader = await getCsrfHeader();
        const response = await fetch(`/api${this.baseUrl}/exam-solver`, {
            method: 'POST',
            body: formData,
            credentials: 'include', // Include cookies per auth
            headers: csrfHeader,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message ||
                errorData.message ||
                `Errore ${response.status}: risoluzione esame fallita`
            );
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(
                result.error?.message ||
                result.message ||
                'Risoluzione esame fallita'
            );
        }
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

    /**
     * 💾 Salva il progresso di un esame in corso per pausa/resume
     */
    async saveExamProgress(deckId: string, progressData: {
        examConfig: any;
        currentCardIndex: number;
        stats: { hard: number; good: number; easy: number };
        elapsedSeconds: number;
        answers: Array<{ cardId: string; rating: number; timestamp: Date | string }>;
        sessionCardIds: string[];
        pausedAt?: string;
    }): Promise<{ success: boolean; message: string; pausedAt: Date }> {
        const response = await apiClient.post<any>(`${this.baseUrl}/${deckId}/exam-progress`, progressData);
        return unwrap(response, 'Errore nel salvataggio del progresso');
    }

    /**
     * 📥 Recupera il progresso salvato di un esame
     */
    async getExamProgress(deckId: string): Promise<any | null> {
        const response = await apiClient.get<any>(`${this.baseUrl}/${deckId}/exam-progress`);
        const data = unwrap(response, 'Errore nel recupero del progresso');
        return data || null;
    }

    /**
     * 🗑️ Cancella il progresso salvato di un esame
     */
    async clearExamProgress(deckId: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete<any>(`${this.baseUrl}/${deckId}/exam-progress`);
        return unwrap(response, 'Errore nella cancellazione del progresso');
    }

    /**
     * 🔄 Resetta il progresso di studio di tutte le carte di un deck
     * Riporta ogni carta a status 'new' e azzera i parametri SRS (interval, repetitions, easinessFactor)
     */
    async resetDeckProgress(deckId: string): Promise<Deck> {
        const response = await apiClient.post<any>(`${this.baseUrl}/${deckId}/reset-progress`, {});
        const raw = unwrap(response, 'Errore nel reset del progresso');
        return normalizeDeck(raw);
    }

    /**
     * 🔄 Resetta distrattori AI di tutte le card di un deck
     * Forza la rigenerazione con il nuovo modello/prompt pedagogico
     */
    async resetDistractors(deckId: string): Promise<{
        deckId: string;
        totalCards: number;
        resetCards: number;
        message: string;
    }> {
        const response = await apiClient.post<any>(`${this.baseUrl}/${deckId}/reset-distractors`, {});
        return unwrap(response, 'Errore nel reset dei distrattori');
    }

    async retakeSavedQuiz(deckId: string, quizId: string, strategy: QuizRetakeStrategy = {}): Promise<SavedQuizRetakeResponse> {
        const response = await apiClient.post<any>(`${this.baseUrl}/${deckId}/quizzes/${quizId}/retake-session`, strategy);
        const raw = unwrap(response, 'Errore nel caricamento del quiz per retake');
        return {
            quizId: raw.quizId,
            name: raw.name,
            quizType: raw.quizType === 'true_false' ? 'true_false' : 'multiple_choice',
            questionCount: raw.questionCount,
            cards: Array.isArray(raw.cards) ? raw.cards.map(normalizeCard) : [],
            attempts: Array.isArray(raw.attempts) ? raw.attempts : [],
            strategy: raw?.strategy as QuizRetakeStrategy | undefined,
            session: raw?.session ? normalizeSession(raw.session) : undefined,
        };
    }

    async reviewSavedQuiz(deckId: string, quizId: string): Promise<SavedQuizReviewResponse> {
        const response = await apiClient.get<any>(`${this.baseUrl}/${deckId}/quizzes/${quizId}/review`);
        return unwrap(response, 'Errore nel caricamento della review del quiz');
    }

    async recordQuizAttempt(deckId: string, quizId: string, data: {
        score: number;
        accuracy: number;
        timeSeconds: number;
        wrongQuestionIndices?: number[];
        strategy?: QuizRetakeStrategy;
        results?: Array<{
            questionId: string;
            shownIndex: number;
            selectedAnswer: string;
            correctAnswer: string;
            isCorrect: boolean;
            responseMs?: number;
            skipped?: boolean;
        }>;
    }): Promise<void> {
        const response = await apiClient.post<any>(`${this.baseUrl}/${deckId}/quizzes/${quizId}/attempts`, data);
        unwrap(response, 'Errore nella registrazione del tentativo');
    }
}

export const studyService = new StudyService();
