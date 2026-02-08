/**
 * ALGORITHM INFO MODAL
 *
 * Modale che spiega i diversi algoritmi di spaced repetition disponibili.
 * Ogni algoritmo ha: nome, badge, descrizione, pro/contro, caso d'uso ideale.
 * Include tabella comparativa finale.
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Brain, Box, Layers, CheckCircle, AlertCircle } from 'lucide-react';

interface AlgorithmInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface AlgorithmInfo {
    id: string;
    name: string;
    badge: string;
    badgeColor: string;
    icon: React.ElementType;
    iconColor: string;
    description: string;
    howItWorks: string;
    recommendedFor: string;
    pros: string[];
    cons: string[];
}

const ALGORITHMS: AlgorithmInfo[] = [
    {
        id: 'sm2',
        name: 'SM-2',
        badge: 'Consigliato',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        icon: Zap,
        iconColor: 'text-emerald-400',
        description:
            "L'algoritmo originale di SuperMemo. Calcola un \"fattore di facilità\" per ogni carta che determina quanto velocemente crescono gli intervalli tra le ripetizioni.",
        howItWorks:
            'Dopo ogni review, aggiorna il fattore di facilità in base alla tua risposta. Le carte difficili vengono riviste più spesso, quelle facili sempre meno.',
        recommendedFor: 'La maggior parte degli utenti. Studio regolare e costante.',
        pros: ['Semplice e prevedibile', 'Testato da decenni', 'Buon bilanciamento generale'],
        cons: ['Non si adatta dinamicamente', 'Può essere troppo aggressivo con carte difficili'],
    },
    {
        id: 'fsrs',
        name: 'FSRS',
        badge: 'Avanzato',
        badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        icon: Brain,
        iconColor: 'text-violet-400',
        description:
            "Algoritmo moderno che modella scientificamente la curva dell'oblio. Calcola la probabilità esatta di ricordare ogni carta e pianifica le review di conseguenza.",
        howItWorks:
            "Usa stabilità e difficoltà come parametri. Modella la probabilità di ricordare con la formula R(t) = (1 + t/(9*S))^(-1) e ottimizza gli intervalli per mantenere una retention del 90%.",
        recommendedFor: 'Studenti intensivi che vogliono massimizzare la retention con il minimo sforzo.',
        pros: ['Più preciso scientificamente', 'Si adatta al tuo stile', 'Ottimizza per retention target'],
        cons: ['Richiede più review iniziali per calibrarsi', 'Più complesso da comprendere'],
    },
    {
        id: 'leitner',
        name: 'Leitner',
        badge: 'Intuitivo',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        icon: Box,
        iconColor: 'text-amber-400',
        description:
            'Sistema a "scatole". Le carte partono dalla scatola 1 e salgono quando le ricordi. Se sbagli, tornano alla scatola 1. Ogni scatola ha un intervallo fisso crescente (1, 2, 4, 8, 16, 32 giorni).',
        howItWorks:
            'Rispondi bene (4-5): la carta sale di scatola. Rispondi "Ok" (3): rimane nella stessa. Rispondi male (1-2): torna alla scatola 1.',
        recommendedFor: 'Chi preferisce un sistema semplice e visuale. Principianti delle flashcard.',
        pros: ['Semplicissimo da capire', 'Progressione visuale chiara', 'Nessun parametro complesso'],
        cons: ['Meno flessibile', 'Non considera la difficoltà individuale delle carte'],
    },
    {
        id: 'anki',
        name: 'Anki',
        badge: 'Conservativo',
        badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        icon: Layers,
        iconColor: 'text-sky-400',
        description:
            'Variante di SM-2 con gestione più sofisticata degli errori. Include fasi di apprendimento iniziale e, quando sbagli una carta già appresa, dimezza l\'intervallo invece di resettare.',
        howItWorks:
            'Le nuove carte passano per "learning steps" brevi. Dopo la graduazione, gli intervalli crescono normalmente. Carte facili ricevono un bonus, carte difficili crescono più lentamente.',
        recommendedFor: 'Chi vuole un approccio più "gentile" con gli errori e ha materiale complesso.',
        pros: ['Recovery veloce dopo errori', 'Bonus per carte facili', 'Learning steps per carte nuove'],
        cons: ['Può essere troppo conservativo per materiale semplice', 'Più parametri interni'],
    },
];

const COMPARISON_ROWS = [
    { label: 'Complessità', sm2: 'Bassa', fsrs: 'Alta', leitner: 'Minima', anki: 'Media' },
    { label: 'Adattività', sm2: 'Media', fsrs: 'Alta', leitner: 'Bassa', anki: 'Media' },
    { label: 'Recovery errori', sm2: 'Reset', fsrs: 'Graduale', leitner: 'Reset', anki: 'Dimezza' },
    { label: 'Calibrazione', sm2: 'Immediata', fsrs: 'Progressiva', leitner: 'Immediata', anki: 'Immediata' },
    { label: 'Ideale per', sm2: 'Tutti', fsrs: 'Intensivi', leitner: 'Principianti', anki: 'Avanzati' },
];

export const AlgorithmInfoModal: React.FC<AlgorithmInfoModalProps> = ({ isOpen, onClose }) => {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose],
    );

    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyDown]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
                            <h2 className="text-lg font-bold text-white">
                                Come funzionano gli algoritmi di studio
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Algorithm sections */}
                            {ALGORITHMS.map((algo) => (
                                <div
                                    key={algo.id}
                                    className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3"
                                >
                                    {/* Name and badge */}
                                    <div className="flex items-center gap-3">
                                        <algo.icon className={`w-5 h-5 ${algo.iconColor}`} />
                                        <h3 className="text-base font-bold text-white">{algo.name}</h3>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${algo.badgeColor}`}
                                        >
                                            {algo.badge}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-white/70 leading-relaxed">{algo.description}</p>

                                    {/* How it works */}
                                    <div>
                                        <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                                            Come sceglie quando rivedere
                                        </p>
                                        <p className="text-sm text-white/60">{algo.howItWorks}</p>
                                    </div>

                                    {/* Recommended for */}
                                    <div className="rounded-lg bg-white/5 px-3 py-2">
                                        <p className="text-xs font-semibold text-white/50 mb-0.5">Consigliato per:</p>
                                        <p className="text-sm text-white/80">{algo.recommendedFor}</p>
                                    </div>

                                    {/* Pro/Contro */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold text-emerald-400/80 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Pro
                                            </p>
                                            {algo.pros.map((pro, i) => (
                                                <p key={i} className="text-xs text-white/60 pl-4">
                                                    {pro}
                                                </p>
                                            ))}
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold text-rose-400/80 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Contro
                                            </p>
                                            {algo.cons.map((con, i) => (
                                                <p key={i} className="text-xs text-white/60 pl-4">
                                                    {con}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Comparison table */}
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                                <h3 className="text-base font-bold text-white mb-4">Quale scegliere?</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left py-2 pr-4 text-white/50 font-medium" />
                                                <th className="text-center py-2 px-2 text-emerald-400 font-semibold">SM-2</th>
                                                <th className="text-center py-2 px-2 text-violet-400 font-semibold">FSRS</th>
                                                <th className="text-center py-2 px-2 text-amber-400 font-semibold">Leitner</th>
                                                <th className="text-center py-2 px-2 text-sky-400 font-semibold">Anki</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {COMPARISON_ROWS.map((row) => (
                                                <tr key={row.label} className="border-b border-white/5">
                                                    <td className="py-2 pr-4 text-white/60 font-medium">{row.label}</td>
                                                    <td className="py-2 px-2 text-center text-white/70">{row.sm2}</td>
                                                    <td className="py-2 px-2 text-center text-white/70">{row.fsrs}</td>
                                                    <td className="py-2 px-2 text-center text-white/70">{row.leitner}</td>
                                                    <td className="py-2 px-2 text-center text-white/70">{row.anki}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AlgorithmInfoModal;
