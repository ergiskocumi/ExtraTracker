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
import { examSolverButtonClass } from '../../utils/studyButtonClasses';

// ============================================
// COMPONENT
// ============================================

export const ExamSolverModal: React.FC<ExamSolverModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    existingDecks = [],
    examId,
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
        selectedExamId,
        setSelectedExamId,
        exams,
        isLoadingExams,
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
        examId,
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
                        className="fixed inset-0 z-modal-backdrop flex items-center justify-center p-4"
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-theme-overlay backdrop-blur-sm" />

                        {/* Dialog */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-theme-elevated backdrop-blur-xl rounded-2xl border border-theme-default p-6 max-w-md w-full shadow-theme-lg"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-theme-primary">Sessione Precedente Trovata</h3>
                                    <p className="text-sm text-theme-secondary">
                                        {cachedSession.extractedQuestions?.length || 0} domande,{' '}
                                        step: {cachedSession.step}
                                    </p>
                                </div>
                            </div>

                            <p className="text-theme-secondary text-sm mb-6">
                                Hai una sessione Exam Solver non completata. Vuoi riprendere da dove avevi lasciato?
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        restoreFromCache(cachedSession);
                                    }}
                                    className={examSolverButtonClass('infoSoft', 'flex-1 px-4 py-2.5 rounded-xl font-medium')}
                                >
                                    Ripristina Sessione
                                </button>
                                <button
                                    onClick={() => {
                                        resetToDefault();
                                    }}
                                    className={examSolverButtonClass('neutral', 'flex-1 px-4 py-2.5 rounded-xl font-medium')}
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
                    className="absolute inset-0 bg-theme-overlay"
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
                    className="relative w-full max-w-2xl bg-theme-elevated backdrop-blur-3xl rounded-3xl border border-theme-default shadow-theme-lg overflow-hidden"
                    style={{
                        WebkitBackdropFilter: 'blur(50px)',
                        backdropFilter: 'blur(50px)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-theme-default bg-theme-surface">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-theme-surface border border-theme-default">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-theme-primary">Exam Solver</h2>
                                <p className="text-xs text-theme-secondary">Estrai domande e genera risposte</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={!canClose}
                            className={examSolverButtonClass(
                                'icon',
                                'p-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <StepIndicator currentStep={currentStep} />

                    {/* Content */}
                    <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
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
                                        className={examSolverButtonClass(
                                            'primary',
                                            'w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2'
                                        )}
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
                                selectedExamId={selectedExamId}
                                setSelectedExamId={setSelectedExamId}
                                exams={exams}
                                isLoadingExams={isLoadingExams}
                                existingDecks={existingDecks}
                                error={error}
                                onBack={() => goToStep('preview')}
                                onGenerate={generateAnswers}
                                canGenerate={
                                    !!(
                                        (deckMode === 'new' && deckTitle.trim()) ||
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
                                    <p className="text-theme-secondary">Caricamento risposte generate...</p>
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
