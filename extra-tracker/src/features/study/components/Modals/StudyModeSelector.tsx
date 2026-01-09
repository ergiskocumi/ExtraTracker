/**
 * 🎯 STUDY MODE SELECTOR - Premium Pre-session Configurator
 * 
 * Design premium ottimizzato per mobile, tablet e desktop.
 * UX touch-friendly con animazioni fluide e feedback visivo chiaro.
 */

import { useEffect, useState, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiX, 
    FiCheck,
    FiShuffle,
    FiRotateCw,
    FiZap,
    FiTarget,
    FiBookOpen
} from 'react-icons/fi';
import { TbCards, TbListCheck, TbKeyboard } from 'react-icons/tb';

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
    longDescription: string;
    icon: ElementType;
    color: 'purple' | 'blue' | 'amber';
    gradient: string;
}> = [
    {
        id: 'flashcard',
        title: 'Flashcards',
        description: 'Ripasso veloce classico',
        longDescription: 'Gira le carte e valuta quanto bene ricordi la risposta',
        icon: TbCards,
        color: 'purple',
        gradient: 'from-purple-500/20 via-purple-600/15 to-indigo-500/20',
    },
    {
        id: 'quiz',
        title: 'Quiz',
        description: 'Scegli l\'opzione corretta',
        longDescription: 'Seleziona la risposta corretta tra le opzioni multiple',
        icon: TbListCheck,
        color: 'blue',
        gradient: 'from-blue-500/20 via-blue-600/15 to-cyan-500/20',
    },
    {
        id: 'typing',
        title: 'Typing',
        description: 'Scrivi la risposta esatta',
        longDescription: 'Digita la risposta completa per testare la tua memoria',
        icon: TbKeyboard,
        color: 'amber',
        gradient: 'from-amber-500/20 via-amber-600/15 to-orange-500/20',
    },
];

