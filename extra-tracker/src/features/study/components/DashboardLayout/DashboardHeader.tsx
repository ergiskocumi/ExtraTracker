import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Folder, ArrowLeft, Home, BookOpen, CheckCircle, FileText } from 'lucide-react';

interface DashboardHeaderProps {
    onCreateDeck: () => void;
    onExamSolver?: () => void; // Callback per aprire Exam Solver
    selectedFolderName?: string | null;
    onBackToAll?: () => void;
    selectedExamName?: string | null; // Nome dell'esame selezionato
    onBackToExams?: () => void; // Callback per tornare agli esami
    onCompleteExam?: () => void; // Callback per completare l'esame
    selectedExamId?: string | null; // ID dell'esame selezionato (per mostrare il pulsante)
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
    onCreateDeck,
    onExamSolver,
    selectedFolderName,
    onBackToAll,
    selectedExamName,
    onBackToExams,
    onCompleteExam,
    selectedExamId,
}) => {
    const actionButtonBaseClass = `
        exam-header-btn
        flex items-center justify-center gap-2 sm:gap-2.5
        px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl
        font-semibold text-sm sm:text-base
        transition-all touch-manipulation min-h-[44px] sm:min-h-[48px]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/45 focus-visible:ring-offset-2
    `;

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
                {/* Nascondi "Learning & Study" quando c'è un esame selezionato */}
                {!selectedExamName && (
                    <p className="text-[10px] sm:text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">
                        Learning & Study
                    </p>
                )}
                <div className="flex items-center gap-3 sm:gap-4">
                    <AnimatePresence mode="wait">
                        {selectedExamName ? (
                            <motion.div
                                key="exam-name"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="flex items-center gap-2 sm:gap-3 flex-1"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onBackToExams}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-400/30 transition-all group"
                                    aria-label="Torna agli esami"
                                >
                                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white/60 group-hover:text-violet-400 transition-colors" />
                                </motion.button>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                                    {selectedExamName}
                                </h1>
                            </motion.div>
                        ) : selectedFolderName ? (
                            <motion.div
                                key="folder-name"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="flex items-center gap-2 sm:gap-3 flex-1"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onBackToAll}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-400/30 transition-all group"
                                    aria-label="Torna a tutti i mazzi"
                                >
                                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white/60 group-hover:text-violet-400 transition-colors" />
                                </motion.button>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                                    {selectedFolderName}
                                </h1>
                            </motion.div>
                        ) : (
                            <motion.h1
                                key="default-title"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="text-2xl sm:text-3xl md:text-4xl font-bold text-white"
                            >
                                I Tuoi Esami
                            </motion.h1>
                        )}
                    </AnimatePresence>
                </div>
                <p className="text-white/50 mt-1 text-xs sm:text-sm md:text-base">
                    {selectedExamName 
                        ? 'Mazzi per questo esame' 
                        : selectedFolderName 
                            ? 'Esami in questa cartella' 
                            : 'Gestisci i tuoi esami e preparati al meglio'
                    }
                </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
                {/* Pulsante Concludi Esame - Solo quando c'è un esame selezionato */}
                {selectedExamName && selectedExamId && onCompleteExam && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onCompleteExam}
                        className={`${actionButtonBaseClass} exam-header-btn--complete`}
                    >
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="hidden sm:inline">Concludi Esame</span>
                        <span className="sm:hidden">Concludi</span>
                    </motion.button>
                )}
                
                {/* Pulsante Exam Solver */}
                {onExamSolver && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onExamSolver}
                        className={`${actionButtonBaseClass} exam-header-btn--solver`}
                    >
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="hidden sm:inline">Risolvi Esame</span>
                        <span className="sm:hidden">Solver</span>
                    </motion.button>
                )}
                
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onCreateDeck}
                    className={`${actionButtonBaseClass} exam-header-btn--new font-bold md:py-4`}
                >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>Nuovo Esame</span>
                </motion.button>
            </div>
        </div>
    );
};
