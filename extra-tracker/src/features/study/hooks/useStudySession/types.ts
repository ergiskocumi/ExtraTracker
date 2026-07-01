import type { StudySession, ReviewRating, StudyMode, Card, SessionFocus, SessionLength, SessionDirection, QuizType } from '../../services/studyService';

export interface UseStudySessionParams {
    deckId: string | undefined;
    mode: StudyMode;
    focus: SessionFocus;
    length: SessionLength;
    direction: SessionDirection;
    limit: number;
    questionCount: number;
    timeLimitMinutes: number;
    timeLimitSeconds: number | null;
    examType: string | undefined;
    examDifficulty: string | undefined;
    quizType: QuizType;
    sourceCardIdsKey: string;
    runKey: string;
    quizId: string | null;
    savedQuizId: string | null;
    preloadedSession: StudySession | undefined;
}

export interface UseStudySessionReturn {
    // Session state
    session: StudySession | null;
    isLoading: boolean;
    error: string | null;
    isComplete: boolean;

    // Card navigation
    currentCardIndex: number;
    currentCard: Card | null;
    cardMode: StudyMode;
    displayCard: Card | null;
    isFlashcardMode: boolean;
    shouldReverse: boolean;

    // UI state
    isFlipped: boolean;
    exitDirection: 'left' | 'right' | 'up' | null;
    isSubmitting: boolean;
    showExitConfirm: boolean;
    showResumeModal: boolean;
    savedProgress: any | null;

    // Stats & timer
    stats: { total: number; hard: number; good: number; easy: number };
    elapsedSeconds: number;
    timeLeft: number | null;
    timerWarning: boolean;

    // Wrong answers
    wrongAnswersForReview: Array<{
        cardId: string;
        front: string;
        userAnswer: string;
        back: string;
    }>;

    // Handlers
    handleFlip: () => void;
    handleRate: (
        rating: ReviewRating,
        details?: { userAnswer?: string; correctAnswer?: string; correct?: boolean }
    ) => Promise<void>;
    handleNext: () => void;
    handleBack: () => Promise<void>;
    handleComplete: () => Promise<void>;
    handleResumeExam: () => Promise<void>;
    handleStartFresh: () => Promise<void>;
    handlePauseExam: () => Promise<void>;
    handleRestart: () => void;
    handleStudyErrors: () => void;
    setShowExitConfirm: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface StudyAnswer {
    cardId: string;
    rating: number;
    timestamp: Date;
}

export interface QuizAnswerDetail {
    cardId: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    correct: boolean;
}
