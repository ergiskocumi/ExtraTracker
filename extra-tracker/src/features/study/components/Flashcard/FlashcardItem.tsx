import React, { useEffect, useState } from 'react';
import { FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';

interface FlashcardItemProps {
    card: Card;
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    onClick?: () => void;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({ card, onUpdate, onClick }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempFront, setTempFront] = useState(card.front);
    const [tempBack, setTempBack] = useState(card.back);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setTempFront(card.front);
            setTempBack(card.back);
        }
    }, [card.back, card.front, isEditing]);

    const trimmedFront = tempFront.trim();
    const trimmedBack = tempBack.trim();
    const isDirty = trimmedFront !== card.front || trimmedBack !== card.back;
    const canSave = !saving && trimmedFront.length > 0 && trimmedBack.length > 0 && isDirty;

    const handleStartEdit = () => {
        setTempFront(card.front);
        setTempBack(card.back);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setTempFront(card.front);
        setTempBack(card.back);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!trimmedFront || !trimmedBack || saving) return;
        setSaving(true);
        try {
            await onUpdate(card.id, trimmedFront, trimmedBack);
            setIsEditing(false);
            emitToast.success('Carta aggiornata con successo', {
                title: 'Modifica completata',
                duration: 2000
            });
        } catch (err: any) {
            emitToast.error(err.message || 'Errore durante il salvataggio', {
                title: 'Errore',
                duration: 4000
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`group relative rounded-2xl md:rounded-3xl border border-white/5 bg-zinc-900/50 p-4 md:p-5 transition-all hover:bg-zinc-900/60 hover:border-white/10 ${
                onClick && !isEditing ? 'cursor-pointer' : ''
            }`}
            onClick={(e) => {
                // Solo se non è in editing e non si è cliccato sul bottone Edit
                if (!isEditing && onClick && !(e.target as HTMLElement).closest('button')) {
                    onClick();
                }
            }}
        >
            <AnimatePresence mode="wait">
                {!isEditing ? (
                    <motion.div
                        key="view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        {/* Fronte */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-semibold text-white/60 flex-shrink-0">
                                    Q
                                </div>
                                <p className="text-sm md:text-base font-semibold leading-relaxed text-white whitespace-pre-wrap break-words">
                                    {card.front}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleStartEdit}
                                className="shrink-0 p-2 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 md:opacity-0 md:group-hover:opacity-100"
                                aria-label="Modifica"
                                title="Modifica"
                            >
                                <FiEdit2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        {/* Retro */}
                        <div className="flex items-start gap-3 pt-3 border-t border-white/5">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-semibold text-white/60 flex-shrink-0">
                                A
                            </div>
                            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap text-white/80 break-words">
                                {card.back}
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-4"
                    >
                        {/* Fronte Input */}
                        <div>
                            <label className="block mb-2 text-xs font-medium text-white/70">
                                Fronte (Domanda)
                            </label>
                            <textarea
                                value={tempFront}
                                onChange={(e) => setTempFront(e.target.value)}
                                rows={3}
                                autoFocus
                                className="w-full resize-y min-h-[80px] p-3 rounded-lg text-sm md:text-base bg-zinc-950 border border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60 transition-all"
                                placeholder="Inserisci la domanda..."
                            />
                        </div>

                        {/* Retro Input */}
                        <div>
                            <label className="block mb-2 text-xs font-medium text-white/70">
                                Retro (Risposta)
                            </label>
                            <textarea
                                value={tempBack}
                                onChange={(e) => setTempBack(e.target.value)}
                                rows={4}
                                className="w-full resize-y min-h-[80px] p-3 rounded-lg text-sm md:text-base bg-zinc-950 border border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60 transition-all"
                                placeholder="Inserisci la risposta..."
                            />
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                            >
                                <FiX className="w-4 h-4" />
                                <span className="hidden sm:inline">Annulla</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!canSave}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-violet-500/20"
                            >
                                {saving ? (
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
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default FlashcardItem;
