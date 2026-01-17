import React, { useEffect, useState, useCallback, memo } from 'react';
import { FiEdit2, FiX, FiCheck, FiTrash2, FiTarget } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '../../services/studyService';
import { emitToast } from '../../../../shared/components/toast';

interface FlashcardItemProps {
    card: Card;
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
    onClick?: (card: Card) => void;
    /** Callback per eliminare la card (opzionale) */
    onDelete?: (cardId: string) => void;
    /** Se true, la card parte già in editing mode */
    initialEditing?: boolean;
    /** Callback quando la card viene cancellata (per card temporanee) */
    onCancel?: () => void;
    /** Callback per creare una nuova card (per card temporanee) */
    onCreate?: (front: string, back: string) => Promise<void>;
    /** Callback quando si clicca "Show Source" (opzionale) */
    onShowSource?: (card: Card) => void;
    /** Se true, la card è attualmente evidenziata come "source active" */
    isSourceActive?: boolean;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = memo(({ 
    card, 
    onUpdate, 
    onClick, 
    onDelete, 
    initialEditing = false, 
    onCancel, 
    onCreate,
    onShowSource,
    isSourceActive = false,
}) => {
    const [isEditing, setIsEditing] = useState(initialEditing);
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

    const handleStartEdit = useCallback(() => {
        setTempFront(card.front);
        setTempBack(card.back);
        setIsEditing(true);
    }, [card.front, card.back]);

    const handleCancel = useCallback(() => {
        setTempFront(card.front);
        setTempBack(card.back);
        setIsEditing(false);
        // Se c'è onCancel (card temporanea), chiamalo
        if (onCancel) {
            onCancel();
        }
    }, [card.front, card.back, onCancel]);

    const handleSave = useCallback(async () => {
        if (!trimmedFront || !trimmedBack || saving) return;
        setSaving(true);
        try {
            // Se è una card temporanea (ID inizia con "temp-") e c'è onCreate, usalo
            if (card.id.startsWith('temp-') && onCreate) {
                await onCreate(trimmedFront, trimmedBack);
            } else {
                await onUpdate(card.id, trimmedFront, trimmedBack);
                emitToast.success('Carta aggiornata con successo', {
                    title: 'Modifica completata',
                    duration: 2000
                });
            }
            setIsEditing(false);
        } catch (err: any) {
            emitToast.error(err.message || 'Errore durante il salvataggio', {
                title: 'Errore',
                duration: 4000
            });
        } finally {
            setSaving(false);
        }
    }, [card.id, trimmedFront, trimmedBack, saving, onUpdate, onCreate]);

    const handleCardClick = useCallback((e: React.MouseEvent) => {
        if (!isEditing && onClick && !(e.target as HTMLElement).closest('button')) {
            onClick(card);
        }
    }, [isEditing, onClick, card]);

    const handleShowSource = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (onShowSource && card.sourceMetadata) {
            onShowSource(card);
        }
    }, [onShowSource, card]);

    // Debug: Verifica che sourceMetadata e onShowSource siano presenti
    const hasSourceMetadata = !!card.sourceMetadata;
    const hasOnShowSource = !!onShowSource;
    const shouldShowButton = hasSourceMetadata && hasOnShowSource;

