/**
 * 📊 DECK ANALYTICS - Analytics e Performance Tracking
 * 
 * Mostra statistiche dettagliate sul mazzo e suggerimenti intelligenti.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    FiTrendingUp,
    FiClock,
    FiTarget,
    FiBarChart2,
    FiZap,
    FiAlertCircle,
    FiCheckCircle,
    FiInfo,
    FiDownload,
    FiUpload,
} from 'react-icons/fi';
import { studyService, type DeckAnalytics as DeckAnalyticsType } from '../services/studyService';
import { PerformanceCharts } from './PerformanceCharts';

interface DeckAnalyticsProps {
    deckId: string;
}

export const DeckAnalytics: React.FC<DeckAnalyticsProps> = ({ deckId }) => {
    const [analytics, setAnalytics] = useState<DeckAnalyticsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await studyService.getDeckAnalytics(deckId);
            setAnalytics(data);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento delle analytics');
        } finally {
            setLoading(false);
        }
    }, [deckId]);

    useEffect(() => {
        if (deckId) {
            loadAnalytics();
        }
    }, [deckId, loadAnalytics]);

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <div className="h-8 bg-white/5 rounded-lg animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="p-6 text-center text-white/60">
                <FiAlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <p>{error || 'Nessun dato disponibile'}</p>
            </div>
        );
    }

    const { stats, analytics: analyticsData } = analytics;

    // Calcola suggerimenti intelligenti
    const suggestions = generateSuggestions(analytics);

    return (
        <div className="space-y-6">
            {/* Statistiche Principali */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={FiTarget}
                    label="Carte Totali"
                    value={stats.totalCards}
                    color="blue"
                />
                <StatCard
                    icon={FiClock}
                    label="Da Ripassare"
                    value={stats.dueCards}
                    color={stats.dueCards > 0 ? 'amber' : 'emerald'}
                />
                <StatCard
                    icon={FiTrendingUp}
                    label="Retention Rate"
                    value={`${analyticsData.retentionRatePercent}%`}
                    color={analyticsData.retentionRatePercent >= 80 ? 'emerald' : analyticsData.retentionRatePercent >= 60 ? 'amber' : 'red'}
                />
                <StatCard
                    icon={FiZap}
                    label="Streak"
                    value={analyticsData.studyStreak}
                    color="purple"
                />
            </div>

            {/* Distribuzione Carte */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FiBarChart2 className="w-5 h-5" />
                    Distribuzione Carte
                </h3>
                <div className="space-y-3">
                    <ProgressBar
                        label="Nuove"
                        value={stats.newCards}
                        total={stats.totalCards}
                        color="blue"
                    />
                    <ProgressBar
                        label="In Studio"
                        value={stats.learningCards}
                        total={stats.totalCards}
                        color="amber"
                    />
                    <ProgressBar
                        label="Da Ripassare"
                        value={stats.reviewCards}
                        total={stats.totalCards}
                        color="purple"
                    />
                    <ProgressBar
                        label="Padroneggiate"
                        value={stats.masteredCards}
                        total={stats.totalCards}
                        color="emerald"
                    />
                </div>
            </div>

            {/* Metriche Avanzate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                    label="Tempo Medio per Carta"
                    value={`${Math.round(analyticsData.averageTimePerCard)}s`}
                    description="Tempo medio impiegato per ogni carta"
                />
                <MetricCard
                    label="Ripetizioni Medie"
                    value={stats.averageRepetitions.toFixed(1)}
                    description="Numero medio di ripetizioni per carta"
                />
            </div>

            {/* Suggerimenti Intelligenti */}
            {suggestions.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary-500/10 to-purple-500/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FiInfo className="w-5 h-5" />
                        Suggerimenti
                    </h3>
                    <div className="space-y-3">
                        {suggestions.map((suggestion, idx) => (
                            <SuggestionItem key={idx} suggestion={suggestion} />
                        ))}
                    </div>
                </div>
            )}

            {/* Grafici Temporali */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FiBarChart2 className="w-5 h-5" />
                        Performance nel Tempo
                    </h3>
                    {analytics && (
                        <div className="flex items-center gap-2">
                            <ExportButton analytics={analytics} />
                            <ImportButton onImport={loadAnalytics} />
                        </div>
                    )}
                </div>
                <PerformanceCharts deckId={deckId} />
            </div>
        </div>
    );
};

// ============================================
// EXPORT/IMPORT COMPONENTS
// ============================================

interface ExportButtonProps {
    analytics: DeckAnalyticsType;
}

