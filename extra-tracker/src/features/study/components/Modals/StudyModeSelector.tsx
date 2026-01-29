/**
 * STUDY MODE SELECTOR
 *
 * Modalita di studio con preset mirati e configurazioni utili per studenti.
 */

import { useEffect, useMemo, useState, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiX,
    FiZap,
    FiTarget,
    FiClock,
    FiShield,
    FiTrendingUp,
    FiLayers,
} from 'react-icons/fi';
import { TbCards, TbListCheck, TbKeyboard, TbArrowsShuffle } from 'react-icons/tb';

export type StudyMode = 'flashcard' | 'quiz' | 'typing' | 'mix' | 'sprint' | 'focus' | 'exam';
export type SessionFocus = 'smart' | 'due' | 'weak' | 'all';
export type SessionLength = 'short' | 'standard' | 'deep';
export type SessionDirection = 'front' | 'back' | 'mixed';

export interface StudyStartConfig {
    mode: StudyMode;
    focus: SessionFocus;
    length: SessionLength;
    direction?: SessionDirection;
    timeLimitMinutes?: number;
    questionCount?: number;
}

interface StudyModeSelectorProps {
    isOpen: boolean;
    deckTitle?: string;
    onClose: () => void;
    onStart: (config: StudyStartConfig) => void;
}

const MODE_STYLES: Record<StudyMode, {
    ring: string;
    bg: string;
    border: string;
    glow: string;
    icon: string;
    tag: string;
}> = {
    flashcard: {
        ring: 'ring-indigo-500/40',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/30',
        glow: 'shadow-indigo-500/20',
        icon: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
        tag: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30',
    },
    quiz: {
        ring: 'ring-sky-500/40',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/30',
        glow: 'shadow-sky-500/20',
        icon: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
        tag: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
    },
    typing: {
        ring: 'ring-amber-500/40',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/20',
        icon: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
        tag: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
    },
    mix: {
        ring: 'ring-emerald-500/40',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/20',
        icon: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
        tag: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    },
    sprint: {
        ring: 'ring-rose-500/40',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        glow: 'shadow-rose-500/20',
        icon: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
        tag: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
    },
    focus: {
        ring: 'ring-purple-500/40',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        glow: 'shadow-purple-500/20',
        icon: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
        tag: 'bg-purple-500/15 text-purple-200 border-purple-400/30',
    },
    exam: {
        ring: 'ring-slate-200/40',
        bg: 'bg-slate-200/10',
        border: 'border-slate-200/30',
        glow: 'shadow-slate-200/20',
        icon: 'bg-slate-200/20 text-slate-100 border-slate-100/30',
        tag: 'bg-slate-200/15 text-slate-100 border-slate-100/30',
    },
};

const MODE_CATALOG: Array<{
    id: StudyMode;
    title: string;
    description: string;
    longDescription: string;
    tags: string[];
    icon: ElementType;
}> = [
    {
        id: 'flashcard',
        title: 'Flashcards',
        description: 'Ripasso rapido con rating',
        longDescription: 'Classico sistema a carte con valutazione per consolidare la memoria.',
        tags: ['SRS', 'Ripasso'],
        icon: TbCards,
    },
    {
        id: 'quiz',
        title: 'Quiz',
        description: 'Risposte multiple',
        longDescription: 'Allenamento veloce con opzioni guidate e feedback immediato.',
        tags: ['Velocita', 'Scelta'],
        icon: TbListCheck,
    },
    {
        id: 'typing',
        title: 'Typing',
        description: 'Scrittura libera',
        longDescription: 'Active recall completo: digita la risposta e misura la precisione.',
        tags: ['Recall', 'Precisione'],
        icon: TbKeyboard,
    },
    {
        id: 'mix',
        title: 'Mix',
        description: 'Rotazione intelligente',
        longDescription: 'Alterna quiz, typing e flashcards per mantenere alta l attenzione.',
        tags: ['Varieta', 'Focus'],
        icon: TbArrowsShuffle,
    },
    {
        id: 'sprint',
        title: 'Sprint',
        description: 'Sessione breve e intensa',
        longDescription: 'Timer corto, ritmo alto. Ideale per ripassi veloci prima di una verifica.',
        tags: ['Tempo', 'Sprint'],
        icon: FiClock,
    },
    {
        id: 'focus',
        title: 'Focus',
        description: 'Solo carte difficili',
        longDescription: 'Concentrazione massima sulle carte piu deboli per colmare i gap.',
        tags: ['Difficili', 'Recupero'],
        icon: FiTarget,
    },
    {
        id: 'exam',
        title: 'Esame',
        description: 'Simulazione completa',
        longDescription: 'Mix di domande, timer reale e risultato finale con score.',
        tags: ['Simulazione', 'Score'],
        icon: FiShield,
    },
];

