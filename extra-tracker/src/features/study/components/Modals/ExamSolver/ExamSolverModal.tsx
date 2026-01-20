/**
 * 🎯 EXAM SOLVER MODAL - Risolve esami estraendo domande e generando risposte
 * 
 * Design in stile macOS con glassmorphism, seguendo MagicGenerateModal
 * Componente puramente presentazionale - tutta la logica è in useExamSolver
 */

import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileQuestion, 
    BookOpen, 
    X, 
    Sparkles,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { DualDropzone } from './DualDropzone';
import { QuestionsPreview } from './QuestionsPreview';
import { useExamSolver } from './useExamSolver';
import { StepIndicator } from './components/StepIndicator';
import { DeckConfigForm } from './components/DeckConfigForm';
import { ProgressView } from './components/ProgressView';
import { ReviewAnswers } from './components/ReviewAnswers';
import type { ExamSolverModalProps, DropzoneConfig } from './ExamSolverModal.types';

// ============================================
// COMPONENT
// ============================================

export const ExamSolverModal: React.FC<ExamSolverModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    existingDecks = [],
    goalId,
    preselectedDeckId,
}) => {
    // Use custom hook for all logic
    const {
        currentStep,
        goToStep,
        questionsFile,
        sourceFile,
        setQuestionsFile,
        setSourceFile,
        extractedQuestions,
        selectedQuestions,
        setSelectedQuestions,
        deckMode,
        setDeckMode,
        deckTitle,
        setDeckTitle,
        selectedDeckId,
        setSelectedDeckId,
        selectedGoalId,
        setSelectedGoalId,
        goals,
        isLoadingGoals,
        progressStep,
        progressMessage,
        progressCurrent,
        progressTotal,
        currentQuestion,
        stats,
        createdDeckId,
        generatedFlashcards,
        sourceFileUrl,
        extractQuestions,
        generateAnswers,
        handleNextFromPreview,
        handleEditCard,
        handleRegenerateCard,
        handleSaveReview,
        handleCancelGeneration,
        error,
        setError,
        clearError,
        isProcessing,
        canClose,
        handleClose,
        showRestorePrompt,
        cachedSession,
        restoreFromCache,
        resetToDefault,
    } = useExamSolver({
        isOpen,
        existingDecks,
        goalId,
        preselectedDeckId,
        onSuccess,
        onClose,
    });

    // Dropzone configurations
    const questionsConfig: DropzoneConfig = {
        id: 'questions',
        label: "📝 Domande d'Esame",
        icon: FileQuestion,
        acceptedTypes: ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        acceptedExtensions: ['.pdf', '.txt', '.docx'],
        file: questionsFile,
        onFileSelect: setQuestionsFile,
        onFileRemove: () => setQuestionsFile(null),
    };

    const sourceConfig: DropzoneConfig = {
        id: 'source',
        label: '📚 Materiale di Studio',
        icon: BookOpen,
        acceptedTypes: ['application/pdf'],
        acceptedExtensions: ['.pdf'],
        file: sourceFile,
        onFileSelect: setSourceFile,
        onFileRemove: () => setSourceFile(null),
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Restore Session Prompt */}
            <AnimatePresence>
                {showRestorePrompt && cachedSession && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

                        {/* Dialog */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-white/10 p-6 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Sessione Precedente Trovata</h3>
                                    <p className="text-sm text-white/60">
                                        {cachedSession.extractedQuestions?.length || 0} domande,{' '}
                                        step: {cachedSession.step}
                                    </p>
                                </div>
                            </div>

                            <p className="text-white/80 text-sm mb-6">
                                Hai una sessione Exam Solver non completata. Vuoi riprendere da dove avevi lasciato?
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        restoreFromCache(cachedSession);
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                                >
                                    Ripristina Sessione
                                </button>
                                <button
                                    onClick={() => {
                                        resetToDefault();
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors border border-white/10"
                                >
                                    Inizia Nuova
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Modal */}
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={handleClose}
                >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(30px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-black/85"
                    style={{ WebkitBackdropFilter: 'blur(30px)' }}
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl bg-zinc-950/98 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl overflow-hidden"
                    style={{
                        WebkitBackdropFilter: 'blur(50px)',
                        backdropFilter: 'blur(50px)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-950/80">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white/10 border border-white/20">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Exam Solver</h2>
                                <p className="text-xs text-white/60">Estrai domande e genera risposte</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={!canClose}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-5 h-5 text-white/60" />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <StepIndicator currentStep={currentStep} />

                    {/* Content */}
                    <div className="p-6 space-y-6 bg-zinc-950/40 max-h-[80vh] overflow-y-auto">
                        {/* STEP 1: UPLOAD */}
                        {currentStep === 'upload' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <DualDropzone
                                    questionsConfig={questionsConfig}
                                    sourceConfig={sourceConfig}
                                    error={error}
                                    onError={setError}
                                />

                                {questionsFile && sourceFile && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={extractQuestions}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all flex items-center justify-center gap-2"
                                    >
                                        Avanti
                                        <ChevronRight className="w-4 h-4" />
                                    </motion.button>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 2: PREVIEW DOMANDE (Livello 1) */}
                        {currentStep === 'preview' && (
                            <QuestionsPreview
                                questions={extractedQuestions}
                                selectedIndices={selectedQuestions}
                                onSelectionChange={setSelectedQuestions}
                                onBack={() => goToStep('upload')}
                                onNext={handleNextFromPreview}
                                error={error}
                                isLoading={progressStep === 'extracting'}
                            />
                        )}

                        {/* STEP 3: CONFIGURAZIONE */}
                        {currentStep === 'config' && (
                            <DeckConfigForm
                                deckMode={deckMode}
                                setDeckMode={setDeckMode}
                                deckTitle={deckTitle}
                                setDeckTitle={setDeckTitle}
                                selectedDeckId={selectedDeckId}
                                setSelectedDeckId={setSelectedDeckId}
                                selectedGoalId={selectedGoalId}
                                setSelectedGoalId={setSelectedGoalId}
                                goals={goals}
                                isLoadingGoals={isLoadingGoals}
                                existingDecks={existingDecks}
                                error={error}
                                onBack={() => goToStep('preview')}
                                onGenerate={generateAnswers}
                                canGenerate={
                                    !!(
                                        (deckMode === 'new' && deckTitle.trim() && selectedGoalId) ||
                                        (deckMode === 'existing' && selectedDeckId)
                                    )
                                }
                            />
                        )}

                        {/* STEP 4: PROGRESS */}
                        {currentStep === 'progress' && (
                            <ProgressView
                                progressStep={progressStep}
                                progressMessage={progressMessage}
                                progressCurrent={progressCurrent}
                                progressTotal={progressTotal}
                                currentQuestion={currentQuestion}
                                isProcessing={isProcessing}
                                stats={stats}
                                generatedFlashcards={generatedFlashcards}
                                createdDeckId={createdDeckId}
                                error={error}
                                onRetry={() => {
                                    goToStep('config');
                                    clearError();
                                }}
                                onCancel={handleCancelGeneration}
                                onClose={handleClose}
                                onSuccess={onSuccess}
                            />
                        )}

                        {/* STEP 5: REVIEW ANSWERS */}
                        {currentStep === 'review' && createdDeckId && (
                            generatedFlashcards.length > 0 ? (
                                <ReviewAnswers
                                    flashcards={generatedFlashcards}
                                    deckId={createdDeckId}
                                    sourceFileUrl={sourceFileUrl || undefined}
                                    onEdit={handleEditCard}
                                    onRegenerate={handleRegenerateCard}
                                    onSave={handleSaveReview}
                                    onBack={() => goToStep('progress')}
                                />
                            ) : (
                                <div className="space-y-4 text-center py-8">
                                    <p className="text-white/60">Caricamento risposte generate...</p>
                                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                                </div>
                            )
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
        </>
    );
};

export default ExamSolverModal;
