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
        extractQuestions,
        generateAnswers,
        handleNextFromPreview,
        handleApproveCard,
        handleEditCard,
        handleRegenerateCard,
        handleSaveReview,
        error,
        setError,
        clearError,
        isProcessing,
        canClose,
        handleClose,
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
                                    (deckMode === 'new' && deckTitle.trim() && selectedGoalId) ||
                                    (deckMode === 'existing' && !!selectedDeckId)
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
                                onClose={handleClose}
                                onSuccess={onSuccess}
                            />
                        )}

                        {/* STEP 5: REVIEW ANSWERS */}
                        {currentStep === 'review' && createdDeckId && generatedFlashcards.length > 0 && (
                            <ReviewAnswers
                                flashcards={generatedFlashcards}
                                deckId={createdDeckId}
                                onApprove={handleApproveCard}
                                onEdit={handleEditCard}
                                onRegenerate={handleRegenerateCard}
                                onSave={handleSaveReview}
                                onBack={() => goToStep('progress')}
                            />
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ExamSolverModal;