const MODE_PRESETS: Record<StudyMode, StudyStartConfig> = {
    flashcard: { mode: 'flashcard', focus: 'smart', length: 'standard', direction: 'front' },
    quiz: { mode: 'quiz', focus: 'smart', length: 'standard' },
    typing: { mode: 'typing', focus: 'smart', length: 'standard', direction: 'front' },
    mix: { mode: 'mix', focus: 'smart', length: 'deep' },
    sprint: { mode: 'sprint', focus: 'smart', length: 'short', timeLimitMinutes: 10 },
    focus: { mode: 'focus', focus: 'weak', length: 'standard', direction: 'front' },
    exam: { mode: 'exam', focus: 'all', length: 'standard', timeLimitMinutes: 30, questionCount: 30 },
};

const LENGTH_PRESETS: Array<{ id: SessionLength; label: string; value: number; helper: string }> = [
    { id: 'short', label: 'Breve', value: 10, helper: '10 carte' },
    { id: 'standard', label: 'Standard', value: 20, helper: '20 carte' },
    { id: 'deep', label: 'Intensa', value: 35, helper: '35 carte' },
];

const EXAM_QUESTION_PRESETS: Array<{ value: number; label: string; helper: string }> = [
    { value: 20, label: '20', helper: 'Domande' },
    { value: 30, label: '30', helper: 'Domande' },
    { value: 40, label: '40', helper: 'Domande' },
];

const TIME_PRESETS: Array<{ value: number; label: string; helper: string }> = [
    { value: 0, label: 'Libero', helper: 'Senza timer' },
    { value: 10, label: '10m', helper: 'Ritmo rapido' },
    { value: 20, label: '20m', helper: 'Bilanciato' },
    { value: 30, label: '30m', helper: 'Profondo' },
];

const EXAM_TIME_PRESETS: Array<{ value: number; label: string; helper: string }> = [
    { value: 20, label: '20m', helper: 'Rapido' },
    { value: 30, label: '30m', helper: 'Standard' },
    { value: 45, label: '45m', helper: 'Completo' },
];

const FOCUS_PRESETS: Array<{ id: SessionFocus; label: string; helper: string }> = [
    { id: 'smart', label: 'Smart', helper: 'Dovute + difficili' },
    { id: 'due', label: 'Dovute', helper: 'Priorita alle scadenze' },
    { id: 'weak', label: 'Difficili', helper: 'Carte con bassa resa' },
    { id: 'all', label: 'Completo', helper: 'Tutto il mazzo' },
];

const DIRECTION_PRESETS: Array<{ id: SessionDirection; label: string; helper: string }> = [
    { id: 'front', label: 'Fronte', helper: 'Domanda -> risposta' },
    { id: 'back', label: 'Retro', helper: 'Risposta -> domanda' },
    { id: 'mixed', label: 'Mix', helper: 'Alterna automaticamente' },
];

