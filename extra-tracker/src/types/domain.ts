/**
 * DOMAIN TYPES — Single Source of Truth
 * ========================================
 *
 * Tutte le interfacce di dominio dell'applicazione.
 * I servizi e i componenti devono importare da qui, non ridefinire.
 */

// ==========================================
// AUTH / USER
// ==========================================

export interface User {
    id: string;
    email: string;
    role?: 'user' | 'admin';
    firstName?: string;
    lastName?: string;
    displayName?: string;
    isEmailVerified?: boolean;
    twoFactorEnabled?: boolean;
    createdAt?: string;
}

// ==========================================
// STUDY — CARDS & DECKS
// ==========================================

export type CardStatus = 'new' | 'learning' | 'review' | 'mastered';
export type StudyMode = 'flashcard' | 'quiz' | 'typing' | 'mix' | 'sprint' | 'focus' | 'exam';
export type QuizType = 'multiple_choice' | 'true_false';
export type SessionFocus = 'smart' | 'due' | 'weak' | 'all';
export type SessionLength = 'short' | 'standard' | 'deep';
export type SessionDirection = 'front' | 'back' | 'mixed';
export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type ChatRole = 'user' | 'assistant';

export interface Card {
    id: string;
    front: string;
    back: string;
    canonicalBack?: string;
    quizAnswerVariant?: string;
    options?: string[];
    distractors?: string[];
    aiDistractorsFailed?: boolean;
    distractorExplanations?: Record<string, string>;
    easinessFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: string;
    status: CardStatus;
    isTrueFalse?: boolean;
    correctStatement?: string | null;
    explanation?: string;
    sourceMetadata?: {
        pageNumber: number;
        originalText: string;
    };
}

export interface SavedQuizSnapshot {
    id: string;
    name: string;
    quizType: QuizType;
    questionCount: number;
    sourceCardIds: string[];
    source: 'chapter' | 'repeat' | 'errors' | 'saved';
    createdAt?: string;
    attemptCount?: number;
    lastScore?: number;
    bestScore?: number;
    hasQuestions?: boolean;
}

export interface Deck {
    id: string;
    examId?: string;
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
    pinned?: boolean;
    savedQuizzes?: SavedQuizSnapshot[];
}

// ==========================================
// QUIZ / ATTEMPTS
// ==========================================

export interface QuizAttempt {
    id: string;
    score: number;
    accuracy: number;
    timeSeconds: number;
    completedAt: string;
    strategy?: {
        mode: 'full' | 'weak_first' | 'errors_only' | 'spaced_mix';
        targetCount: number;
        seed?: string;
        params?: {
            wrongWeight?: number;
            recencyWeight?: number;
            difficultyWeight?: number;
            noveltyWeight?: number;
            shuffleStrength?: number;
        };
    };
    wrongQuestionIndices: number[];
}

export interface ExamSavedQuiz extends SavedQuizSnapshot {
    deckId: string;
    deckTitle: string;
    examId?: string | null;
}

// ==========================================
// ORGANIZATION (re-exported from canonical locations)
// ==========================================

export type { Folder } from '../features/study/services/foldersService';
export type { Tag } from '../features/study/services/tagsService';

// ==========================================
// EXAMS (re-exported from canonical location)
// ==========================================

export type { Exam } from '../features/study/types/exam';
