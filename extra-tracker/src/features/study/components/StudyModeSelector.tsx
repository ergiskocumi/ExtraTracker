/**
 * 🎯 STUDY MODE SELECTOR - Pre-session configurator
 */

import { useEffect, useState, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbCards, TbListCheck, TbKeyboard } from 'react-icons/tb';
import { FiX } from 'react-icons/fi';

export type StudyMode = 'flashcard' | 'quiz' | 'typing';

interface StudyModeSelectorProps {
    isOpen: boolean;
    deckTitle?: string;
    onClose: () => void;
    onStart: (config: { mode: StudyMode; shuffle: boolean; reverse: boolean }) => void;
}

const MODES: Array<{
    id: StudyMode;
    title: string;
    description: string;
    icon: ElementType;
}> = [
    {
        id: 'flashcard',
        title: 'Flashcards',
        description: 'Ripasso veloce classico',
        icon: TbCards,
    },
    {
        id: 'quiz',
        title: 'Quiz',
        description: 'Scegli l\'opzione corretta',
        icon: TbListCheck,
    },
    {
        id: 'typing',
        title: 'Typing',
        description: 'Scrivi la risposta esatta',
        icon: TbKeyboard,
    },
];

const ToggleRow: React.FC<{
    label: string;
    checked: boolean;
    onChange: () => void;
}> = ({ label, checked, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
    >
        <span className="text-base font-medium text-white/80">{label}</span>
        <span
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                checked ? 'bg-indigo-500/70' : 'bg-white/10'
            }`}
        >
            <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-1'
                }`}
            />
        </span>
    </button>
);

export const StudyModeSelector: React.FC<StudyModeSelectorProps> = ({
    isOpen,
    deckTitle,
    onClose,
    onStart,
}) => {
    const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null);
    const [shuffle, setShuffle] = useState(false);
    const [reverse, setReverse] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedMode(null);
            setShuffle(false);
            setReverse(false);
        }
    }, [isOpen]);

    const handleStart = () => {
        if (!selectedMode) return;
        onStart({ mode: selectedMode, shuffle, reverse });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden backdrop-blur-md"
                        style={{
                            background: 'linear-gradient(145deg, rgba(22, 20, 35, 0.98) 0%, rgba(18, 16, 30, 0.98) 100%)',
                            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6)',
                        }}
                    >
                        <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Scegli come studiare</h2>
                                {deckTitle && (
                                    <p className="text-sm text-white/60 mt-1">{deckTitle}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-all"
                                aria-label="Chiudi"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                {MODES.map((mode) => {
                                    const Icon = mode.icon;
                                    const isSelected = selectedMode === mode.id;

                                    return (
                                        <motion.button
                                            key={mode.id}
                                            type="button"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedMode(mode.id)}
                                            className={`text-left p-6 rounded-2xl border transition-all ${
                                                isSelected
                                                    ? 'border-indigo-400/40 bg-indigo-500/10 ring-2 ring-indigo-500/70'
                                                    : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                                            }`}
                                        >
                                            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 ${
                                                isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/10 text-white/60'
                                            }`}>
                                                <Icon className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-white mb-2">{mode.title}</h3>
                                            <p className="text-sm text-white/60">{mode.description}</p>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <div className="mt-8 space-y-4">
                                <ToggleRow
                                    label="🔀 Mischia carte"
                                    checked={shuffle}
                                    onChange={() => setShuffle(prev => !prev)}
                                />
                                <ToggleRow
                                    label="🔄 Inverti (Studia Retro -> Fronte)"
                                    checked={reverse}
                                    onChange={() => setReverse(prev => !prev)}
                                />
                            </div>

                            <motion.button
                                whileHover={{ scale: selectedMode ? 1.02 : 1 }}
                                whileTap={{ scale: selectedMode ? 0.98 : 1 }}
                                onClick={handleStart}
                                disabled={!selectedMode}
                                className={`mt-8 w-full py-4 rounded-2xl text-base font-semibold transition-all ${
                                    selectedMode
                                        ? 'bg-gradient-to-r from-indigo-500 to-primary-500 text-white shadow-lg shadow-indigo-500/30'
                                        : 'bg-white/[0.06] text-white/40 cursor-not-allowed'
                                }`}
                            >
                                Inizia Sessione
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
