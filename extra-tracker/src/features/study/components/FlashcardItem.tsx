import React, { useEffect, useState } from 'react';
import { FiEdit2 } from 'react-icons/fi';
import type { Card } from '../services/studyService';

interface FlashcardItemProps {
    card: Card;
    onUpdate: (cardId: string, front: string, back: string) => Promise<void>;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({ card, onUpdate }) => {
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
        } catch (err) {
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="group relative rounded-2xl border border-white/5 bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-900/60">
            {!isEditing ? (
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs text-white/60 flex-shrink-0">
                                Q
                            </div>
                            <p className="text-sm font-semibold leading-relaxed text-white whitespace-pre-wrap">
                                {card.front}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleStartEdit}
                            className="shrink-0 p-2 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            aria-label="Modifica"
                            title="Modifica"
                        >
                            <FiEdit2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-start gap-3 pt-3 border-t border-white/5">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs text-white/60 flex-shrink-0">
                            A
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/80">
                            {card.back}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 text-xs font-medium text-white/60">
                            Fronte (Domanda)
                        </label>
                        <textarea
                            value={tempFront}
                            onChange={(e) => setTempFront(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full resize-y min-h-[80px] p-3 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500/60"
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-xs font-medium text-white/60">
                            Retro (Risposta)
                        </label>
                        <textarea
                            value={tempBack}
                            onChange={(e) => setTempBack(e.target.value)}
                            rows={4}
                            className="w-full resize-y min-h-[80px] p-3 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500/60"
                        />
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 rounded-lg bg-white/5 text-sm text-white/60 hover:bg-white/10 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!canSave}
                            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Salvataggio...' : 'Salva'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlashcardItem;
