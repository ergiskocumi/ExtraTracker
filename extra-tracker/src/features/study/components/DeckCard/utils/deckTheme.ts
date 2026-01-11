import type { Deck } from '../../../services/studyService';
import {
    Layers, BookOpen, Calculator, Code, FlaskConical, Music, Palette, Atom,
    Globe, Heart, Brain, BookMarked, GraduationCap, Languages, Microscope,
    Music2, Paintbrush, PenTool, Rocket, Target, Trophy, Wand2, Sparkles
} from 'lucide-react';

export type DeckTheme = {
    gradient: string;
    icon: React.ElementType;
    iconColor: string;
    borderColor: string;
};

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

export function getDeckTheme(deck: Deck): DeckTheme {
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
