import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Play, BookOpen, Monitor } from 'lucide-react';
import type { Deck } from '../../services/studyService';

interface DeckCardActionsProps {
    deck: Deck;
    totalCards: number;
    hasDueCards: boolean;
    hasPdf: boolean;
    onStudy: (deckId: string) => void;
    onRead?: (deckId: string) => void;
    onMagicGenerate: (deck: Deck) => void;
    onAddCard: (deckId: string) => void;
}

export const DeckCardActions: React.FC<DeckCardActionsProps> = ({
    deck,
    totalCards,
    hasDueCards,
    hasPdf,
    onStudy,
    onRead,
    onMagicGenerate,
    onAddCard,
}) => {
    return (
        <div className="space-y-2 sm:space-y-2.5 mt-auto">
            {/* Primary CTA: Study / Review / Magic Generate */}
            {totalCards === 0 ? (
                // Deck vuoto: Magic Generate principale + Aggiungi carta piccolo
                <>
                    {/* Pulsante principale - Ben visibile con effetto glitterato intenso */}
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMagicGenerate(deck);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="
                            relative w-full flex items-center justify-center gap-2 sm:gap-2.5 
                            px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                            font-semibold text-sm sm:text-base transition-all
                            bg-gradient-to-r from-amber-500 to-orange-600 text-white 
                            shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40
                            touch-manipulation min-h-[48px] sm:min-h-[52px]
                            overflow-hidden
                        "
                    >
                        {/* Effetto shimmer glitterato arancione */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent"
                            animate={{
                                x: ['-100%', '200%'],
                            }}
                            transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                            style={{
                                transform: 'skewX(-20deg)',
                            }}
                        />
                        
                        {/* Multiple shimmer layers per effetto più intenso */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent"
                            animate={{
                                x: ['-100%', '200%'],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: 'linear',
                                delay: 0.5,
                            }}
                            style={{
                                transform: 'skewX(-15deg)',
                            }}
                        />
                        
                        {/* Stelle glitterate arancioni - Molte di più */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {[...Array(60)].map((_, i) => {
                                const size = Math.random() * 4 + 3; // 3-7px
                                const left = Math.random() * 100;
                                const top = Math.random() * 100;
                                const delay = Math.random() * 2.5;
                                const duration = Math.random() * 1.2 + 1.2; // 1.2-2.4s
                                const rotation = Math.random() * 360;
                                
                                // Colori arancioni variati
                                const colors = [
                                    'rgba(255, 255, 255, 0.95)',
                                    'rgba(255, 237, 213, 0.9)',
                                    'rgba(255, 215, 0, 0.85)',
                                    'rgba(255, 200, 87, 0.8)',
                                    'rgba(255, 183, 77, 0.75)',
                                ];
                                const color = colors[i % colors.length];
                                
                                return (
                                    <motion.div
                                        key={i}
                                        className="absolute"
                                        style={{
                                            width: `${size}px`,
                                            height: `${size}px`,
                                            left: `${left}%`,
                                            top: `${top}%`,
                                            filter: 'drop-shadow(0 0 2px rgba(255, 215, 0, 0.9))',
                                        }}
                                        animate={{
                                            opacity: [0, 1, 0.9, 0],
                                            scale: [0, 1.3, 1, 0],
                                            rotate: [rotation, rotation + 180, rotation + 360],
                                            y: [0, -25, -45, -65],
                                            x: [0, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 35],
                                        }}
                                        transition={{
                                            duration: duration,
                                            repeat: Infinity,
                                            delay: delay,
                                            ease: 'easeOut',
                                        }}
                                    >
                                        {/* SVG Stella */}
                                        <svg
                                            width="100%"
                                            height="100%"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M12 2L14.09 8.26L20 9.27L15 13.14L16.18 19.02L12 15.77L7.82 19.02L9 13.14L4 9.27L9.91 8.26L12 2Z"
                                                fill={color}
                                                stroke={color}
                                                strokeWidth="0.5"
                                            />
                                        </svg>
                                    </motion.div>
                                );
                            })}
                        </div>
                        
                        {/* Contenuto del pulsante */}
                        <span className="relative z-10 flex items-center gap-2 sm:gap-2.5">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                            <span>Fatti aiutare da Silvi AI</span>
                        </span>
                    </motion.button>
                    
                    {/* Pulsante secondario - Piccolo e semi-trasparente */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddCard(deck.id);
                        }}
                        className="
                            w-full flex items-center justify-center gap-1.5 sm:gap-2 
                            px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl
                            font-medium text-xs sm:text-sm transition-all
                            bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80
                            border border-white/10 hover:border-white/20
                            active:scale-[0.95] touch-manipulation
                            min-h-[36px] sm:min-h-[40px]
                            opacity-60 hover:opacity-100
                        "
                        title="Aggiungi carta"
                    >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>Aggiungi carta</span>
                    </button>
                </>
            ) : (
                // Deck con carte
                <>
                    {hasPdf && onRead ? (
                        // CASO A: Deck con PDF - "Studia (Cinema Mode)" come principale
                        <>
                            {/* Pulsante principale - "Studia (Cinema Mode)" */}
                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRead(deck.id);
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="
                                    w-full flex items-center justify-center gap-2 sm:gap-2.5 
                                    px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                                    font-semibold text-sm sm:text-base transition-all
                                    bg-gradient-to-r from-indigo-500 to-violet-600 text-white 
                                    shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40
                                    active:scale-[0.98] touch-manipulation
                                    min-h-[48px] sm:min-h-[52px]
                                "
                            >
                                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                <span>Focus & Flow</span>
                            </motion.button>
                            
                            {/* Pulsanti secondari - Piccoli e semi-trasparenti */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStudy(deck.id);
                                    }}
                                    className="
                                        flex-1 flex items-center justify-center gap-1 sm:gap-1.5 
                                        px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg
                                        font-medium text-[10px] sm:text-xs transition-all
                                        bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80
                                        border border-white/10 hover:border-white/20
                                        active:scale-[0.95] touch-manipulation
                                        min-h-[36px] sm:min-h-[40px]
                                        opacity-60 hover:opacity-100
                                    "
                                    title="Ripassa (Flashcards)"
                                >
                                    <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="hidden sm:inline text-xs">Ripassa</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMagicGenerate(deck);
                                    }}
                                    className="
                                        flex-1 flex items-center justify-center 
                                        px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg
                                        font-medium text-[9px] sm:text-[10px] transition-all
                                        bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80
                                        border border-white/10 hover:border-white/20
                                        active:scale-[0.95] touch-manipulation
                                        min-h-[36px] sm:min-h-[40px]
                                        opacity-60 hover:opacity-100
                                        text-center leading-tight
                                    "
                                    title="Magic AI"
                                >
                                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="hidden sm:inline text-xs">Magic AI</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddCard(deck.id);
                                    }}
                                    className="
                                        flex-1 flex items-center justify-center gap-1 sm:gap-1.5 
                                        px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg
                                        font-medium text-[10px] sm:text-xs transition-all
                                        bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80
                                        border border-white/10 hover:border-white/20
                                        active:scale-[0.95] touch-manipulation
                                        min-h-[36px] sm:min-h-[40px]
                                        opacity-60 hover:opacity-100
                                    "
                                    title="Aggiungi carta"
                                >
                                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="hidden sm:inline text-xs">Aggiungi</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        // CASO B: Deck senza PDF - "Ripassa Ora"/"Studia" come principale
                        <>
                            {/* Pulsante principale - "Ripassa Ora"/"Studia" */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStudy(deck.id);
                                }}
                                className={`
                                    w-full flex items-center justify-center gap-2 sm:gap-2.5 
                                    px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl
                                    font-semibold text-sm sm:text-base transition-all
                                    active:scale-[0.98] touch-manipulation
                                    min-h-[48px] sm:min-h-[52px]
                                    ${hasDueCards
                                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
                                        : 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35'
                                    }
                                `}
                            >
                                <Play className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                <span>{hasDueCards ? 'Ripassa Ora' : 'Studia'}</span>
                            </button>
                            
                            {/* Pulsanti secondari - Piccoli e semi-trasparenti */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMagicGenerate(deck);
                                    }}
                                    className="
                                        w-full sm:flex-1 flex items-center justify-center gap-1 sm:gap-1.5
                                        px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg
                                        font-medium text-[10px] sm:text-xs transition-all
                                        bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80
                                        border border-white/10 hover:border-white/20
                                        active:scale-[0.95] touch-manipulation
                                        min-h-[36px] sm:min-h-[40px]
                                        opacity-60 hover:opacity-100
                                        text-center leading-tight whitespace-nowrap
                                    "
                                    title="Genera con AI"
                                >
                                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="leading-tight">Genera con AI</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddCard(deck.id);
                                    }}
                                    className="
                                        w-full sm:flex-1 flex items-center justify-center gap-1 sm:gap-1.5 
                                        px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg
                                        font-medium text-[10px] sm:text-xs transition-all
                                        bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80
                                        border border-white/10 hover:border-white/20
                                        active:scale-[0.95] touch-manipulation
                                        min-h-[36px] sm:min-h-[40px]
                                        opacity-60 hover:opacity-100
                                    "
                                    title="Aggiungi carta"
                                >
                                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                    <span className="hidden sm:inline text-xs">Aggiungi</span>
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
