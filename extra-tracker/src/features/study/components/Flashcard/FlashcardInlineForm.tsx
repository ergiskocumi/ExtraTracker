/**
 * ➕ FLASHCARD INLINE FORM - Inline Form for Adding New Flashcards
 * ============================================================================
 * 
 * An inline form component that appears directly in the list/grid when adding
 * a new flashcard. Designed to look like a flashcard but with editable inputs.
 * No backdrop/overlay - allows PDF scrolling while typing.
 */

import React, { useState, useEffect, useRef } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface FlashcardInlineFormProps {
    /** Callback when the form is saved */
    onSave: (front: string, back: string) => Promise<void>;
    /** Callback when the form is cancelled */
    onCancel: () => void;
    /** Optional position index for display */
    position?: number;
}

export const FlashcardInlineForm: React.FC<FlashcardInlineFormProps> = ({
    onSave,
    onCancel,
    position,
}) => {
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const frontTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus the front input on mount
    useEffect(() => {
        if (frontTextareaRef.current) {
            frontTextareaRef.current.focus();
        }
    }, []);

    const handleSave = async () => {
        const trimmedFront = front.trim();
        const trimmedBack = back.trim();

        if (!trimmedFront || !trimmedBack || isSaving) {
            return;
        }

        setIsSaving(true);
        try {
            await onSave(trimmedFront, trimmedBack);
        } catch (error) {
            console.error('Error saving card:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = front.trim().length > 0 && back.trim().length > 0 && !isSaving;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="group relative rounded-2xl md:rounded-3xl border-2 border-dashed border-violet-500/40 hover:border-violet-500/60 backdrop-blur-xl p-4 md:p-5 transition-all duration-300"
            style={{
                background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
                boxShadow: '0 8px 30px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(139, 92, 246, 0.2)',
            }}
        >
            <div className="space-y-4">
                {/* Fronte Input */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 backdrop-blur-sm flex items-center justify-center text-xs font-semibold text-violet-400 flex-shrink-0 shadow-[0_0_10px_rgb(139,92,246,0.2)]">
                            Q
                        </div>
                        <label className="text-xs font-medium text-violet-300">
                            Domanda (Fronte)
                        </label>
                    </div>
                    <textarea
                        ref={frontTextareaRef}
                        value={front}
                        onChange={(e) => setFront(e.target.value)}
                        placeholder="Inserisci la domanda..."
                        rows={3}
                        className="w-full resize-y min-h-[80px] p-3 rounded-xl text-sm md:text-base bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60 transition-all duration-300"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                        }}
                    />
                </div>

                {/* Retro Input */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm flex items-center justify-center text-xs font-semibold text-amber-400 flex-shrink-0 shadow-[0_0_10px_rgb(245,158,11,0.2)]">
                            A
                        </div>
                        <label className="text-xs font-medium text-amber-300">
                            Risposta (Retro)
                        </label>
                    </div>
                    <textarea
                        value={back}
                        onChange={(e) => setBack(e.target.value)}
                        placeholder="Inserisci la risposta..."
                        rows={4}
                        className="w-full resize-y min-h-[100px] p-3 rounded-xl text-sm md:text-base bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60 transition-all duration-300"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                        }}
                    />
                </div>

                {/* Action Bar */}
                <div className="flex items-center gap-3 pt-3 border-t border-white/[0.08]">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-sm text-sm font-medium text-slate-300 hover:bg-white/[0.10] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        <FiX className="w-4 h-4" />
                        <span className="hidden sm:inline">Annulla</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-violet-500/20"
                    >
                        {isSaving ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                />
                                <span>Salvataggio...</span>
                            </>
                        ) : (
                            <>
                                <FiCheck className="w-4 h-4" />
                                <span>Salva</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default FlashcardInlineForm;
