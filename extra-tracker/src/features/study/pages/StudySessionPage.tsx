/**
 * 📚 STUDY SESSION PAGE
 *
 * Responsabilità: parsing URL params + layout JSX.
 * Tutta la logica di sessione è delegata a useStudySession.
 */

import { useEffect } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import { FlashcardSkeleton } from '../../../shared/components/skeleton/FlashcardSkeleton';
import { StudyCard } from '../components/Study/StudyCard';
import { StudyProgress } from '../components/Study/StudyProgress';
import { StudyControls } from '../components/Study/StudyControls';
import { SessionComplete } from '../components/Study/SessionComplete';
import { QuizView } from '../components/Study/QuizView';
import { TypingView } from '../components/Study/TypingView';
import type { StudySession, StudyMode, SessionFocus, SessionLength, SessionDirection, QuizType } from '../services/studyService';
import {
    useStudySession,
    STUDY_MODES,
    FOCUS_OPTIONS,
    LENGTH_OPTIONS,
    DIRECTION_OPTIONS,
    LENGTH_TO_LIMIT,
    MODE_LABELS,
} from '../hooks/useStudySession';

// ============================================
// MAIN COMPONENT
// ============================================

export const StudySessionPage: React.FC = () => {
    const { deckId } = useParams<{ deckId: string }>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const locationState = location.state as { preparedSession?: StudySession; preparedAt?: number } | null;
    const preloadedSession = locationState?.preparedSession;

    // Parse URL params
    const requestedMode = (searchParams.get('mode') || 'flashcard').toLowerCase();
    const mode: StudyMode = STUDY_MODES.includes(requestedMode as StudyMode) ? (requestedMode as StudyMode) : 'flashcard';
    const focusParam = (searchParams.get('focus') || 'smart').toLowerCase();
    const baseFocus: SessionFocus = FOCUS_OPTIONS.includes(focusParam as SessionFocus) ? (focusParam as SessionFocus) : 'smart';
    const focus: SessionFocus = mode === 'exam' ? 'all' : mode === 'focus' ? 'weak' : baseFocus;
    const lengthParam = (searchParams.get('length') || 'standard').toLowerCase();
    const length: SessionLength = LENGTH_OPTIONS.includes(lengthParam as SessionLength) ? (lengthParam as SessionLength) : 'standard';
    const directionParam = (searchParams.get('direction') || 'front').toLowerCase();
    const direction: SessionDirection = DIRECTION_OPTIONS.includes(directionParam as SessionDirection) ? (directionParam as SessionDirection) : 'front';
    const questionCount = Number(searchParams.get('questions')) || (mode === 'exam' ? 30 : 0);
    const timeLimitMinutes = Number(searchParams.get('time')) || 0;
    const limit = mode === 'exam'
        ? questionCount
        : mode === 'quiz' && questionCount > 0
            ? questionCount
            : LENGTH_TO_LIMIT[length];
    const timeLimitSeconds = timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null;

    // Exam-specific params
    const examType = searchParams.get('examType') ?? undefined;
    const examDifficulty = searchParams.get('examDifficulty') ?? undefined;
    const quizTypeParam = (searchParams.get('quizType') || 'multiple_choice').toLowerCase();
    const quizType: QuizType = quizTypeParam === 'true_false' ? 'true_false' : 'multiple_choice';
    const sourceCardIdsKey = (searchParams.get('sourceCardIds') || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .join('|');
    const runKey = searchParams.get('run') || 'default';
    const quizId = searchParams.get('quizId') || searchParams.get('savedQuizId');
    const savedQuizId = searchParams.get('savedQuizId') || searchParams.get('quizId');

    // ── Hook ──────────────────────────────────────────────────────────────

    const {
        session,
        isLoading,
        error,
        isComplete,
        currentCardIndex,
        currentCard,
        cardMode,
        displayCard,
        isFlashcardMode,
        shouldReverse,
        isFlipped,
        exitDirection,
        isSubmitting,
        showExitConfirm,
        showResumeModal,
        savedProgress,
        stats,
        elapsedSeconds,
        timeLeft,
        timerWarning,
        wrongAnswersForReview,
        handleFlip,
        handleRate,
        handleNext,
        handleBack,
        // handleComplete,
        handleResumeExam,
        handleStartFresh,
        handlePauseExam,
        handleRestart,
        handleStudyErrors,
        setShowExitConfirm,
    } = useStudySession({
        deckId,
        mode,
        focus,
        length,
        direction,
        limit,
        questionCount,
        timeLimitMinutes,
        timeLimitSeconds,
        examType,
        examDifficulty,
        quizType,
        sourceCardIdsKey,
        runKey,
        quizId,
        savedQuizId,
        preloadedSession,
    });

    // ── Keyboard shortcuts ────────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (isLoading || isComplete || showResumeModal || showExitConfirm) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'Escape') { setShowExitConfirm(true); return; }
            if (!isFlashcardMode) return;
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleFlip(); }
            if (e.key === 'ArrowLeft') handleRate(1).catch(() => {});
            if (e.key === 'ArrowRight') handleRate(4).catch(() => {});
            if (e.key === 'ArrowUp') handleRate(3).catch(() => {});
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isLoading, isComplete, showResumeModal, showExitConfirm, isFlashcardMode, handleFlip, handleRate, setShowExitConfirm]);

    if (isLoading) {
        return (
            <div className="study-session-overlay fixed inset-0 top-[var(--app-header-height,64px)] z-50 bg-theme-base p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-lg space-y-4">
                    <FlashcardSkeleton />
                </div>
            </div>
        );
    }

    // Non mostrare errore se il modal di resume è aperto (session può essere null in quel caso)
    if ((error || !session) && !showResumeModal) {
        return (
            <div className="study-session-overlay fixed inset-0 top-[var(--app-header-height,64px)] z-50 flex flex-col items-center justify-center bg-theme-base gap-4 p-4">
                <p className="text-red-400 text-lg">{error || 'Sessione non trovata'}</p>
                <button
                    onClick={handleBack}
                    className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold transition-colors"
                >
                    Torna al mazzo
                </button>
            </div>
        );
    }

    // Session complete screen
    if (isComplete) {
        return (
            <div className="study-session-overlay fixed inset-0 top-[var(--app-header-height,64px)] z-50 bg-theme-base">
                <SessionComplete
                    totalCards={stats.total}
                    correctCount={stats.good + stats.easy}
                    wrongCount={stats.hard}
                    durationSeconds={elapsedSeconds}
                    onRestart={handleRestart}
                    onBack={handleBack}
                    wrongAnswers={wrongAnswersForReview}
                    isExamMode={mode === 'exam'}
                    isQuizMode={mode === 'quiz'}
                    isTypingMode={mode === 'typing'}
                    onStudyErrors={mode === 'quiz' ? handleStudyErrors : undefined}
                />
            </div>
        );
    }

    // Resume Modal (modale per riprendere esame)
    if (showResumeModal && savedProgress) {
        return (
            <div className="study-resume-overlay fixed inset-0 top-[var(--app-header-height,64px)] z-50 flex items-center justify-center backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="study-resume-panel max-w-lg w-full mx-4 bg-theme-elevated backdrop-blur-xl border border-theme-default rounded-3xl p-8 shadow-theme-lg"
                >
                    <h2 className="text-2xl font-bold text-theme-primary mb-4">Esame in pausa</h2>
                    <p className="text-theme-secondary mb-6 leading-relaxed">
                        Hai un esame in pausa su questo mazzo. Vuoi riprendere da dove avevi lasciato o ricominciare da capo?
                    </p>

                    <div className="study-resume-stats bg-theme-surface rounded-xl p-4 mb-6 space-y-2 text-sm border border-theme-default">
                        <div className="flex justify-between text-theme-muted">
                            <span>Progresso:</span>
                            <span className="text-theme-primary font-medium">
                                {savedProgress.currentCardIndex + 1} / {savedProgress.sessionCardIds?.length || 0}
                            </span>
                        </div>
                        <div className="flex justify-between text-theme-muted">
                            <span>Tempo trascorso:</span>
                            <span className="text-theme-primary font-medium">
                                {Math.floor(savedProgress.elapsedSeconds / 60)}:{(savedProgress.elapsedSeconds % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                        <div className="flex justify-between text-theme-muted">
                            <span>In pausa dal:</span>
                            <span className="text-theme-primary font-medium">
                                {new Date(savedProgress.pausedAt).toLocaleString('it-IT', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleStartFresh}
                            className="flex-1 px-6 py-3 rounded-xl font-semibold
                                bg-theme-surface text-theme-secondary hover:bg-theme-card
                                border border-theme-default hover:border-theme-strong
                                transition-all"
                        >
                            Ricomincia
                        </button>
                        <button
                            onClick={handleResumeExam}
                            className="flex-1 px-6 py-3 rounded-xl font-semibold
                                bg-gradient-to-r from-indigo-500 to-indigo-600 text-white
                                hover:from-indigo-600 hover:to-indigo-700
                                shadow-lg shadow-indigo-500/25
                                transition-all"
                        >
                            Riprendi
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="study-session-root fixed inset-0 top-[var(--app-header-height,64px)] z-50 bg-theme-base flex flex-col">
            {/* Header */}
            <header className="study-session-header flex-none px-4 sm:px-6 py-3 border-b border-theme-default bg-theme-base/80 backdrop-blur-xl z-50">
                <div className="w-full flex items-center gap-3 sm:gap-6">
                    {/* Left: Exit Button */}
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2.5 px-4 py-2 -ml-2 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 hover:border-indigo-500 shadow-sm shadow-indigo-500/10 transition-all duration-300 group active:scale-95"
                        title="Esci dalla sessione"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-sm font-bold tracking-tight">Esci</span>
                    </button>

                    {/* Center: Progress & Stats */}
                    <div className="flex-1 min-w-0">
                        <StudyProgress
                            currentIndex={currentCardIndex}
                            totalCards={session.cards.length}
                            correctCount={stats.good + stats.easy}
                            wrongCount={stats.hard}
                            elapsedSeconds={elapsedSeconds}
                            deckTitle={session.deck.title}
                            mode={MODE_LABELS[mode]}
                        />
                    </div>

                    {/* Right: Timer & Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Mix/Exam mode: badge tipo carta corrente */}
                        {(mode === 'mix' || mode === 'exam') && currentCard && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                cardMode === 'typing'
                                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                                    : cardMode === 'quiz'
                                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}>
                                <span aria-hidden>
                                    {cardMode === 'typing' ? '⌨️' : cardMode === 'quiz' ? '❓' : '🃏'}
                                </span>
                                <span className="hidden sm:inline">
                                    {cardMode === 'typing' ? 'Typing' : cardMode === 'quiz' ? 'Quiz' : 'Flashcard'}
                                </span>
                            </div>
                        )}

                        {/* Countdown Timer (if limit set) */}
                        {timeLeft !== null && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-mono tabular-nums ${
                                timerWarning
                                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse'
                                    : 'border-theme-default bg-theme-surface text-theme-secondary'
                            }`}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        )}

                        {/* Pause Button (Exam Mode) */}
                        {mode === 'exam' && (
                            <button
                                onClick={handlePauseExam}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 transition-all"
                            >
                                Pausa
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {isFlashcardMode && displayCard && (
                        <motion.div
                            key={currentCard?.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
                        >
                            <StudyCard
                                card={displayCard}
                                isFlipped={isFlipped}
                                onFlip={handleFlip}
                                cardNumber={currentCardIndex + 1}
                                totalCards={session.cards.length}
                                exitDirection={exitDirection}
                            />
                        </motion.div>
                    )}

                    {cardMode === 'quiz' && currentCard && (
                        <motion.div
                            key={currentCard.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="absolute inset-0 flex flex-col p-2 sm:p-4 md:p-6 lg:p-8"
                        >
                            <QuizView
                                card={currentCard}
                                question={currentCard.front}
                                options={currentCard.options ?? []}
                                correctAnswer={currentCard.back}
                                distractorExplanations={currentCard.distractorExplanations}
                                isSubmitting={isSubmitting}
                                onSubmitReview={handleRate}
                                onNext={handleNext}
                                isTrueFalse={currentCard.isTrueFalse ?? false}
                                correctStatement={currentCard.correctStatement}
                                explanation={currentCard.explanation}
                                currentIndex={currentCardIndex + 1}
                                totalQuestions={session.cards.length}
                            />
                        </motion.div>
                    )}

                    {cardMode === 'typing' && displayCard && (
                        <motion.div
                            key={currentCard?.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="absolute inset-0 flex flex-col p-3 sm:p-6 lg:p-8"
                        >
                            <TypingView
                                card={currentCard!}
                                question={displayCard.front}
                                answer={displayCard.back}
                                isSubmitting={isSubmitting}
                                onVerify={async (answer) => {
                                    const expected = shouldReverse ? currentCard!.front : currentCard!.back;
                                    return { correct: answer.toLowerCase().trim() === expected.toLowerCase().trim(), similarity: 1 };
                                }}
                                onSubmitReview={handleRate}
                                onNext={handleNext}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Controls */}
            {isFlashcardMode && (
                <footer className="study-session-footer flex-none border-t border-theme-default bg-theme-base backdrop-blur-xl">
                    {/* Titolo mazzo — sempre visibile, thumb zone friendly */}
                    <div className="px-4 sm:px-6 pt-2 pb-1 flex items-center justify-center">
                        <span className="text-xs text-theme-muted truncate max-w-[240px]">{session.deck.title}</span>
                    </div>
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                        <StudyControls
                            onRate={handleRate}
                            disabled={isSubmitting}
                            visible={isFlipped}
                        />
                    </div>
                </footer>
            )}

            {/* Conferma uscita sessione */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-modal-backdrop flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-theme-elevated border border-theme-default shadow-theme-lg p-6 space-y-4">
                        <div className="text-center">
                            <p className="text-base font-semibold text-theme-primary">Uscire dalla sessione?</p>
                            <p className="text-sm text-theme-muted mt-1">Il progresso di questa sessione non verrà salvato.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 min-h-[44px] rounded-xl border border-theme-default text-theme-secondary hover:text-theme-primary hover:bg-theme-surface font-medium transition-all"
                            >
                                Continua
                            </button>
                            <button
                                onClick={handleBack}
                                className="flex-1 min-h-[44px] rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-all"
                            >
                                Esci
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudySessionPage;
