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
import { X, ArrowLeft, AlertTriangle } from 'lucide-react';
import { 
    TbMoodSmile, TbMoodNeutral, TbFlame, 
    TbLayoutGrid, TbClipboardCheck, TbCertificate, TbToggleLeft,
    TbBrain, TbCalendarTime, TbBolt, TbSchool 
} from 'react-icons/tb';

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
    icon: React.ElementType;
    gradient: string;
    features: string[];
    config: StudyStartConfig;
}

const MODES: ModeDefinition[] = [
    {
        id: 'quiz',
        title: 'Quiz',
        description: 'Verifica attiva delle conoscenze',
        icon: TbBrain,
        gradient: 'from-blue-500 to-cyan-500',
        features: ['Smart Mix intelligente', 'Focus su concetti chiave', 'Apprendimento attivo'],
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
        description: 'Memorizzazione scientifica a lungo termine',
        icon: TbCalendarTime,
        gradient: 'from-emerald-500 to-teal-500',
        features: ['Algoritmo Ebbinghaus', 'Ripasso ottimizzato', 'Massima ritenzione'],
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
        description: 'Velocità e precisione sotto pressione',
        icon: TbBolt,
        gradient: 'from-amber-500 to-orange-500',
        features: ['10 minuti intensi', 'Allenamento rapido', 'Massima concentrazione'],
        config: {
            mode: 'sprint',
            focus: 'smart',
            length: 'short',
            timeLimitMinutes: 10,
        },
    },
    {
        id: 'exam',
        title: 'Simulazione Esame',
        description: 'Preparazione completa alla prova finale',
        icon: TbSchool,
        gradient: 'from-purple-500 to-pink-500',
        features: ['Condizioni reali', 'Timer personalizzabile', 'Mix completo argomenti'],
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
    icon: React.ElementType;
    color: string;
}

const EXAM_TYPES: ExamTypeOption[] = [
    { 
        id: 'mixed', 
        label: 'Misto', 
        description: 'Mix automatico di tutte le tipologie',
        icon: TbLayoutGrid,
        color: 'from-purple-500 to-pink-500'
    },
    { 
        id: 'quiz_initial', 
        label: 'Quiz Iniziale', 
        description: 'Superamento per accesso esame finale',
        icon: TbClipboardCheck,
        color: 'from-blue-500 to-cyan-500'
    },
    { 
        id: 'full_mixed', 
        label: 'Esame Misto', 
        description: 'Quiz + domande aperte + vero/falso',
        icon: TbCertificate,
        color: 'from-indigo-500 to-purple-500'
    },
    { 
        id: 'true_false', 
        label: 'Vero e Falso', 
        description: 'Solo domande vero/falso',
        icon: TbToggleLeft,
        color: 'from-teal-500 to-emerald-500'
    },
];

interface DifficultyOption {
    id: ExamDifficulty;
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
}

const DIFFICULTIES: DifficultyOption[] = [
    { 
        id: 'easy', 
        label: 'Facile', 
        icon: TbMoodSmile,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
        borderColor: 'border-emerald-500/30'
    },
    { 
        id: 'medium', 
        label: 'Medio', 
        icon: TbMoodNeutral,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
        borderColor: 'border-amber-500/30'
    },
    { 
        id: 'hard', 
        label: 'Difficile', 
        icon: TbFlame,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-500/10 hover:bg-red-500/20',
        borderColor: 'border-red-500/30'
    },
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
    const Icon = mode.icon;
    
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
                group relative flex flex-col overflow-hidden
                aspect-square p-5 sm:p-6
                rounded-3xl border-2 transition-all duration-300

                bg-gray-50 border-gray-200 shadow-sm
                hover:bg-white hover:border-gray-300 hover:shadow-md

                dark:bg-gray-800/50 dark:border-gray-700/50
                dark:hover:bg-gray-800/70 dark:hover:border-gray-600/50 dark:hover:shadow-2xl

                cursor-pointer text-left
            "
        >
            {/* Subtle accent gradient (non invasivo) */}
            <div className={`
                absolute top-0 left-0 w-full h-1 rounded-t-3xl
                bg-gradient-to-r ${mode.gradient}
                opacity-60 group-hover:opacity-100 transition-opacity
            `} />
            
            {/* Header: Icon + Title */}
            <div className="relative flex items-center gap-3 mb-3">
                <div className={`
                    p-2.5 rounded-xl bg-gradient-to-br ${mode.gradient}
                    group-hover:scale-110 transition-transform duration-300
                `}>
                    <Icon className="w-5 h-5 text-gray-50" />
                </div>
                <h3 className="
                    text-xl sm:text-2xl font-bold
                text-gray-900 dark:text-white
                transition-colors
                ">
                    {mode.title}
                </h3>
            </div>
            
            {/* Description */}
            <p className="
                relative text-xs sm:text-sm leading-relaxed mb-4
                text-gray-800 dark:text-gray-300
                transition-colors
            ">
                {mode.description}
            </p>

            {/* Features */}
            <div className="relative mt-auto space-y-2">
                {mode.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                        <div className={`
                            mt-1.5 w-1 h-1 rounded-full bg-gradient-to-r ${mode.gradient} flex-shrink-0
                        `} />
                        <span className="text-gray-700 dark:text-gray-400 leading-tight">
                            {feature}
                        </span>
                    </div>
                ))}
            </div>
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
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-200/70 dark:border-white/10 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/70 mb-3 flex items-center gap-2">
                    <span className="text-lg">📝</span>
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
                                    ? 'bg-gray-900 text-gray-50 dark:bg-white dark:text-gray-900'
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
                <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-200/70 dark:border-white/10 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/70 mb-3 flex items-center gap-2">
                        <span className="text-lg">🎯</span>
                        Tipo Esame
                    </label>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                            className="
                                w-full px-4 py-3.5 rounded-xl text-left
                                bg-white dark:bg-white/5
                                text-gray-900 dark:text-white
                                border-2 transition-all 
                                flex items-center justify-between gap-3
                                shadow-sm hover:shadow-md
                                group
                            "
                            style={{
                                borderColor: isTypeDropdownOpen ? 'currentColor' : 'transparent',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedExamType.color}`}>
                                    <selectedExamType.icon className="w-5 h-5 text-gray-50" />
                                </div>
                                <div>
                                    <div className="font-semibold">{selectedExamType.label}</div>
                                    <div className="text-xs text-gray-500 dark:text-white/50">
                                        {selectedExamType.description}
                                    </div>
                                </div>
                            </div>
                            <motion.span
                                animate={{ rotate: isTypeDropdownOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white/70"
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
                                    {EXAM_TYPES.map((type) => {
                                        const TypeIcon = type.icon;
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => {
                                                    setExamType(type.id);
                                                    setIsTypeDropdownOpen(false);
                                                }}
                                                className={`
                                                    w-full px-4 py-3 text-left transition-all
                                                    flex items-center gap-3
                                                    ${examType === type.id
                                                        ? 'bg-gray-100 dark:bg-white/10'
                                                        : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                                    }
                                                `}
                                            >
                                                <div className={`p-2 rounded-lg bg-gradient-to-br ${type.color} flex-shrink-0`}>
                                                    <TypeIcon className="w-4 h-4 text-gray-50" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {type.label}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-white/50">
                                                        {type.description}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Difficoltà */}
                <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-200/70 dark:border-white/10 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-white/70 mb-3 flex items-center gap-2">
                        <span className="text-lg">⚡</span>
                        Difficoltà esame
                    </label>
                    <div className="flex gap-2">
                        {DIFFICULTIES.map((diff) => {
                            const Icon = diff.icon;
                            const isSelected = difficulty === diff.id;
                            return (
                                <motion.button
                                    key={diff.id}
                                    type="button"
                                    onClick={() => setDifficulty(diff.id)}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`
                                        flex-1 flex flex-col items-center gap-2 py-4 px-2 rounded-xl 
                                        transition-all border-2 relative overflow-hidden
                                        ${isSelected
                                            ? `${diff.bgColor} ${diff.borderColor} shadow-lg`
                                            : `bg-gray-50 dark:bg-white/5 border-transparent hover:${diff.bgColor}`
                                        }
                                    `}
                                >
                                    <Icon className={`w-6 h-6 transition-colors ${
                                        isSelected ? diff.color : 'text-gray-400 dark:text-white/40'
                                    }`} />
                                    <span className={`text-sm font-semibold transition-colors ${
                                        isSelected 
                                            ? diff.color.replace('text-', 'text-').replace('/400', '/700 dark:text-').replace('/600', '') + diff.color.split('dark:')[1]
                                            : 'text-gray-600 dark:text-white/60'
                                    }`}>
                                        {diff.label}
                                    </span>
                                    {isSelected && (
                                        <motion.div
                                            layoutId="difficulty-indicator"
                                            className="absolute inset-0 -z-10"
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Timer */}
            <div className="bg-white dark:bg-white/5 rounded-2xl p-5 border border-gray-200/70 dark:border-white/10 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/70 mb-3 flex items-center gap-2">
                    <span className="text-lg">⏱️</span>
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
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
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
                    <ArrowLeft className="w-5 h-5" />
                    Torna Indietro
                </button>
                <button
                    type="button"
                    onClick={handleStart}
                    className="
                        flex-1 px-6 py-4 rounded-2xl font-semibold
                        bg-primary-600 text-white hover:bg-primary-500
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
                            fixed inset-0 z-tooltip
                            bg-black/10 dark:bg-black/40
                            backdrop-blur-xl
                        "
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-tooltip flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="
                                w-full max-w-2xl pointer-events-auto
                                rounded-[32px] overflow-hidden

                                bg-white/95 border border-gray-200
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
                                    <X className="w-5 h-5" />
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