const ExportButton: React.FC<ExportButtonProps> = ({ analytics }) => {
    const handleExport = () => {
        const dataStr = JSON.stringify(analytics, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `deck-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportCSV = () => {
        const csv = [
            ['Metric', 'Value'],
            ['Total Cards', analytics.stats.totalCards],
            ['Due Cards', analytics.stats.dueCards],
            ['Retention Rate', `${analytics.analytics.retentionRatePercent}%`],
            ['Total Reviews', analytics.analytics.totalReviews],
            ['Average Time per Card', `${analytics.analytics.averageTimePerCard.toFixed(1)}s`],
            ['Study Streak', analytics.analytics.studyStreak],
        ].map(row => row.join(',')).join('\n');

        const dataBlob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `deck-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="relative group">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10"
                title="Esporta JSON"
            >
                <FiDownload className="w-4 h-4" />
            </motion.button>
            <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="bg-slate-900 border border-white/10 rounded-lg p-1 shadow-xl">
                    <button
                        onClick={handleExport}
                        className="block w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
                    >
                        Esporta JSON
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="block w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded"
                    >
                        Esporta CSV
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ImportButtonProps {
    onImport: () => void;
}

const ImportButton: React.FC<ImportButtonProps> = ({ onImport }) => {
    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target?.result as string;
                    if (file.name.endsWith('.json')) {
                        const data = JSON.parse(content);
                        console.log('Imported analytics:', data);
                        // Qui potresti inviare i dati al backend per aggiornare le analytics
                        // Per ora solo log
                    } else if (file.name.endsWith('.csv')) {
                        // Parse CSV (semplificato)
                        console.log('Imported CSV:', content);
                    }
                    onImport();
                } catch (err) {
                    console.error('Error importing file:', err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleImport}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10"
            title="Importa Analytics"
        >
            <FiUpload className="w-4 h-4" />
        </motion.button>
    );
};

// ============================================
// HELPER COMPONENTS
// ============================================

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: 'blue' | 'amber' | 'emerald' | 'red' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color }) => {
    const colorClasses = {
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        red: 'bg-red-500/20 text-red-400 border-red-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-4 ${colorClasses[color]}`}
        >
            <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-white/60 mt-1">{label}</div>
        </motion.div>
    );
};

interface ProgressBarProps {
    label: string;
    value: number;
    total: number;
    color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, total, color }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const colorClasses = {
        blue: 'bg-blue-500',
        amber: 'bg-amber-500',
        purple: 'bg-purple-500',
        emerald: 'bg-emerald-500',
    }[color] || 'bg-primary-500';

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-white/80">{label}</span>
                <span className="text-sm font-semibold text-white">{value} / {total}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full ${colorClasses}`}
                />
            </div>
        </div>
    );
};

interface MetricCardProps {
    label: string;
    value: string;
    description: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, description }) => {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60 mb-1">{label}</div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs text-white/40">{description}</div>
        </div>
    );
};

interface Suggestion {
    type: 'success' | 'warning' | 'info';
    message: string;
    icon: React.ElementType;
}

interface SuggestionItemProps {
    suggestion: Suggestion;
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion }) => {
    const { type, message, icon: Icon } = suggestion;
    const colorClasses = {
        success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    }[type];

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-start gap-3 rounded-xl border p-3 ${colorClasses}`}
        >
            <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{message}</p>
        </motion.div>
    );
};

// ============================================
// SUGGESTION GENERATOR
// ============================================

function generateSuggestions(analytics: DeckAnalyticsType): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const { stats, analytics: analyticsData } = analytics;

    // Retention rate basso
    if (analyticsData.retentionRatePercent < 60) {
        suggestions.push({
            type: 'warning',
            message: `Il tuo tasso di retention è ${analyticsData.retentionRatePercent}%. Prova a studiare più regolarmente e a concentrarti sulle carte difficili.`,
            icon: FiAlertCircle,
        });
    } else if (analyticsData.retentionRatePercent >= 80) {
        suggestions.push({
            type: 'success',
            message: `Ottimo! Il tuo tasso di retention è ${analyticsData.retentionRatePercent}%. Continua così!`,
            icon: FiCheckCircle,
        });
    }

    // Molte carte da ripassare
    if (stats.dueCards > stats.totalCards * 0.3) {
        suggestions.push({
            type: 'warning',
            message: `Hai ${stats.dueCards} carte da ripassare. Considera di fare una sessione di studio per recuperare il ritardo.`,
            icon: FiClock,
        });
    }

    // Streak alto
    if (analyticsData.studyStreak >= 7) {
        suggestions.push({
            type: 'success',
            message: `Fantastico! Hai uno streak di ${analyticsData.studyStreak} giorni. Mantieni la costanza!`,
            icon: FiZap,
        });
    }

    // Poche carte padroneggiate
    if (stats.masteredCards < stats.totalCards * 0.2 && stats.totalCards > 10) {
        suggestions.push({
            type: 'info',
            message: `Solo ${stats.masteredCards} carte padroneggiate su ${stats.totalCards}. Continua a studiare per migliorare!`,
            icon: FiTarget,
        });
    }

    // Tempo medio molto alto
    if (analyticsData.averageTimePerCard > 60) {
        suggestions.push({
            type: 'info',
            message: `Stai impiegando ${Math.round(analyticsData.averageTimePerCard)}s per carta. Prova a essere più veloce per migliorare l'efficienza.`,
            icon: FiClock,
        });
    }

    return suggestions;
}