const SegmentedOption: React.FC<{
    isActive: boolean;
    onClick: () => void;
    label: string;
    helper: string;
}> = ({ isActive, onClick, label, helper }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex-1 rounded-2xl border px-4 py-3 text-left transition-all ${
            isActive
                ? 'border-white/40 bg-white/10 text-white shadow-lg'
                : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.08]'
        }`}
    >
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-white/40">{helper}</div>
    </button>
);

export const StudyModeSelector: React.FC<StudyModeSelectorProps> = ({
    isOpen,
    deckTitle,
    onClose,
    onStart,
}) => {
    const [selectedMode, setSelectedMode] = useState<StudyMode>('flashcard');
    const [focus, setFocus] = useState<SessionFocus>('smart');
    const [length, setLength] = useState<SessionLength>('standard');
    const [direction, setDirection] = useState<SessionDirection>('front');
    const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0);
    const [questionCount, setQuestionCount] = useState<number>(30);

    useEffect(() => {
        if (!isOpen) return;
        const preset = MODE_PRESETS[selectedMode];
        setFocus(preset.focus);
        setLength(preset.length);
        setDirection(preset.direction ?? 'front');
        setTimeLimitMinutes(preset.timeLimitMinutes ?? 0);
        setQuestionCount(preset.questionCount ?? 30);
    }, [isOpen, selectedMode]);

    const activeMode = useMemo(
        () => MODE_CATALOG.find(mode => mode.id === selectedMode) || MODE_CATALOG[0],
        [selectedMode]
    );

    const activeStyle = MODE_STYLES[selectedMode];
    const ActiveIcon = activeMode.icon;
    const lengthValue = useMemo(() => {
        const preset = LENGTH_PRESETS.find(item => item.id === length);
        return preset?.value ?? 20;
    }, [length]);

    const isExamMode = selectedMode === 'exam';
    const isSprintMode = selectedMode === 'sprint';
    const showDirection = ['flashcard', 'typing', 'focus'].includes(selectedMode);

    const handleStart = () => {
        const payload: StudyStartConfig = {
            mode: selectedMode,
            focus,
            length,
            direction: showDirection ? direction : undefined,
            timeLimitMinutes: timeLimitMinutes > 0 ? timeLimitMinutes : undefined,
            questionCount: isExamMode ? questionCount : undefined,
        };
        onStart(payload);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-gradient-to-br from-black/80 via-black/70 to-black/80 backdrop-blur-md"
                    />

                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-950/98 to-slate-900/95 backdrop-blur-2xl shadow-2xl pointer-events-auto custom-scrollbar"
                            style={{
                                boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)'
                            }}
                        >
                            <div className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-b from-slate-950/95 to-transparent backdrop-blur-xl px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                                                <FiLayers className="h-4 w-4" />
                                            </span>
                                            Modalita di studio
                                        </div>
                                        <h2 className="mt-3 text-xl sm:text-2xl font-semibold text-white">
                                            Scegli il percorso piu adatto
                                        </h2>
                                        {deckTitle && (
                                            <p className="mt-2 text-sm text-white/55">
                                                {deckTitle}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 transition hover:text-white hover:bg-white/10"
                                        aria-label="Chiudi"
                                    >
                                        <FiX className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-6 px-6 sm:px-8 pb-8 pt-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                <div className="space-y-3">
                                    {MODE_CATALOG.map((mode, index) => {
                                        const Icon = mode.icon;
                                        const isActive = selectedMode === mode.id;
                                        const style = MODE_STYLES[mode.id];

                                        return (
                                            <motion.button
                                                key={mode.id}
                                                type="button"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.05 + index * 0.05 }}
                                                onClick={() => setSelectedMode(mode.id)}
                                                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                                                    isActive
                                                        ? `${style.border} ${style.bg} ${style.glow} ring-2 ${style.ring}`
                                                        : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'
                                                }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${style.icon}`}>
                                                        <Icon className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="text-base font-semibold text-white">
                                                                {mode.title}
                                                            </h3>
                                                            {isActive && (
                                                                <span className="text-xs text-white/60">Selezionato</span>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-sm text-white/60">
                                                            {mode.description}
                                                        </p>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {mode.tags.map(tag => (
                                                                <span
                                                                    key={tag}
                                                                    className={`rounded-full border px-2.5 py-1 text-[11px] ${style.tag}`}
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                <div className="space-y-6">
                                    <div className={`rounded-3xl border ${activeStyle.border} ${activeStyle.bg} p-6`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`rounded-2xl border p-3 ${activeStyle.icon}`}>
                                                <ActiveIcon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Modalita attiva</p>
                                                <h3 className="text-lg font-semibold text-white">{activeMode.title}</h3>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-sm text-white/70 leading-relaxed">
                                            {activeMode.longDescription}
                                        </p>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                                    <FiZap className="h-4 w-4" />
                                                    Strategia
                                                </div>
                                                <p className="mt-2 text-sm text-white/70">
                                                    {isExamMode
                                                        ? 'Mix di domande con score finale e tracking.'
                                                        : isSprintMode
                                                            ? 'Sessione rapida con timer corto e ritmo alto.'
                                                            : 'Selezione guidata per mantenere continuita e focus.'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                                    <FiTrendingUp className="h-4 w-4" />
                                                    Risultato
                                                </div>
                                                <p className="mt-2 text-sm text-white/70">
                                                    {isExamMode
                                                        ? 'Report finale con score e avanzamento.'
                                                        : 'Aggiorna il tuo progresso e rafforza la memoria.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {!isExamMode && (
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                                    <FiTarget className="h-4 w-4" />
                                                    Obiettivo sessione
                                                </div>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                    {FOCUS_PRESETS.map(option => (
                                                        <SegmentedOption
                                                            key={option.id}
                                                            isActive={focus === option.id}
                                                            onClick={() => setFocus(option.id)}
                                                            label={option.label}
                                                            helper={option.helper}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                                    <FiLayers className="h-4 w-4" />
                                                    Dimensione sessione
                                                </div>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                    {LENGTH_PRESETS.map(option => (
                                                        <SegmentedOption
                                                            key={option.id}
                                                            isActive={length === option.id}
                                                            onClick={() => setLength(option.id)}
                                                            label={option.label}
                                                            helper={option.helper}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isExamMode && (
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                                    <FiShield className="h-4 w-4" />
                                                    Domande
                                                </div>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                    {EXAM_QUESTION_PRESETS.map(option => (
                                                        <SegmentedOption
                                                            key={option.value}
                                                            isActive={questionCount === option.value}
                                                            onClick={() => setQuestionCount(option.value)}
                                                            label={option.label}
                                                            helper={option.helper}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                                    <FiClock className="h-4 w-4" />
                                                    Timer esame
                                                </div>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                    {EXAM_TIME_PRESETS.map(option => (
                                                        <SegmentedOption
                                                            key={option.value}
                                                            isActive={timeLimitMinutes === option.value}
                                                            onClick={() => setTimeLimitMinutes(option.value)}
                                                            label={option.label}
                                                            helper={option.helper}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!isExamMode && (
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                                    <FiClock className="h-4 w-4" />
                                                    Ritmo
                                                </div>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                    {(isSprintMode ? TIME_PRESETS.filter(option => option.value > 0) : TIME_PRESETS).map(option => (
                                                        <SegmentedOption
                                                            key={option.value}
                                                            isActive={timeLimitMinutes === option.value}
                                                            onClick={() => setTimeLimitMinutes(option.value)}
                                                            label={option.label}
                                                            helper={option.helper}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {showDirection && (
                                                <div>
                                                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                                        <FiTarget className="h-4 w-4" />
                                                        Direzione
                                                    </div>
                                                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                        {DIRECTION_PRESETS.map(option => (
                                                            <SegmentedOption
                                                                key={option.id}
                                                                isActive={direction === option.id}
                                                                onClick={() => setDirection(option.id)}
                                                                label={option.label}
                                                                helper={option.helper}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
                                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40">
                                            <FiZap className="h-4 w-4" />
                                            Riepilogo rapido
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                                                {isExamMode ? `${questionCount} domande` : `${lengthValue} carte`}
                                            </span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                                                {focus === 'smart' ? 'Smart' : focus === 'due' ? 'Dovute' : focus === 'weak' ? 'Difficili' : 'Completo'}
                                            </span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                                                {timeLimitMinutes > 0 ? `${timeLimitMinutes} min` : 'Tempo libero'}
                                            </span>
                                        </div>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={handleStart}
                                        className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/20"
                                    >
                                        Inizia sessione
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default StudyModeSelector;
