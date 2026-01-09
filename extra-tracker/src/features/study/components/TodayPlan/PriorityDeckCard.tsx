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

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
                relative p-4 sm:p-5 rounded-xl sm:rounded-2xl border
                ${priority === 'high' 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : priority === 'medium'
                        ? 'bg-violet-500/10 border-violet-500/30'
                        : 'bg-blue-500/10 border-blue-500/30'
                }
                hover:shadow-lg transition-all
            `}
        >
            {/* Badge priorità */}
            <div className="absolute top-3 right-3">
                {priority === 'high' && (
                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        🔥 Urgente
                    </span>
                )}
                {priority === 'medium' && (
                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                        ⚡ Priorità
                    </span>
                )}
            </div>

            {/* Icona e titolo */}
            <div className="flex items-start gap-3 mb-3">
                <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: theme.gradient }}
                >
                    <ThemeIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate mb-1">
                        {deck.title}
                    </h3>
                    <p className="text-xs text-white/60">
                        {dueCount} di {totalCards} carte da ripassare
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full ${
                            priority === 'high' ? 'bg-amber-400' :
                            priority === 'medium' ? 'bg-violet-400' :
                            'bg-blue-400'
                        }`}
                        style={{ width: `${((totalCards - dueCount) / totalCards) * 100}%` }}
                    />
                </div>
            </div>

            {/* Azioni rapide */}
            <div className="flex gap-2">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onStudy(deck.id)}
                    className={`
                        flex-1 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl
                        font-medium text-sm sm:text-base
                        transition-all touch-manipulation min-h-[44px]
                        ${priority === 'high'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                            : priority === 'medium'
                                ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        }
                    `}
                >
                    <Play className="w-4 h-4" />
                    Inizia Studio
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onViewDetail(deck.id)}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all touch-manipulation min-h-[44px]"
                >
                    <Eye className="w-4 h-4" />
                </motion.button>
            </div>
        </motion.div>
    );
};
