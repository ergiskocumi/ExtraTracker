/**
 * STUDY MODE SELECTOR - Minimal Apple-Style Design
 *
 * 4 modalità di studio con Smart Mix Strategy per il Quiz.
 * Design pulito con backdrop blur e supporto light/dark theme.
 *
 * Step 1: Selezione modalità (Quiz, Ripetizione Spaziata, Time Attack, Simulazione Esame)
 * Step 2: Configurazione Simulazione Esame (se selezionato)
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';
import { TbMoodSmile, TbMoodNeutral, TbFlame } from 'react-icons/tb';

// ============================================
// TYPES
// ============================================

export type StudyMode = 'flashcard' | 'quiz' | 'typing' | 'mix' | 'sprint' | 'focus' | 'exam';
export type SessionFocus = 'smart' | 'due' | 'weak' | 'all';
export type SessionLength = 'short' | 'standard' | 'deep';
export type SessionDirection = 'front' | 'back' | 'mixed';
export type ExamType = 'mixed' | 'quiz_initial' | 'full_mixed' | 'true_false';
export type ExamDifficulty = 'easy' | 'medium' | 'hard';

export interface StudyStartConfig {
    mode: StudyMode;
    focus: SessionFocus;
    length: SessionLength;
    direction?: SessionDirection;
    timeLimitMinutes?: number;
    questionCount?: number;
    /** Smart Mix Strategy buckets for quiz mode */
    smartMixEnabled?: boolean;
    /** Exam specific config */
    examType?: ExamType;
    examDifficulty?: ExamDifficulty;
}

interface StudyModeSelectorProps {
    isOpen: boolean;
    deckTitle?: string;
    onClose: () => void;
    onStart: (config: StudyStartConfig) => void;
}

type ModalStep = 'select' | 'exam-config';

// ============================================
// MODE DEFINITIONS
// ============================================

interface ModeDefinition {
    id: 'quiz' | 'spaced' | 'timeattack' | 'exam';
    title: string;
    description: string;
    config: StudyStartConfig;
}

const MODES: ModeDefinition[] = [
    {
        id: 'quiz',
        title: 'Quiz',
        description: 'Metti alla prova la tua memoria con un quiz',
        config: {
            mode: 'quiz',
            focus: 'smart',
            length: 'standard',
            smartMixEnabled: true,
        },
    },
    {
        id: 'spaced',
        title: 'Ripetizione Spaziata',
        description: '"Studia meno e ricorda meglio: il sistema ti dice cosa ripassare."',
        config: {
            mode: 'flashcard',
            focus: 'due',
            length: 'standard',
            direction: 'front',
        },
    },
    {
        id: 'timeattack',
        title: 'Time Attack',
        description: 'Allena il tuo ragionamento con una sfida a tempo',
        config: {
            mode: 'sprint',
            focus: 'smart',
            length: 'short',
            timeLimitMinutes: 10,
        },
    },
    {
        id: 'exam',
        title: 'Simulazione esame',
        description: '"Un mix di tutti gli argomenti per simulare il giorno dell\'esame."',
        config: {
            mode: 'exam',
            focus: 'all',
            length: 'standard',
            timeLimitMinutes: 30,
            questionCount: 30,
        },
    },
];

// ============================================
// EXAM CONFIG
// ============================================

const QUESTION_PRESETS = [20, 40, 60] as const;
const MIN_TIMER_MINUTES = 20;
const MAX_TIMER_MINUTES = 180; // 3 ore

interface ExamTypeOption {
    id: ExamType;
    label: string;
    description: string;
}

const EXAM_TYPES: ExamTypeOption[] = [
    { id: 'mixed', label: 'Misto', description: 'Mix automatico di tutte le tipologie' },
    { id: 'quiz_initial', label: 'Quiz Iniziale', description: 'Superamento per accesso esame finale' },
    { id: 'full_mixed', label: 'Esame Misto', description: 'Quiz + domande aperte + vero/falso' },
    { id: 'true_false', label: 'Vero e Falso', description: 'Solo domande vero/falso' },
];

interface DifficultyOption {
    id: ExamDifficulty;
    label: string;
    icon: React.ElementType;
}

const DIFFICULTIES: DifficultyOption[] = [
    { id: 'easy', label: 'Facile', icon: TbMoodSmile },
    { id: 'medium', label: 'Medio', icon: TbMoodNeutral },
    { id: 'hard', label: 'Difficile', icon: TbFlame },
];

