import { useState } from 'react';
import { useGoals } from '../context/GoalsContext';
import { GOAL_CATEGORIES, MOOD_OPTIONS } from '../features/goals/types';
import type { GoalWithProgress, CreateCheckInDTO, Mood } from '../features/goals/types';
import { GoalWizard } from '../features/goals/GoalWizard';

// Icona Target
const TargetIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

// Icona Plus
const PlusIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

// Icona Trash
const TrashIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

export const GoalsPage = () => {
    const { goals, loading, error, stats, addCheckIn, deleteGoal } = useGoals();
    const [showWizard, setShowWizard] = useState(false);
    const [checkInGoalId, setCheckInGoalId] = useState<string | null>(null);
    const [checkInValue, setCheckInValue] = useState('');
    const [checkInMood, setCheckInMood] = useState<Mood>(2);
    const [checkInNotes, setCheckInNotes] = useState('');

    // Gestisce il submit del check-in
    const handleCheckInSubmit = async (goalId: string) => {
        if (!checkInValue || isNaN(Number(checkInValue))) return;

        const checkInData: CreateCheckInDTO = {
            value: Number(checkInValue),
            mood: checkInMood,
            notes: checkInNotes || undefined,
        };

        try {
            await addCheckIn(goalId, checkInData);
            // Reset form
            setCheckInGoalId(null);
            setCheckInValue('');
            setCheckInMood(2);
            setCheckInNotes('');
        } catch (err) {
            alert('Errore nel salvataggio del progresso');
        }
    };

    // Gestisce l'eliminazione di un goal
    const handleDelete = async (goal: GoalWithProgress) => {
        if (confirm(`Eliminare "${goal.title}" e tutti i suoi progressi?`)) {
            try {
                await deleteGoal(goal.id);
            } catch (err) {
                alert('Errore nell\'eliminazione');
            }
        }
    };

    // Calcola giorni rimanenti
    const getDaysRemaining = (deadline: string) => {
        const today = new Date();
        const deadlineDate = new Date(deadline);
        const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 rounded-full border-primary-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center rounded-lg bg-red-500/20 text-red-400">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-slide-up">
            {/* HEADER */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="mb-1 text-3xl font-bold text-white">🎯 Obiettivi</h2>
                    <p className="text-white/50">Traccia i tuoi progressi verso i tuoi goal</p>
                </div>

                <button
                    onClick={() => setShowWizard(true)}
                    className="flex items-center gap-2 btn-primary"
                >
                    <PlusIcon size={18} />
                    Nuovo Obiettivo
                </button>
            </div>

            {/* STATISTICHE RAPIDE */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="p-4 card-glass">
                    <div className="text-2xl font-bold text-white">{stats.totalGoals}</div>
                    <div className="text-sm text-white/50">Totale Obiettivi</div>
                </div>
                <div className="p-4 card-glass">
                    <div className="text-2xl font-bold text-primary-400">{stats.activeGoals}</div>
                    <div className="text-sm text-white/50">Attivi</div>
                </div>
                <div className="p-4 card-glass">
                    <div className="text-2xl font-bold text-green-400">{stats.completedGoals}</div>
                    <div className="text-sm text-white/50">Completati</div>
                </div>
                <div className="p-4 card-glass">
                    <div className="text-2xl font-bold text-yellow-400">{stats.totalCheckIns}</div>
                    <div className="text-sm text-white/50">Check-in Totali</div>
                </div>
            </div>

            {/* LISTA OBIETTIVI */}
            {goals.length === 0 ? (
                <div className="py-12 text-center card-glass">
                    <TargetIcon size={48} />
                    <h3 className="mt-4 text-lg font-medium text-white">Nessun obiettivo attivo</h3>
                    <p className="mt-2 text-white/50">Crea il tuo primo obiettivo per iniziare a tracciare i progressi!</p>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="mt-4 btn-primary"
                    >
                        Crea Obiettivo
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {goals.map((goal) => {
                        const category = GOAL_CATEGORIES[goal.category];
                        const daysRemaining = getDaysRemaining(goal.deadline);
                        const isExpired = daysRemaining < 0;
                        const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;

                        return (
                            <div key={goal.id} className="p-5 card-glass">
                                <div className="flex items-start justify-between gap-4">
                                    {/* Info Goal */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xl">{category.emoji}</span>
                                            <h3 className="text-lg font-semibold text-white">{goal.title}</h3>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${category.color} bg-white/10`}>
                                                {category.label}
                                            </span>
                                        </div>

                                        {goal.description && (
                                            <p className="mb-3 text-sm text-white/50">{goal.description}</p>
                                        )}

                                        {/* Barra Progresso (solo per target) */}
                                        {goal.type === 'target' && goal.targetValue && (
                                            <div className="mb-3">
                                                <div className="flex justify-between mb-1 text-sm">
                                                    <span className="text-white/60">
                                                        {goal.totalProgress} / {goal.targetValue} {goal.unit}
                                                    </span>
                                                    <span className="font-medium text-primary-400">
                                                        {goal.percentage}%
                                                    </span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                                    <div
                                                        className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
                                                        style={{ width: `${goal.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Info Scadenza */}
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className={`${isExpired ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-white/50'}`}>
                                                {isExpired
                                                    ? `⚠️ Scaduto da ${Math.abs(daysRemaining)} giorni`
                                                    : `📅 ${daysRemaining} giorni rimanenti`}
                                            </span>
                                            {goal.type === 'habit' && goal.frequency && (
                                                <span className="text-white/50">
                                                    🔄 {goal.frequency}x / settimana
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Azioni */}
                                    <div className="flex items-center gap-2">
                                        {/* Bottone Check-in */}
                                        <button
                                            onClick={() => setCheckInGoalId(checkInGoalId === goal.id ? null : goal.id)}
                                            className="flex items-center gap-1 px-3 py-2 text-sm transition-colors rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30"
                                        >
                                            <PlusIcon size={16} />
                                            Check-in
                                        </button>

                                        {/* Bottone Elimina */}
                                        <button
                                            onClick={() => handleDelete(goal)}
                                            className="p-2 transition-colors rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/20"
                                        >
                                            <TrashIcon size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Form Check-in (espandibile) */}
                                {checkInGoalId === goal.id && (
                                    <div className="pt-4 mt-4 border-t border-white/10">
                                        <div className="flex flex-wrap items-end gap-4">
                                            {/* Valore */}
                                            <div className="flex-1 min-w-[120px]">
                                                <label className="block mb-1 text-sm text-white/60">
                                                    Progresso ({goal.unit})
                                                </label>
                                                <input
                                                    type="number"
                                                    value={checkInValue}
                                                    onChange={(e) => setCheckInValue(e.target.value)}
                                                    placeholder={`Es: ${goal.type === 'habit' ? '1' : '50'}`}
                                                    className="w-full input"
                                                />
                                            </div>

                                            {/* Mood */}
                                            <div>
                                                <label className="block mb-1 text-sm text-white/60">Come ti senti?</label>
                                                <div className="flex gap-2">
                                                    {([1, 2, 3] as Mood[]).map((mood) => (
                                                        <button
                                                            key={mood}
                                                            onClick={() => setCheckInMood(mood)}
                                                            className={`p-2 text-xl rounded-lg transition-colors ${
                                                                checkInMood === mood
                                                                    ? 'bg-primary-500/30 ring-2 ring-primary-500'
                                                                    : 'bg-white/5 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {MOOD_OPTIONS[mood].emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Note */}
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block mb-1 text-sm text-white/60">Note (opzionale)</label>
                                                <input
                                                    type="text"
                                                    value={checkInNotes}
                                                    onChange={(e) => setCheckInNotes(e.target.value)}
                                                    placeholder="Come è andata?"
                                                    className="w-full input"
                                                />
                                            </div>

                                            {/* Submit */}
                                            <button
                                                onClick={() => handleCheckInSubmit(goal.id)}
                                                disabled={!checkInValue}
                                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Salva
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* WIZARD MODALE */}
            {showWizard && <GoalWizard onClose={() => setShowWizard(false)} />}
        </div>
    );
};
