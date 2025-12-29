import { useGoals } from '../../context/GoalsContext';
import { GOAL_CATEGORIES } from '../goals/types';
import { Link } from 'react-router-dom';
import type { GoalWithProgress } from '../goals/types';

// Icona freccia destra
const ArrowRightIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

// Icona Target
const TargetIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

export const GoalsWidget = () => {
    const { goals, stats, loading } = useGoals();

    if (loading) {
        return (
            <div className="p-6 card-glass">
                <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 rounded-full border-primary-500 border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    // Prendi i top 3 obiettivi per progresso
    const topGoals = [...goals]
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3);

    return (
        <div className="p-6 card-glass">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <TargetIcon size={20} />
                    <h3 className="text-lg font-semibold text-white">🎯 Obiettivi in corso</h3>
                </div>
                <Link
                    to="/goals"
                    className="flex items-center gap-1 text-sm transition-colors text-primary-400 hover:text-primary-300"
                >
                    Vedi tutti
                    <ArrowRightIcon size={14} />
                </Link>
            </div>

            {/* Statistiche rapide */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-xl font-bold text-primary-400">{stats.activeGoals}</div>
                    <div className="text-xs text-white/50">Attivi</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-xl font-bold text-green-400">{stats.completedGoals}</div>
                    <div className="text-xs text-white/50">Completati</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-xl font-bold text-yellow-400">{stats.totalCheckIns}</div>
                    <div className="text-xs text-white/50">Check-in</div>
                </div>
            </div>

            {/* Lista obiettivi */}
            {topGoals.length === 0 ? (
                <div className="py-8 text-center">
                    <TargetIcon size={32} />
                    <p className="mt-3 text-sm text-white/50">Nessun obiettivo attivo</p>
                    <Link to="/goals" className="inline-block px-4 py-2 mt-3 text-sm btn-primary">
                        Crea il tuo primo obiettivo
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {topGoals.map((goal) => (
                        <GoalCard key={goal.id} goal={goal} />
                    ))}
                </div>
            )}
        </div>
    );
};

// Card singolo obiettivo
const GoalCard = ({ goal }: { goal: GoalWithProgress }) => {
    const category = GOAL_CATEGORIES[goal.category];
    const daysRemaining = Math.ceil(
        (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;
    const isExpired = daysRemaining < 0;

    return (
        <Link
            to="/goals"
            className="block p-3 transition-all rounded-lg bg-white/5 hover:bg-white/10"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Titolo e categoria */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{category.emoji}</span>
                        <span className="text-sm font-medium text-white truncate">{goal.title}</span>
                    </div>

                    {/* Barra progresso (solo per target) */}
                    {goal.type === 'target' && goal.targetValue && (
                        <div className="mb-2">
                            <div className="flex justify-between mb-1 text-xs">
                                <span className="text-white/60">
                                    {goal.totalProgress} / {goal.targetValue} {goal.unit}
                                </span>
                                <span className="font-medium text-primary-400">{goal.percentage}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
                                    style={{ width: `${goal.percentage}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Info abitudine */}
                    {goal.type === 'habit' && goal.frequency && (
                        <div className="mb-2">
                            <div className="flex items-center gap-2 text-xs text-white/60">
                                <span>🔄 {goal.frequency}x / settimana</span>
                                <span>•</span>
                                <span>{goal.totalProgress} completati</span>
                            </div>
                        </div>
                    )}

                    {/* Scadenza */}
                    <div
                        className={`text-xs ${
                            isExpired
                                ? 'text-red-400'
                                : isUrgent
                                ? 'text-yellow-400'
                                : 'text-white/50'
                        }`}
                    >
                        {isExpired
                            ? `⚠️ Scaduto da ${Math.abs(daysRemaining)} giorni`
                            : `📅 ${daysRemaining} giorni rimanenti`}
                    </div>
                </div>

                {/* Badge percentuale (solo per target) */}
                {goal.type === 'target' && (
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-500/20">
                        <span className="text-sm font-bold text-primary-400">{goal.percentage}%</span>
                    </div>
                )}
            </div>
        </Link>
    );
};
