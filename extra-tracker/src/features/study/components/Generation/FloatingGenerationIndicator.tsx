/**
 * 🎯 FLOATING GENERATION INDICATOR - Theme Aware
 * 
 * Componente che appare in alto a destra quando ci sono job di generazione
 * attivi in background. Supporta tema chiaro e scuro.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, 
    X, 
    ChevronDown, 
    ChevronUp, 
    CheckCircle2, 
    AlertCircle,
    Clock,
    FileText,
    Zap
} from 'lucide-react';
import { useFlashcardGeneration, type GenerationJob } from '../../context/FlashcardGenerationContext';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

const getStepIcon = (step: GenerationJob['step']) => {
    switch (step) {
        case 'uploading':
            return <FileText className="w-4 h-4" />;
        case 'analyzing':
            return <Sparkles className="w-4 h-4" />;
        case 'processing':
            return <Clock className="w-4 h-4" />;
        case 'generating':
            return <Zap className="w-4 h-4" />;
        case 'completed':
            return <CheckCircle2 className="w-4 h-4" />;
        case 'error':
            return <AlertCircle className="w-4 h-4" />;
        default:
            return <Sparkles className="w-4 h-4" />;
    }
};

const getStepColor = (step: GenerationJob['step']): string => {
    switch (step) {
        case 'uploading':
            return 'text-blue-500 dark:text-blue-400';
        case 'analyzing':
            return 'text-violet-500 dark:text-violet-400';
        case 'processing':
            return 'text-indigo-500 dark:text-indigo-400';
        case 'generating':
            return 'text-amber-500 dark:text-amber-400';
        case 'completed':
            return 'text-emerald-500 dark:text-emerald-400';
        case 'error':
            return 'text-red-500 dark:text-red-400';
        default:
            return 'text-primary-500 dark:text-primary-400';
    }
};

const getStepBgColor = (step: GenerationJob['step']): string => {
    switch (step) {
        case 'uploading':
            return 'bg-blue-500/15 border-blue-500/25 dark:bg-blue-500/20 dark:border-blue-500/30';
        case 'analyzing':
            return 'bg-violet-500/15 border-violet-500/25 dark:bg-violet-500/20 dark:border-violet-500/30';
        case 'processing':
            return 'bg-indigo-500/15 border-indigo-500/25 dark:bg-indigo-500/20 dark:border-indigo-500/30';
        case 'generating':
            return 'bg-amber-500/15 border-amber-500/25 dark:bg-amber-500/20 dark:border-amber-500/30';
        case 'completed':
            return 'bg-emerald-500/15 border-emerald-500/25 dark:bg-emerald-500/20 dark:border-emerald-500/30';
        case 'error':
            return 'bg-red-500/15 border-red-500/25 dark:bg-red-500/20 dark:border-red-500/30';
        default:
            return 'bg-primary-500/15 border-primary-500/25 dark:bg-primary-500/20 dark:border-primary-500/30';
    }
};

// ==========================================
// SINGLE JOB CARD
// ==========================================

interface JobCardProps {
    job: GenerationJob;
    isExpanded: boolean;
    onToggle: () => void;
    onRemove: () => void;
    onOpenModal: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, isExpanded, onToggle, onRemove, onOpenModal }) => {
    const isCompleted = job.step === 'completed';
    const isError = job.step === 'error';
    const isActive = !isCompleted && !isError;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
                relative overflow-hidden rounded-xl border backdrop-blur-xl
                ${isActive 
                    ? 'bg-theme-elevated border-theme-default shadow-theme-md' 
                    : 'bg-theme-surface border-theme-subtle'
                }
            `}
        >
            {/* Progress bar for active jobs */}
            {isActive && job.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-surface">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            )}

            {/* Header - Always visible */}
            <div 
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={onToggle}
            >
                {/* Status Icon */}
                <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${getStepBgColor(job.step)} ${getStepColor(job.step)}
                `}>
                    {isActive ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                            {getStepIcon(job.step)}
                        </motion.div>
                    ) : (
                        getStepIcon(job.step)
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-theme-primary truncate">
                        {job.deckTitle}
                    </p>
                    <p className="text-xs text-theme-muted truncate">
                        {isCompleted 
                            ? `${job.generatedCount} flashcard generate`
                            : isError 
                                ? 'Errore nella generazione'
                                : job.message || 'In elaborazione...'
                        }
                    </p>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2">
                    {isActive && (
                        <span className="text-xs text-theme-muted">
                            {formatTime(job.elapsedTime)}
                        </span>
                    )}
                    {isActive ? (
                        <ChevronDown className={`w-4 h-4 text-theme-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            className="p-1 rounded hover:bg-theme-surface text-theme-muted hover:text-theme-primary transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && isActive && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-theme-subtle"
                    >
                        <div className="p-3 space-y-3">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 rounded-lg bg-theme-surface border border-theme-subtle">
                                    <p className="text-[10px] text-theme-muted uppercase tracking-wider">Progresso</p>
                                    <p className="text-sm font-medium text-theme-primary">{job.progress}%</p>
                                </div>
                                <div className="p-2 rounded-lg bg-theme-surface border border-theme-subtle">
                                    <p className="text-[10px] text-theme-muted uppercase tracking-wider">Generate</p>
                                    <p className="text-sm font-medium text-theme-primary">{job.generatedCount}</p>
                                </div>
                                {job.totalChunks > 0 && (
                                    <div className="p-2 rounded-lg bg-theme-surface border border-theme-subtle">
                                        <p className="text-[10px] text-theme-muted uppercase tracking-wider">Sezioni</p>
                                        <p className="text-sm font-medium text-theme-primary">{job.currentChunk} / {job.totalChunks}</p>
                                    </div>
                                )}
                                <div className="p-2 rounded-lg bg-theme-surface border border-theme-subtle">
                                    <p className="text-[10px] text-theme-muted uppercase tracking-wider">Tempo</p>
                                    <p className="text-sm font-medium text-theme-primary">{formatTime(job.elapsedTime)}</p>
                                </div>
                            </div>

                            {/* Current Topic */}
                            {job.currentTopic && (
                                <div className="p-2 rounded-lg bg-primary-500/10 border border-primary-500/20">
                                    <p className="text-[10px] text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">In elaborazione</p>
                                    <p className="text-xs text-theme-secondary truncate">{job.currentTopic}</p>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={onOpenModal}
                                className="w-full py-2 rounded-lg bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/30 text-primary-700 dark:text-primary-300 text-xs font-medium transition-colors"
                            >
                                Apri dettagli
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const AUTO_DISMISS_COMPLETED_MS = 5000;

export const FloatingGenerationIndicator: React.FC = () => {
    const { 
        jobs, 
        hasActiveJobs, 
        hasCompletedJobs, 
        isModalOpen,
        openModal, 
        removeJob, 
        clearCompleted 
    } = useFlashcardGeneration();
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
    const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-chiudi il pannello quando non ci sono più job attivi (tutto completato/errore)
    useEffect(() => {
        if (!hasActiveJobs && hasCompletedJobs) {
            autoDismissTimerRef.current = setTimeout(() => {
                clearCompleted();
                autoDismissTimerRef.current = null;
            }, AUTO_DISMISS_COMPLETED_MS);
        } else {
            if (autoDismissTimerRef.current) {
                clearTimeout(autoDismissTimerRef.current);
                autoDismissTimerRef.current = null;
            }
        }
        return () => {
            if (autoDismissTimerRef.current) {
                clearTimeout(autoDismissTimerRef.current);
            }
        };
    }, [hasActiveJobs, hasCompletedJobs, clearCompleted]);

    const toggleJobExpanded = useCallback((jobId: string) => {
        setExpandedJobs(prev => {
            const next = new Set(prev);
            if (next.has(jobId)) {
                next.delete(jobId);
            } else {
                next.add(jobId);
            }
            return next;
        });
    }, []);

    const handleOpenModal = useCallback((jobId: string) => {
        openModal(jobId);
        setIsExpanded(false);
    }, [openModal]);

    const activeJobs = jobs.filter(j => j.step !== 'completed' && j.step !== 'error');
    const completedJobs = jobs.filter(j => j.step === 'completed' || j.step === 'error');

    // Nascondi l'indicatore quando il modal Generator Lab è aperto (non minimizzato) o non ci sono job
    if (isModalOpen || jobs.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-20 right-4 z-40 w-80"
        >
            {/* Collapsed View - Summary */}
            {!isExpanded ? (
                <motion.button
                    onClick={() => setIsExpanded(true)}
                    className={`
                        w-full p-3 rounded-xl border backdrop-blur-xl
                        flex items-center gap-3
                        ${hasActiveJobs 
                            ? 'bg-theme-elevated border-primary-500/30 shadow-theme-md shadow-primary-500/10' 
                            : 'bg-theme-surface border-theme-default'
                        }
                        hover:border-primary-500/50 transition-colors
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {/* Icon */}
                    <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center
                        ${hasActiveJobs ? 'bg-primary-500/15 dark:bg-primary-500/20' : 'bg-emerald-500/15 dark:bg-emerald-500/20'}
                    `}>
                        {hasActiveJobs ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            >
                                <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </motion.div>
                        ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-theme-primary">
                            {hasActiveJobs 
                                ? `${activeJobs.length} generazione${activeJobs.length > 1 ? 'i' : ''} in corso`
                                : 'Generazioni completate'
                            }
                        </p>
                        <p className="text-xs text-theme-muted">
                            {hasActiveJobs 
                                ? 'Clicca per vedere i dettagli'
                                : `${completedJobs.length} completate`
                            }
                        </p>
                    </div>

                    {/* Expand Icon */}
                    <ChevronUp className="w-4 h-4 text-theme-muted" />
                </motion.button>
            ) : (
                /* Expanded View - Job List */
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-theme-elevated backdrop-blur-xl rounded-xl border border-theme-default shadow-theme-lg overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-theme-subtle">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-medium text-theme-primary">Generazione Flashcard</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {hasCompletedJobs && (
                                <button
                                    onClick={clearCompleted}
                                    className="p-1.5 rounded-lg hover:bg-theme-surface text-theme-muted hover:text-theme-primary transition-colors"
                                    title="Pulisci completate"
                                >
                                    <span className="text-xs">Pulisci</span>
                                </button>
                            )}
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-1.5 rounded-lg hover:bg-theme-surface text-theme-muted hover:text-theme-primary transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Job List */}
                    <div className="max-h-96 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        <AnimatePresence mode="popLayout">
                            {/* Active Jobs First */}
                            {activeJobs.map(job => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    isExpanded={expandedJobs.has(job.id)}
                                    onToggle={() => toggleJobExpanded(job.id)}
                                    onRemove={() => removeJob(job.id)}
                                    onOpenModal={() => handleOpenModal(job.id)}
                                />
                            ))}

                            {/* Completed Jobs */}
                            {completedJobs.map(job => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    isExpanded={false}
                                    onToggle={() => {}}
                                    onRemove={() => removeJob(job.id)}
                                    onOpenModal={() => handleOpenModal(job.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default FloatingGenerationIndicator;