// ============================================
// MODE CARD COMPONENT
// ============================================

interface ModeCardProps {
    mode: ModeDefinition;
    index: number;
    onSelect: () => void;
}

const ModeCard: React.FC<ModeCardProps> = ({ mode, index, onSelect }) => {
    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            className="
                group relative flex flex-col items-center justify-center
                aspect-square p-6 sm:p-8
                rounded-3xl border-2 transition-all duration-300

                bg-white/80 border-gray-200/60
                hover:bg-white hover:border-gray-300 hover:shadow-xl hover:shadow-black/5

                dark:bg-white/5 dark:border-white/10
                dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-xl dark:hover:shadow-black/20

                cursor-pointer text-center
            "
        >
            <h3 className="
                text-xl sm:text-2xl font-semibold mb-3
                text-gray-900 dark:text-white
                group-hover:text-gray-950 dark:group-hover:text-white
                transition-colors
            ">
                {mode.title}
            </h3>
            <p className="
                text-sm sm:text-base leading-relaxed
                text-gray-500 dark:text-white/60
                group-hover:text-gray-600 dark:group-hover:text-white/70
                transition-colors max-w-[200px]
            ">
                {mode.description}
            </p>
            <div className="
                absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100
                transition-opacity duration-300 pointer-events-none
                bg-gradient-to-br from-transparent via-transparent to-black/[0.02]
                dark:to-white/[0.03]
            " />
        </motion.button>
    );
};

// ============================================
// EXAM CONFIG VIEW
// ============================================

interface ExamConfigViewProps {
    onBack: () => void;
    onStart: (config: StudyStartConfig) => void;
}

