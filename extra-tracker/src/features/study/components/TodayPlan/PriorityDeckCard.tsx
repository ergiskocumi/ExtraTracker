import React from 'react';
import { motion } from 'framer-motion';
import { Play, Eye } from 'lucide-react';
import type { Deck } from '../../services/studyService';

// Icone disponibili per i deck
import {
    Layers, BookOpen, Calculator, Code, FlaskConical, Music, Palette, Atom,
    Globe, Heart, Brain, BookMarked, GraduationCap, Languages, Microscope,
    Music2, Paintbrush, PenTool, Rocket, Target, Trophy, Wand2, Sparkles
} from 'lucide-react';

const DECK_ICONS = [
    Layers, BookOpen, Calculator, Code, FlaskConical, Music, Palette, Atom,
    Globe, Heart, Brain, BookMarked, GraduationCap, Languages, Microscope,
    Music2, Paintbrush, PenTool, Rocket, Target, Trophy, Wand2, Sparkles
];

const DECK_GRADIENTS = [
    { from: 'from-blue-500', to: 'to-cyan-500', border: 'border-blue-500/30', icon: 'text-blue-400' },
    { from: 'from-violet-500', to: 'to-purple-500', border: 'border-violet-500/30', icon: 'text-violet-400' },
    { from: 'from-emerald-500', to: 'to-teal-500', border: 'border-emerald-500/30', icon: 'text-emerald-400' },
    { from: 'from-amber-500', to: 'to-orange-500', border: 'border-amber-500/30', icon: 'text-amber-400' },
    { from: 'from-rose-500', to: 'to-pink-500', border: 'border-rose-500/30', icon: 'text-rose-400' },
    { from: 'from-indigo-500', to: 'to-blue-500', border: 'border-indigo-500/30', icon: 'text-indigo-400' },
    { from: 'from-teal-500', to: 'to-cyan-500', border: 'border-teal-500/30', icon: 'text-teal-400' },
    { from: 'from-fuchsia-500', to: 'to-pink-500', border: 'border-fuchsia-500/30', icon: 'text-fuchsia-400' },
    { from: 'from-sky-500', to: 'to-blue-500', border: 'border-sky-500/30', icon: 'text-sky-400' },
    { from: 'from-lime-500', to: 'to-green-500', border: 'border-lime-500/30', icon: 'text-lime-400' },
];

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function getDeckTheme(deck: Deck) {
    const hash = simpleHash(deck.title.toLowerCase().trim());
    const iconIndex = hash % DECK_ICONS.length;
    const gradientIndex = hash % DECK_GRADIENTS.length;
    const gradient = DECK_GRADIENTS[gradientIndex];
    
    return {
        gradient: `bg-gradient-to-br ${gradient.from}/20 ${gradient.to}/10`,
        icon: DECK_ICONS[iconIndex],
        iconColor: gradient.icon,
        borderColor: gradient.border,
    };
}

interface PriorityDeckCardProps {
    deck: Deck;
    priority: 'high' | 'medium' | 'low';
    dueCount: number;
    totalCards: number;
    index: number;
    onStudy: (deckId: string) => void;
    onViewDetail: (deckId: string) => void;
}

export const PriorityDeckCard: React.FC<PriorityDeckCardProps> = ({
    deck,
    priority,
    dueCount,
    totalCards,
    index,
    onStudy,
    onViewDetail,
}) => {
    const theme = getDeckTheme(deck);
    const ThemeIcon = theme.icon;

    const progressPercent = totalCards > 0 ? ((totalCards - dueCount) / totalCards) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            whileHover={{ y: -2 }}
            className={`
                relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl border
                ${priority === 'high'
                    ? 'bg-gradient-to-br from-amber-500/15 to-amber-600/10 border-amber-500/25 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]'
                    : priority === 'medium'
                        ? 'bg-gradient-to-br from-violet-500/15 to-violet-600/10 border-violet-500/25 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]'
                        : 'bg-gradient-to-br from-blue-500/15 to-blue-600/10 border-blue-500/25 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]'
                }
                hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] transition-colors duration-200
                backdrop-blur-sm
            `}
        >
            {/* Badge priorità */}
            <div className="absolute top-4 right-4 z-10">
                {priority === 'high' && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.08 + 0.2 }}
                        className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/50 shadow-lg shadow-amber-500/20"
                    >
                        🔥 Urgente
                    </motion.span>
                )}
                {priority === 'medium' && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.08 + 0.2 }}
                        className="px-2.5 py-1 text-xs font-bold rounded-full bg-violet-500/30 text-violet-200 border border-violet-400/50 shadow-lg shadow-violet-500/20"
                    >
                        ⚡ Priorità
                    </motion.span>
                )}
            </div>

            {/* Icona e titolo */}
            <div className="flex items-start gap-4 mb-4 pr-16">
                <div 
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                    style={{ background: theme.gradient }}
                >
                    <ThemeIcon className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-base sm:text-lg font-bold text-theme-primary mb-1.5 line-clamp-2 leading-tight">
                        {deck.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-theme-secondary font-medium">
                        {dueCount} di {totalCards} carte da ripassare
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-theme-secondary">Progresso</span>
                    <span className={`text-xs font-bold ${
                        priority === 'high' ? 'text-amber-400' :
                        priority === 'medium' ? 'text-violet-400' :
                        'text-blue-400'
                    }`}>
                        {Math.round(progressPercent)}%
                    </span>
                </div>
                <div className="h-2.5 bg-theme-surface rounded-full overflow-hidden shadow-inner">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ delay: index * 0.08 + 0.3, duration: 0.6, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                            priority === 'high' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                            priority === 'medium' ? 'bg-gradient-to-r from-violet-400 to-violet-500' :
                            'bg-gradient-to-r from-blue-400 to-blue-500'
                        } shadow-lg`}
                    />
                </div>
            </div>

            {/* Azioni rapide */}
            <div className="flex items-center gap-2">
                {/* Pulsante principale - Ben visibile */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onStudy(deck.id)}
                    className={`
                        flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                        font-bold text-sm sm:text-base
                        transition-all touch-manipulation min-h-[48px] sm:min-h-[52px]
                        shadow-xl
                        ${priority === 'high'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/40'
                            : priority === 'medium'
                                ? 'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white shadow-violet-500/40'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/40'
                        }
                    `}
                >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Inizia Studio</span>
                </motion.button>
                
                {/* Pulsante secondario - Piccolo e semi-trasparente */}
                <motion.button
                    whileHover={{ scale: 1.1, opacity: 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail(deck.id);
                    }}
                    className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-theme-surface hover:bg-theme-surface-hover text-theme-muted hover:text-theme-secondary border border-theme-subtle hover:border-theme-default transition-all touch-manipulation opacity-60 hover:opacity-100"
                    aria-label="Visualizza dettagli"
                >
                    <Eye className="w-4 h-4 sm:w-4 sm:h-4" />
                </motion.button>
            </div>
        </motion.div>
    );
};