    // #region agent log
    useEffect(() => {
        fetch('http://127.0.0.1:7244/ingest/f83237b4-4e05-491b-b343-eba64fcbd5fe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FlashcardItem.tsx:113', message: 'FlashcardItem render', data: { cardId: card.id, hasSourceMetadata: !!card.sourceMetadata, sourceMetadataType: typeof card.sourceMetadata, sourceMetadataValue: card.sourceMetadata, sourceMetadataKeys: card.sourceMetadata ? Object.keys(card.sourceMetadata) : [], hasOnShowSource: !!onShowSource, onShowSourceType: typeof onShowSource, shouldShowButton, isEditing }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A,B,C,E' }) }).catch(() => {});
    }, [card.id, card.sourceMetadata, onShowSource, shouldShowButton, isEditing]);
    // #endregion

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`group relative rounded-2xl md:rounded-3xl border backdrop-blur-xl p-4 md:p-5 transition-all duration-300 hover:border-white/[0.15] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${
                onClick && !isEditing ? 'cursor-pointer' : ''
            } ${
                isSourceActive 
                    ? 'border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                    : 'border-white/[0.08]'
            }`}
            style={{
                background: isSourceActive
                    ? 'linear-gradient(145deg, rgba(139,92,246,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.01) 100%)',
            }}
            onClick={handleCardClick}
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
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 backdrop-blur-sm flex items-center justify-center text-xs font-semibold text-violet-400 flex-shrink-0 shadow-[0_0_10px_rgb(139,92,246,0.2)]">
                                    Q
                                </div>
                                <p className="text-sm md:text-base font-semibold leading-relaxed text-white whitespace-pre-wrap break-words">
                                    {card.front}
                                </p>
                            </div>
                            {/* Action Buttons Container - Always visible */}
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Show Source Button - FORCE RENDER: Mostra sempre se sourceMetadata esiste */}
                                {card.sourceMetadata && (
                                    <>
                                        {/* #region agent log */}
                                        {(() => {
                                            fetch('http://127.0.0.1:7244/ingest/f83237b4-4e05-491b-b343-eba64fcbd5fe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FlashcardItem.tsx:167', message: 'Rendering Show Source button', data: { cardId: card.id, hasSourceMetadata: !!card.sourceMetadata, hasOnShowSource: !!onShowSource, willRender: true, buttonDisabled: !onShowSource }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C,D' }) }).catch(() => {});
                                            return null;
                                        })()}
                                        {/* #endregion */}
                                        <button
                                            type="button"
                                            onClick={handleShowSource}
                                            disabled={!onShowSource}
                                            className={`p-2.5 rounded-xl border backdrop-blur-sm transition-all duration-300 active:scale-95 ${
                                                !onShowSource
                                                    ? 'border-red-500/40 bg-red-500/20 text-red-300 opacity-50 cursor-not-allowed'
                                                    : isSourceActive
                                                    ? 'border-violet-500/60 bg-violet-500/25 text-violet-300 hover:bg-violet-500/35 shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                                                    : 'border-violet-500/40 bg-violet-500/20 text-violet-300 hover:text-violet-200 hover:bg-violet-500/30 hover:border-violet-500/60 shadow-md'
                                            }`}
                                            aria-label={onShowSource ? "Vai alla fonte nel PDF" : "Fonte disponibile ma callback mancante"}
                                            title={onShowSource ? "Vai alla fonte nel PDF" : "DEBUG: sourceMetadata presente ma onShowSource mancante"}
                                            style={{ zIndex: 9999, position: 'relative' }}
                                        >
                                            <FiTarget className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                    </>
                                )}
                                {/* Edit Button - Always visible */}
                                <button
                                    type="button"
                                    onClick={handleStartEdit}
                                    className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-sm text-white/70 hover:text-white hover:bg-white/[0.10] transition-all duration-300 active:scale-95"
                                    aria-label="Modifica"
                                    title="Modifica"
                                >
                                    <FiEdit2 className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                                {/* Delete Button - Always visible if onDelete exists */}
                                {onDelete && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(card.id);
                                        }}
                                        className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 backdrop-blur-sm text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all duration-300 active:scale-95"
                                        aria-label="Elimina"
                                        title="Elimina"
                                    >
                                        <FiTrash2 className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Retro */}
                        <div className="flex items-start gap-3 pt-3 border-t border-white/[0.08]">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm flex items-center justify-center text-xs font-semibold text-amber-400 flex-shrink-0 shadow-[0_0_10px_rgb(245,158,11,0.2)]">
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
                            <label className="block mb-2 text-xs font-medium text-slate-300">
                                Fronte (Domanda)
                            </label>
                            <textarea
                                value={tempFront}
                                onChange={(e) => setTempFront(e.target.value)}
                                rows={3}
                                autoFocus
                                className="w-full resize-y min-h-[80px] p-3 rounded-xl text-sm md:text-base bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60 transition-all duration-300"
                                placeholder="Inserisci la domanda..."
                            />
                        </div>

                        {/* Retro Input */}
                        <div>
                            <label className="block mb-2 text-xs font-medium text-slate-300">
                                Retro (Risposta)
                            </label>
                            <textarea
                                value={tempBack}
                                onChange={(e) => setTempBack(e.target.value)}
                                rows={4}
                                className="w-full resize-y min-h-[80px] p-3 rounded-xl text-sm md:text-base bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/60 transition-all duration-300"
                                placeholder="Inserisci la risposta..."
                            />
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center gap-3 pt-3 border-t border-white/[0.08]">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
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
});

FlashcardItem.displayName = 'FlashcardItem';

export default FlashcardItem;
