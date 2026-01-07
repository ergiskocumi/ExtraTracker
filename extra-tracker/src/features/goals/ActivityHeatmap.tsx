import { useMemo } from 'react';
import type { CheckIn } from '../goals/types';

interface ActivityHeatmapProps {
    checkIns: CheckIn[];
    startDate: string;
}

/**
 * Activity Heatmap - Calendario stile GitHub
 * Mostra quali giorni hai lavorato all'obiettivo
 */
export const ActivityHeatmap = ({ checkIns }: Omit<ActivityHeatmapProps, 'startDate'>) => {
    // OTTIMIZZATO: Memoizza tutti i calcoli costosi
    const { weeksArray, activeDaysCount, streak } = useMemo(() => {
        // Genera gli ultimi 12 settimane (84 giorni)
        const weeks = 12;
        const daysPerWeek = 7;
        const totalDays = weeks * daysPerWeek;
        
        const today = new Date();
        const startDay = new Date(today);
        startDay.setDate(today.getDate() - totalDays + 1);
        
        // Crea mappa giorno -> valore check-in
        const checkInMap = new Map<string, number>();
        checkIns.forEach((ci) => {
            const date = new Date(ci.date).toISOString().split('T')[0];
            checkInMap.set(date, (checkInMap.get(date) || 0) + ci.value);
        });
        
        // Trova il valore massimo per normalizzare i colori
        const maxValue = Math.max(...Array.from(checkInMap.values()), 1);
        
        // Genera i giorni
        const days: Array<{ date: Date; value: number; intensity: number }> = [];
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDay);
            date.setDate(startDay.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const value = checkInMap.get(dateStr) || 0;
            const intensity = value > 0 ? Math.ceil((value / maxValue) * 4) : 0;
            days.push({ date, value, intensity });
        }
        
        // Organizza per settimane
        const weeksArray: typeof days[] = [];
        for (let i = 0; i < weeks; i++) {
            weeksArray.push(days.slice(i * daysPerWeek, (i + 1) * daysPerWeek));
        }

        const activeDaysCount = days.filter(d => d.value > 0).length;
        const streak = calculateStreak(checkIns);

        return { weeksArray, activeDaysCount, streak };
    }, [checkIns]);
    
    const today = new Date();
    
    // Colori intensità (0 = nessuno, 1-4 = progressivo)
    const getColor = (intensity: number) => {
        switch (intensity) {
            case 0: return 'bg-white/5';
            case 1: return 'bg-primary-500/20';
            case 2: return 'bg-primary-500/40';
            case 3: return 'bg-primary-500/60';
            case 4: return 'bg-primary-500';
            default: return 'bg-white/5';
        }
    };
    
    // Giorni della settimana
    const dayLabels = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
    
    return (
        <div className="p-5 card-glass">
            <h4 className="mb-4 text-sm font-medium text-white/60">🗓️ Attività (ultimi 3 mesi)</h4>
            
            <div className="flex gap-1">
                {/* Labels giorni */}
                <div className="flex flex-col justify-between mr-2 text-xs text-white/40">
                    {dayLabels.map((label, idx) => (
                        <div key={idx} className="h-3 leading-3">
                            {label}
                        </div>
                    ))}
                </div>
                
                {/* Griglia settimane */}
                <div className="flex gap-1 overflow-x-auto">
                    {weeksArray.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1">
                            {week.map((day, dayIdx) => {
                                const isToday = day.date.toDateString() === today.toDateString();
                                const isFuture = day.date > today;
                                
                                return (
                                    <div
                                        key={dayIdx}
                                        className={`w-3 h-3 rounded-sm transition-all ${
                                            isFuture
                                                ? 'bg-white/5 opacity-30'
                                                : getColor(day.intensity)
                                        } ${
                                            isToday ? 'ring-1 ring-white/50' : ''
                                        }`}
                                        title={`${day.date.toLocaleDateString('it-IT')} - ${
                                            day.value > 0 ? `${day.value} check-in` : 'Nessuna attività'
                                        }`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Legenda */}
            <div className="flex items-center justify-between mt-4 text-xs text-white/50">
                <span>Meno attivo</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-white/5" />
                    <div className="w-3 h-3 rounded-sm bg-primary-500/20" />
                    <div className="w-3 h-3 rounded-sm bg-primary-500/40" />
                    <div className="w-3 h-3 rounded-sm bg-primary-500/60" />
                    <div className="w-3 h-3 rounded-sm bg-primary-500" />
                </div>
                <span>Più attivo</span>
            </div>
            
            {/* Statistiche */}
            <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-white/10">
                <div className="text-center">
                    <div className="text-lg font-bold text-white">
                        {checkIns.length}
                    </div>
                    <div className="text-xs text-white/50">Check-in totali</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-primary-400">
                        {activeDaysCount}
                    </div>
                    <div className="text-xs text-white/50">Giorni attivi</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-green-400">
                        {streak}
                    </div>
                    <div className="text-xs text-white/50">Streak 🔥</div>
                </div>
            </div>
        </div>
    );
};

// Calcola la streak corrente (giorni consecutivi con check-in)
const calculateStreak = (checkIns: CheckIn[]): number => {
    if (checkIns.length === 0) return 0;
    
    // Ordina per data decrescente
    const sorted = [...checkIns].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Crea set di date uniche
    const uniqueDates = new Set(
        sorted.map(ci => new Date(ci.date).toISOString().split('T')[0])
    );
    
    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    
    // Verifica che ci sia attività oggi o ieri (altrimenti la streak è rotta)
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (!uniqueDates.has(todayStr) && !uniqueDates.has(yesterdayStr)) {
        return 0;
    }
    
    // Conta i giorni consecutivi andando indietro
    while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (uniqueDates.has(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
};
