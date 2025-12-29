import type { CheckIn } from '../goals/types';

interface BurndownChartProps {
    checkIns: CheckIn[];
    targetValue: number;
    startDate: string;
    deadline: string;
    unit: string;
}

/**
 * Burndown Chart - Mostra il progresso nel tempo vs l'obiettivo ideale
 * Utile per capire se sei "in pari" o in ritardo
 */
export const BurndownChart = ({ checkIns, targetValue, startDate, deadline, unit }: BurndownChartProps) => {
    // Calcola i punti del grafico
    const start = new Date(startDate);
    const end = new Date(deadline);
    const today = new Date();
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Progresso ideale (linea perfetta)
    const idealProgress = Math.min(100, (daysPassed / totalDays) * 100);
    
    // Progresso reale
    const actualProgress = checkIns.reduce((sum, ci) => sum + ci.value, 0);
    const actualPercentage = Math.min(100, (actualProgress / targetValue) * 100);
    
    // Determina lo stato
    const isAhead = actualPercentage > idealProgress;
    const isBehind = actualPercentage < idealProgress - 10; // Tolleranza 10%
    
    return (
        <div className="p-5 card-glass">
            <h4 className="mb-4 text-sm font-medium text-white/60">📊 Andamento Progresso</h4>
            
            {/* Visualizzazione barre comparative */}
            <div className="space-y-3">
                {/* Barra progresso ideale */}
                <div>
                    <div className="flex justify-between mb-1 text-xs text-white/50">
                        <span>Progresso Ideale</span>
                        <span>{idealProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-white/30"
                            style={{ width: `${idealProgress}%` }}
                        />
                    </div>
                </div>
                
                {/* Barra progresso reale */}
                <div>
                    <div className="flex justify-between mb-1 text-xs">
                        <span className="text-white/50">Progresso Reale</span>
                        <span className={`font-medium ${
                            isAhead ? 'text-green-400' : isBehind ? 'text-red-400' : 'text-primary-400'
                        }`}>
                            {actualPercentage.toFixed(0)}%
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                isAhead 
                                    ? 'bg-gradient-to-r from-green-500 to-green-400'
                                    : isBehind
                                    ? 'bg-gradient-to-r from-red-500 to-red-400'
                                    : 'bg-gradient-to-r from-primary-500 to-primary-400'
                            }`}
                            style={{ width: `${actualPercentage}%` }}
                        />
                    </div>
                </div>
            </div>
            
            {/* Stato e feedback */}
            <div className="flex items-center gap-2 p-3 mt-4 rounded-lg bg-white/5">
                <span className="text-xl">
                    {isAhead ? '🚀' : isBehind ? '⚠️' : '✅'}
                </span>
                <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                        {isAhead && 'Stai andando alla grande!'}
                        {isBehind && 'Devi accelerare un po\''}
                        {!isAhead && !isBehind && 'Sei sulla buona strada'}
                    </div>
                    <div className="text-xs text-white/50">
                        {actualProgress} / {targetValue} {unit} • {totalDays - daysPassed} giorni rimanenti
                    </div>
                </div>
            </div>
            
            {/* Timeline check-ins (ultimi 5) */}
            {checkIns.length > 0 && (
                <div className="pt-4 mt-4 border-t border-white/10">
                    <div className="mb-2 text-xs font-medium text-white/60">Ultimi Check-in</div>
                    <div className="space-y-1.5">
                        {checkIns.slice(0, 5).map((ci) => (
                            <div key={ci.id} className="flex items-center gap-2 text-xs">
                                <span className="text-white/40">
                                    {new Date(ci.date).toLocaleDateString('it-IT', { 
                                        day: '2-digit', 
                                        month: 'short' 
                                    })}
                                </span>
                                <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-primary-500/50"
                                        style={{ 
                                            width: `${Math.min(100, (ci.value / targetValue) * 100 * 10)}%` 
                                        }}
                                    />
                                </div>
                                <span className="font-medium text-white/60">+{ci.value} {unit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