const PremiumToggle: React.FC<{
    label: string;
    description?: string;
    icon: React.ReactNode;
    checked: boolean;
    onChange: () => void;
    delay?: number;
}> = ({ label, description, icon, checked, onChange, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
    >
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            className={`w-full flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${
                checked
                    ? 'border-primary-500/40 bg-primary-500/10 shadow-lg shadow-primary-500/20'
                    : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]'
            }`}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`p-2.5 rounded-xl transition-all ${
                    checked
                        ? 'bg-primary-500/30 border border-primary-400/40 text-primary-300'
                        : 'bg-white/10 border border-white/10 text-white/50'
                }`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-base sm:text-lg font-semibold mb-0.5 ${
                        checked ? 'text-white' : 'text-white/80'
                    }`}>
                        {label}
                    </p>
                    {description && (
                        <p className="text-xs sm:text-sm text-white/50 line-clamp-1">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex-shrink-0">
                <div
                    className={`relative inline-flex h-8 w-14 sm:h-9 sm:w-16 items-center rounded-full transition-all duration-300 ${
                        checked
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30'
                            : 'bg-white/10'
                    }`}
                >
                    <motion.span
                        animate={{
                            x: checked ? 28 : 4,
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`inline-block h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white shadow-lg ${
                            checked ? 'shadow-primary-500/50' : 'shadow-black/20'
                        }`}
                    />
                    {checked && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute left-2 top-1/2 -translate-y-1/2"
                        >
                            <FiCheck className="w-3.5 h-3.5 text-primary-600" />
                        </motion.div>
                    )}
                </div>
            </div>
        </button>
    </motion.div>
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

    const selectedModeData = selectedMode ? MODES.find(m => m.id === selectedMode) : null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-gradient-to-br from-black/80 via-black/70 to-black/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-900/95 backdrop-blur-2xl shadow-2xl pointer-events-auto custom-scrollbar"
                            style={{
                                boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            {/* Header */}
                            <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-900/98 to-transparent backdrop-blur-xl border-b border-white/10 px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="flex items-center gap-2 mb-2"
                                        >
                                            <div className="p-2 rounded-xl bg-primary-500/20 border border-primary-500/30">
                                                <FiTarget className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" />
                                            </div>
                                            <p className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">
                                                Modalità di Studio
                                            </p>
                                        </motion.div>
                                        <motion.h2
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 }}
                                            className="text-xl sm:text-2xl font-bold text-white leading-tight"
                                        >
                                            Scegli come studiare
                                        </motion.h2>
                                        {deckTitle && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="text-sm sm:text-base text-white/60 mt-2 flex items-center gap-2"
                                            >
                                                <FiBookOpen className="w-4 h-4" />
                                                <span className="truncate">{deckTitle}</span>
                                            </motion.p>
                                        )}
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onClose}
                                        className="p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                                        aria-label="Chiudi"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-6">
                                {/* Mode Selection */}
                                <div>
                                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <FiZap className="w-4 h-4" />
                                        Seleziona Modalità
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                        {MODES.map((mode, index) => {
                                            const Icon = mode.icon;
                                            const isSelected = selectedMode === mode.id;

                                            return (
                                                <motion.button
                                                    key={mode.id}
                                                    type="button"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.1 + index * 0.1 }}
                                                    whileHover={{ scale: 1.02, y: -2 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => setSelectedMode(mode.id)}
                                                    className={`relative text-left p-5 sm:p-6 rounded-2xl border transition-all overflow-hidden ${
                                                        isSelected
                                                            ? 'border-primary-500/50 bg-gradient-to-br ' + mode.gradient + ' ring-2 ring-primary-500/50 shadow-lg shadow-primary-500/20'
                                                            : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]'
                                                    }`}
                                                >
                                                    {/* Selected Indicator */}
                                                    {isSelected && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="absolute top-3 right-3 p-1.5 rounded-full bg-primary-500 border border-primary-400/50"
                                                        >
                                                            <FiCheck className="w-3.5 h-3.5 text-white" />
                                                        </motion.div>
                                                    )}

                                                    {/* Icon */}
                                                    <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-4 transition-all ${
                                                        isSelected
                                                            ? 'bg-primary-500/30 border border-primary-400/40 text-primary-300 shadow-lg shadow-primary-500/20'
                                                            : 'bg-white/10 border border-white/10 text-white/60'
                                                    }`}>
                                                        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                                                    </div>

                                                    {/* Content */}
                                                    <h3 className={`text-lg sm:text-xl font-bold mb-2 ${
                                                        isSelected ? 'text-white' : 'text-white/90'
                                                    }`}>
                                                        {mode.title}
                                                    </h3>
                                                    <p className={`text-sm sm:text-base mb-2 ${
                                                        isSelected ? 'text-white/80' : 'text-white/60'
                                                    }`}>
                                                        {mode.description}
                                                    </p>
                                                    <p className={`text-xs sm:text-sm ${
                                                        isSelected ? 'text-white/60' : 'text-white/40'
                                                    }`}>
                                                        {mode.longDescription}
                                                    </p>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Options */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <FiZap className="w-4 h-4" />
                                        Opzioni
                                    </h3>
                                    <PremiumToggle
                                        icon={<FiShuffle className="w-4 h-4 sm:w-5 sm:h-5" />}
                                        label="Mischia carte"
                                        description="Ordine casuale delle carte"
                                        checked={shuffle}
                                        onChange={() => setShuffle(prev => !prev)}
                                        delay={0.4}
                                    />
                                    <PremiumToggle
                                        icon={<FiRotateCw className="w-4 h-4 sm:w-5 sm:h-5" />}
                                        label="Inverti"
                                        description="Studia Retro → Fronte"
                                        checked={reverse}
                                        onChange={() => setReverse(prev => !prev)}
                                        delay={0.45}
                                    />
                                </div>

                                {/* Start Button */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <motion.button
                                        whileHover={selectedMode ? { scale: 1.02 } : {}}
                                        whileTap={selectedMode ? { scale: 0.98 } : {}}
                                        onClick={handleStart}
                                        disabled={!selectedMode}
                                        className={`w-full py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-bold transition-all relative overflow-hidden ${
                                            selectedMode
                                                ? 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40'
                                                : 'bg-white/[0.06] text-white/40 cursor-not-allowed'
                                        }`}
                                    >
                                        {selectedMode && (
                                            <motion.div
                                                initial={{ x: '-100%' }}
                                                animate={{ x: '100%' }}
                                                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                            />
                                        )}
                                        <span className="relative flex items-center justify-center gap-2">
                                            {selectedMode && selectedModeData && (
                                                <selectedModeData.icon className="w-5 h-5" />
                                            )}
                                            Inizia Sessione
                                        </span>
                                    </motion.button>
                                </motion.div>

                                {/* Help Text */}
                                {selectedMode && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4"
                                    >
                                        <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                                            <span className="font-semibold text-primary-300">💡 Suggerimento:</span>{' '}
                                            {selectedModeData?.longDescription}
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