const ExamConfigView: React.FC<ExamConfigViewProps> = ({ onBack, onStart }) => {
    const [questionCount, setQuestionCount] = useState(20);
    const [customQuestionCount, setCustomQuestionCount] = useState('');
    const [isCustomQuestions, setIsCustomQuestions] = useState(false);
    const [examType, setExamType] = useState<ExamType>('mixed');
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [difficulty, setDifficulty] = useState<ExamDifficulty>('medium');
    const [timerMinutes, setTimerMinutes] = useState(30);
    const [timerUnit, setTimerUnit] = useState<'min' | 'h'>('min');

    // Converti il timer in minuti per il config
    const effectiveTimerMinutes = useMemo(() => {
        return timerUnit === 'h' ? timerMinutes * 60 : timerMinutes;
    }, [timerMinutes, timerUnit]);

    // Display timer value
    const displayTimerValue = useMemo(() => {
        if (timerUnit === 'h') {
            return timerMinutes;
        }
        return timerMinutes;
    }, [timerMinutes, timerUnit]);

    // Effettivo numero domande
    const effectiveQuestionCount = useMemo(() => {
        if (isCustomQuestions && customQuestionCount) {
            const parsed = parseInt(customQuestionCount, 10);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : questionCount;
        }
        return questionCount;
    }, [isCustomQuestions, customQuestionCount, questionCount]);

    const handleTimerChange = useCallback((value: string) => {
        const parsed = parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed < 0) return;

        const effectiveMinutes = timerUnit === 'h' ? parsed * 60 : parsed;

        // Clamp to valid range
        if (effectiveMinutes < MIN_TIMER_MINUTES) {
            setTimerMinutes(MIN_TIMER_MINUTES);
            setTimerUnit('min');
        } else if (effectiveMinutes > MAX_TIMER_MINUTES) {
            setTimerMinutes(3);
            setTimerUnit('h');
        } else {
            setTimerMinutes(parsed);
        }
    }, [timerUnit]);

    const handleUnitToggle = useCallback(() => {
        if (timerUnit === 'min') {
            // Converti in ore (arrotonda)
            const hours = Math.max(1, Math.round(timerMinutes / 60));
            setTimerMinutes(Math.min(hours, 3));
            setTimerUnit('h');
        } else {
            // Converti in minuti
            const minutes = Math.min(timerMinutes * 60, MAX_TIMER_MINUTES);
            setTimerMinutes(Math.max(minutes, MIN_TIMER_MINUTES));
            setTimerUnit('min');
        }
    }, [timerUnit, timerMinutes]);

    const handleStart = useCallback(() => {
        onStart({
            mode: 'exam',
            focus: 'all',
            length: 'standard',
            timeLimitMinutes: effectiveTimerMinutes,
            questionCount: effectiveQuestionCount,
            examType,
            examDifficulty: difficulty,
        });
    }, [onStart, effectiveTimerMinutes, effectiveQuestionCount, examType, difficulty]);

    const selectedExamType = EXAM_TYPES.find(t => t.id === examType) || EXAM_TYPES[0];

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Numero Domande */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-3">
                    Numero Domande
                </label>
                <div className="flex flex-wrap gap-2">
                    {QUESTION_PRESETS.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => {
                                setQuestionCount(preset);
                                setIsCustomQuestions(false);
                            }}
                            className={`
                                px-4 py-2.5 rounded-xl font-medium transition-all
                                ${!isCustomQuestions && questionCount === preset
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20'
                                }
                            `}
                        >
                            {preset}
                        </button>
                    ))}
                    <input
                        type="number"
                        placeholder="Altro..."
                        value={isCustomQuestions ? customQuestionCount : ''}
                        onChange={(e) => {
                            setCustomQuestionCount(e.target.value);
                            setIsCustomQuestions(true);
                        }}
                        onFocus={() => setIsCustomQuestions(true)}
                        className={`
                            w-24 px-3 py-2.5 rounded-xl font-medium transition-all
                            border-2 outline-none
                            ${isCustomQuestions
                                ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-white/10'
                                : 'border-transparent bg-gray-100 dark:bg-white/10'
                            }
                            text-gray-900 dark:text-white
                            placeholder:text-gray-400 dark:placeholder:text-white/40
                        `}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Tipo Esame */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-3">
                        Tipo Esame
                    </label>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                            className="
                                w-full px-4 py-3 rounded-xl text-left
                                bg-gray-100 dark:bg-white/10
                                text-gray-900 dark:text-white
                                border-2 border-transparent
                                hover:border-gray-300 dark:hover:border-white/30
                                transition-all flex items-center justify-between
                            "
                        >
                            <span>{selectedExamType.label}</span>
                            <motion.span
                                animate={{ rotate: isTypeDropdownOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                ▼
                            </motion.span>
                        </button>

                        <AnimatePresence>
                            {isTypeDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="
                                        absolute top-full left-0 right-0 mt-2 z-10
                                        bg-white dark:bg-gray-800
                                        rounded-xl border border-gray-200 dark:border-white/20
                                        shadow-xl overflow-hidden
                                    "
                                >
                                    {EXAM_TYPES.map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => {
                                                setExamType(type.id);
                                                setIsTypeDropdownOpen(false);
                                            }}
                                            className={`
                                                w-full px-4 py-3 text-left transition-colors
                                                ${examType === type.id
                                                    ? 'bg-gray-100 dark:bg-white/10'
                                                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                                }
                                            `}
                                        >
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {type.label}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-white/50">
                                                {type.description}
                                            </div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Difficoltà */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-3">
                        Difficoltà esame
                    </label>
                    <div className="flex gap-2">
                        {DIFFICULTIES.map((diff) => {
                            const Icon = diff.icon;
                            return (
                                <button
                                    key={diff.id}
                                    type="button"
                                    onClick={() => setDifficulty(diff.id)}
                                    className={`
                                        flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all
                                        ${difficulty === diff.id
                                            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20'
                                        }
                                    `}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-xs font-medium">{diff.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Timer */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-3">
                    Timer esame <span className="text-gray-400 dark:text-white/40 font-normal">(max 3 ore)</span>
                </label>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-[200px]">
                        <input
                            type="number"
                            min={timerUnit === 'min' ? MIN_TIMER_MINUTES : 1}
                            max={timerUnit === 'min' ? MAX_TIMER_MINUTES : 3}
                            value={displayTimerValue}
                            onChange={(e) => handleTimerChange(e.target.value)}
                            className="
                                w-full px-4 py-3 pr-16 rounded-xl
                                bg-gray-100 dark:bg-white/10
                                text-gray-900 dark:text-white
                                font-medium text-lg
                                border-2 border-transparent
                                focus:border-gray-300 dark:focus:border-white/30
                                outline-none transition-all
                            "
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40">
                            {timerUnit}
                        </span>
                    </div>

                    {/* Toggle min/h */}
                    <button
                        type="button"
                        onClick={handleUnitToggle}
                        className="
                            px-4 py-3 rounded-xl
                            bg-gray-100 dark:bg-white/10
                            text-gray-600 dark:text-white/60
                            hover:bg-gray-200 dark:hover:bg-white/20
                            transition-all font-medium
                        "
                    >
                        {timerUnit === 'min' ? 'Ore' : 'Minuti'}
                    </button>
                </div>
            </div>

            {/* Attenzione */}
            <div className="
                flex items-start gap-3 p-4 rounded-2xl
                bg-amber-50 dark:bg-amber-500/10
                border border-amber-200 dark:border-amber-500/20
            ">
                <FiAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                        Attenzione
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300/80 leading-relaxed">
                        Una volta iniziato l'esame non sarà più possibile abbandonarlo oppure mettere in pausa,
                        per cui preparati bene per simulare al 100% la modalità d'esame reale in cui ti troverai.
                    </p>
                </div>
            </div>

            {/* Bottoni */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="
                        flex-1 flex items-center justify-center gap-2
                        px-6 py-4 rounded-2xl font-semibold
                        bg-gray-100 text-gray-700 hover:bg-gray-200
                        dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/20
                        transition-all
                    "
                >
                    <FiArrowLeft className="w-5 h-5" />
                    Torna Indietro
                </button>
                <button
                    type="button"
                    onClick={handleStart}
                    className="
                        flex-1 px-6 py-4 rounded-2xl font-semibold
                        bg-gray-900 text-white hover:bg-gray-800
                        dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100
                        transition-all
                    "
                >
                    Inizia Esame
                </button>
            </div>
        </motion.div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const StudyModeSelector: React.FC<StudyModeSelectorProps> = ({
    isOpen,
    deckTitle,
    onClose,
    onStart,
}) => {
    const [step, setStep] = useState<ModalStep>('select');

    // Reset step when modal closes
    const handleClose = useCallback(() => {
        setStep('select');
        onClose();
    }, [onClose]);

    const handleModeSelect = useCallback((mode: ModeDefinition) => {
        if (mode.id === 'exam') {
            // Mostra configurazione esame
            setStep('exam-config');
        } else {
            // Avvia direttamente
            onStart(mode.config);
        }
    }, [onStart]);

    const handleExamBack = useCallback(() => {
        setStep('select');
    }, []);

    const handleExamStart = useCallback((config: StudyStartConfig) => {
        onStart(config);
        setStep('select'); // Reset per prossima apertura
    }, [onStart]);

    // Reset step when modal opens
    const modalContent = useMemo(() => {
        if (step === 'exam-config') {
            return (
                <ExamConfigView
                    onBack={handleExamBack}
                    onStart={handleExamStart}
                />
            );
        }

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
            >
                <div className="grid grid-cols-2 gap-4">
                    {MODES.map((mode, index) => (
                        <ModeCard
                            key={mode.id}
                            mode={mode}
                            index={index}
                            onSelect={() => handleModeSelect(mode)}
                        />
                    ))}
                </div>
            </motion.div>
        );
    }, [step, handleModeSelect, handleExamBack, handleExamStart]);

    const title = step === 'exam-config' ? 'Simulazione Esame' : 'Scegli la modalità';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={handleClose}
                        className="
                            fixed inset-0 z-[100]
                            bg-black/20 dark:bg-black/40
                            backdrop-blur-xl
                        "
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="
                                w-full max-w-2xl pointer-events-auto
                                rounded-[32px] overflow-hidden

                                bg-gray-50/95 border border-gray-200/50
                                shadow-2xl shadow-black/10

                                dark:bg-gray-900/95 dark:border-white/10
                                dark:shadow-2xl dark:shadow-black/30

                                backdrop-blur-2xl
                            "
                        >
                            {/* Header */}
                            <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
                                <button
                                    onClick={handleClose}
                                    className="
                                        absolute top-4 right-4 sm:top-6 sm:right-6
                                        p-2.5 rounded-full transition-all

                                        text-gray-400 hover:text-gray-600
                                        hover:bg-gray-200/50

                                        dark:text-white/40 dark:hover:text-white/70
                                        dark:hover:bg-white/10
                                    "
                                    aria-label="Chiudi"
                                >
                                    <FiX className="w-5 h-5" />
                                </button>

                                <div className="text-center pr-10">
                                    <motion.h2
                                        key={title}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="
                                            text-2xl sm:text-3xl font-bold
                                            text-gray-900 dark:text-white
                                        "
                                    >
                                        {title}
                                    </motion.h2>
                                    {deckTitle && step === 'select' && (
                                        <p className="
                                            mt-2 text-sm
                                            text-gray-500 dark:text-white/50
                                        ">
                                            {deckTitle}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                                <AnimatePresence mode="wait">
                                    {modalContent}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default StudyModeSelector;
