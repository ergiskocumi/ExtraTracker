import type { CheckIn } from '../goals/types';
import { MOOD_OPTIONS } from '../goals/types';

interface MoodStatsProps {
    checkIns: CheckIn[];
}

/**
 * Mood Statistics - Analizza quando sei più motivato
 */
export const MoodStats = ({ checkIns }: MoodStatsProps) => {
    if (checkIns.length === 0) {
        return (
            <div className="p-5 card-glass">
                <h4 className="mb-4 text-sm font-medium text-white/60">😊 Analisi Motivazione</h4>
                <div className="py-8 text-center text-white/50">
                    <p className="text-sm">Nessun dato disponibile</p>
                </div>
            </div>
        );
    }
    
    // Calcola distribuzione mood
    const moodCounts = { 1: 0, 2: 0, 3: 0 };
    checkIns.forEach((ci) => {
        moodCounts[ci.mood]++;
    });
    
    const total = checkIns.length;
    const moodPercentages = {
        1: (moodCounts[1] / total) * 100,
        2: (moodCounts[2] / total) * 100,
        3: (moodCounts[3] / total) * 100,
    };
    
    // Trova il mood prevalente
    const dominantMood = Object.entries(moodCounts).reduce((a, b) => 
        moodCounts[Number(a[0]) as 1 | 2 | 3] > moodCounts[Number(b[0]) as 1 | 2 | 3] ? a : b
    )[0] as '1' | '2' | '3';
    
    // Media mood (1-3)
    const avgMood = checkIns.reduce((sum, ci) => sum + ci.mood, 0) / total;
    
    // Analizza per giorno della settimana (quando sei più motivato?)
    const dayOfWeekMood: { [key: number]: { total: number; count: number } } = {};
    checkIns.forEach((ci) => {
        const day = new Date(ci.date).getDay(); // 0 = Dom, 1 = Lun, ...
        if (!dayOfWeekMood[day]) dayOfWeekMood[day] = { total: 0, count: 0 };
        dayOfWeekMood[day].total += ci.mood;
        dayOfWeekMood[day].count++;
    });
    
    const bestDay = Object.entries(dayOfWeekMood)
        .map(([day, data]) => ({
            day: Number(day),
            avg: data.total / data.count,
        }))
        .sort((a, b) => b.avg - a.avg)[0];
    
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    
    return (
        <div className="p-5 card-glass">
            <h4 className="mb-4 text-sm font-medium text-white/60">😊 Analisi Motivazione</h4>
            
            {/* Media generale */}
            <div className="p-4 mb-4 rounded-lg bg-white/5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">Motivazione Media</span>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{MOOD_OPTIONS[Number(dominantMood) as 1 | 2 | 3].emoji}</span>
                        <span className="text-lg font-bold text-white">
                            {avgMood.toFixed(1)}/3
                        </span>
                    </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                        className={`h-full rounded-full transition-all ${
                            avgMood >= 2.5
                                ? 'bg-gradient-to-r from-green-500 to-green-400'
                                : avgMood >= 2
                                ? 'bg-gradient-to-r from-primary-500 to-primary-400'
                                : 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                        }`}
                        style={{ width: `${(avgMood / 3) * 100}%` }}
                    />
                </div>
            </div>
            
            {/* Distribuzione mood */}
            <div className="space-y-2 mb-4">
                {([3, 2, 1] as const).map((mood) => (
                    <div key={mood} className="flex items-center gap-3">
                        <span className="text-xl">{MOOD_OPTIONS[mood].emoji}</span>
                        <div className="flex-1">
                            <div className="flex justify-between mb-1 text-xs">
                                <span className="text-white/60">{MOOD_OPTIONS[mood].label}</span>
                                <span className="font-medium text-white">
                                    {moodCounts[mood]} ({moodPercentages[mood].toFixed(0)}%)
                                </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        mood === 3
                                            ? 'bg-green-500'
                                            : mood === 2
                                            ? 'bg-primary-500'
                                            : 'bg-yellow-500'
                                    }`}
                                    style={{ width: `${moodPercentages[mood]}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Insight giorno migliore */}
            {bestDay && (
                <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💡</span>
                        <div className="flex-1 text-xs">
                            <div className="font-medium text-white">Insight</div>
                            <div className="text-white/60">
                                Sei più motivato di {dayNames[bestDay.day].toLowerCase()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Ultime note (se presenti) */}
            {checkIns.some(ci => ci.notes) && (
                <div className="pt-4 mt-4 border-t border-white/10">
                    <div className="mb-2 text-xs font-medium text-white/60">Ultime Riflessioni</div>
                    <div className="space-y-2">
                        {checkIns
                            .filter(ci => ci.notes)
                            .slice(0, 3)
                            .map((ci) => (
                                <div key={ci.id} className="p-2 text-xs rounded-lg bg-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span>{MOOD_OPTIONS[ci.mood].emoji}</span>
                                        <span className="text-white/40">
                                            {new Date(ci.date).toLocaleDateString('it-IT', {
                                                day: '2-digit',
                                                month: 'short',
                                            })}
                                        </span>
                                    </div>
                                    <div className="text-white/70">{ci.notes}</div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};
