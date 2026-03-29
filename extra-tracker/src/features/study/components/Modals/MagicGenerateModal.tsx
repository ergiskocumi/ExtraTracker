/**
 * ✨ MAGIC GENERATE MODAL V2 - Theme Aware con supporto Light/Dark
 *
 * Design completamente rinnovato con:
 * - Supporto tema chiaro e scuro
 * - Glassmorphism marcato
 * - Tempo stimato visibile
 * - Effetti di analisi AI coinvolgenti
 * - Animazioni fluide e naturali
 * - Supporto per generazione in background
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Minimize2 } from 'lucide-react';
import { useMagicGenerate } from '../../hooks/useMagicGenerate';
import { StepUpload } from './MagicGenerateModal.steps/StepUpload';
import { StepProgress } from './MagicGenerateModal.steps/StepProgress';
import { StepComplete } from './MagicGenerateModal.steps/StepComplete';

interface MagicGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    deckId: string;
    deckTitle: string;
    onSuccess: (generatedCount: number) => void | Promise<void>;
}

export const MagicGenerateModal: React.FC<MagicGenerateModalProps> = ({
    isOpen,
    onClose,
    deckId,
    deckTitle,
    onSuccess,
}) => {
    const {
        // State
        file,
        isDragging,
        progress,
        error,
        logs,
        logsEndRef,
        fileInputRef,

        // Derived
        isProcessing,
        isCompleted,
        elapsedSeconds,
        currentStepPosition,
        cardsPerMinute,
        pipelineProgress,
        estimatedAutoCards,
        estimatedDuration,

        // Handlers
        handleClose,
        handleDismissToBackground,
        handleFileSelect,
        handleRemoveFile,
        handleChangeFile,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        handleSubmit,
        handleRetry,
        getPhaseState,
        formatTime,
    } = useMagicGenerate({ isOpen, deckId, deckTitle, onSuccess, onClose });

    if (!isOpen) return null;

    const showComplete = isCompleted || progress.step === 'error';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={handleClose}
                style={{ backgroundColor: 'var(--bg-overlay)' }}
            >
                {/* Backdrop blur */}
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(30px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0"
                    style={{ WebkitBackdropFilter: 'blur(30px)' }}
                />

                {/* Modal Window - Theme Aware */}
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
                    className="relative w-full max-w-5xl bg-theme-elevated rounded-3xl border border-theme-default shadow-theme-lg overflow-hidden"
                    style={{
                        WebkitBackdropFilter: 'blur(34px)',
                        backdropFilter: 'blur(34px)',
                    }}
                >
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-primary-500/20 to-cyan-500/10 blur-3xl" />
                        <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-500/20 to-rose-500/10 blur-3xl" />
                    </div>

                    {/* Header */}
                    <div className="relative flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-theme-elevated/90">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-theme-primary tracking-tight">
                                    Silvi AI Generator Lab
                                </h2>
                                <p className="text-xs text-theme-muted uppercase tracking-[0.16em]">
                                    Deck: {deckTitle}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isProcessing && (
                                <button
                                    onClick={handleDismissToBackground}
                                    className="p-2 rounded-lg hover:bg-theme-surface transition-colors group"
                                    title="Continua in background"
                                >
                                    <Minimize2 className="w-4 h-4 text-theme-muted group-hover:text-theme-primary" />
                                </button>
                            )}
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
                            >
                                <X className="w-5 h-5 text-theme-muted hover:text-theme-primary" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="relative p-5 md:p-7 space-y-6 bg-theme-elevated/40">
                        {/* Background Mode Banner */}
                        {isProcessing && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-3"
                            >
                                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                                <p className="text-sm text-primary-700 dark:text-primary-300 flex-1">
                                    Generazione in corso: puoi minimizzare e continuare ad usare l&apos;app.
                                </p>
                                <button
                                    onClick={handleDismissToBackground}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-700 dark:text-primary-300 transition-colors"
                                >
                                    Minimizza
                                </button>
                            </motion.div>
                        )}

                        {/* Step: Idle — Upload UI */}
                        {progress.step === 'idle' && (
                            <StepUpload
                                file={file}
                                isDragging={isDragging}
                                error={error}
                                estimatedAutoCards={estimatedAutoCards}
                                estimatedDuration={estimatedDuration}
                                fileInputRef={fileInputRef}
                                onFileSelect={handleFileSelect}
                                onRemoveFile={handleRemoveFile}
                                onChangeFile={handleChangeFile}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onSubmit={handleSubmit}
                            />
                        )}

                        {/* Step: Processing — Progress + Logs */}
                        {isProcessing && (
                            <StepProgress
                                progress={progress}
                                logs={logs}
                                logsEndRef={logsEndRef}
                                pipelineProgress={pipelineProgress}
                                currentStepPosition={currentStepPosition}
                                elapsedSeconds={elapsedSeconds}
                                cardsPerMinute={cardsPerMinute}
                                getPhaseState={getPhaseState}
                                formatTime={formatTime}
                            />
                        )}

                        {/* Step: Completed or Error */}
                        {showComplete && (
                            <StepComplete
                                progress={progress}
                                error={error}
                                elapsedSeconds={elapsedSeconds}
                                formatTime={formatTime}
                                onClose={onClose}
                                onRetry={handleRetry}
                            />
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MagicGenerateModal;
