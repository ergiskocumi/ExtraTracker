/**
 * 🗑️ DELETE CARD MODAL - Premium Modal for Confirming Card Deletion
 * ============================================================================
 * 
 * A professionally designed confirmation modal for deleting flashcards.
 * Features glassmorphism, smooth animations, and iOS-style dark theme.
 */

import React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '../../services/studyService';

interface DeleteCardModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback when the modal should be closed */
    onClose: () => void;
    /** Callback when the user confirms deletion */
    onConfirm: () => void;
    /** The card to be deleted (for preview) */
    card: Card | null;
    /** Whether the deletion is in progress */
    isDeleting?: boolean;
}

export const DeleteCardModal: React.FC<DeleteCardModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    card,
    isDeleting = false,
}) => {
    // Handle ESC key press
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isDeleting) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, isDeleting]);

    const handleBackdropClick = React.useCallback((e: React.MouseEvent) => {
        // Only close if clicking the backdrop itself, not the modal content
        if (e.target === e.currentTarget && !isDeleting) {
            onClose();
        }
    }, [onClose, isDeleting]);

    if (!card) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={handleBackdropClick}
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-md rounded-3xl border border-red-500/30 backdrop-blur-xl shadow-2xl"
                            style={{
                                background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
                                boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(239, 68, 68, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3 p-6 border-b border-red-500/20">
                                <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl md:text-2xl font-bold text-white">
                                        Elimina flashcard
                                    </h2>
                                    <p className="text-sm text-red-300/80 mt-1">
                                        Questa azione non può essere annullata
                                    </p>
                                </div>
                                {!isDeleting && (
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95"
                                        aria-label="Chiudi"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                                    Sei sicuro di voler eliminare questa flashcard?
                                </p>

                                {/* Card Preview */}
                                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
                                    {/* Front */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400">
                                                Q
                                            </span>
                                            <span className="text-xs font-semibold text-violet-300">Domanda</span>
                                        </div>
                                        <p className="text-sm text-white/80 line-clamp-2">
                                            {card.front}
                                        </p>
                                    </div>

                                    {/* Back */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
                                                A
                                            </span>
                                            <span className="text-xs font-semibold text-amber-300">Risposta</span>
                                        </div>
                                        <p className="text-sm text-white/80 line-clamp-2">
                                            {card.back}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center gap-3 p-6 border-t border-red-500/20">
                                <button
                                    onClick={onClose}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-sm text-sm font-medium text-slate-300 hover:bg-white/[0.10] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isDeleting}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-red-500/20"
                                >
                                    {isDeleting ? (
                                        <>
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                            />
                                            <span>Eliminazione...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            <span>Elimina</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default DeleteCardModal;
