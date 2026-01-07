import { useNavigate } from 'react-router-dom';
import type { Project, ProjectHealthStatus } from '../type';
import { useFormat } from '../../../shared/hooks/useFormat';
import { FiArrowRight } from 'react-icons/fi';

const HEALTH_STYLES: Record<ProjectHealthStatus, { label: string; badge: string; progress: string }> = {
    healthy: {
        label: 'Healthy',
        badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
        progress: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
    },
    warning: {
        label: 'Attention',
        badge: 'bg-amber-500/15 text-amber-200 border border-amber-500/20',
        progress: 'bg-gradient-to-r from-amber-400 to-amber-500',
    },
    critical: {
        label: 'Critical',
        badge: 'bg-rose-500/15 text-rose-200 border border-rose-500/20',
        progress: 'bg-gradient-to-r from-rose-500 to-red-500',
    },
    unknown: {
        label: 'Setup Needed',
        badge: 'bg-slate-500/15 text-slate-200 border border-slate-500/20',
        progress: 'bg-gradient-to-r from-slate-400 to-slate-500',
    },
};

interface ProjectHealthCardProps {
    project: Project;
}

export const ProjectHealthCard = ({ project }: ProjectHealthCardProps) => {
    const navigate = useNavigate();
    const { formatMoney, formatHours, formatDateLong } = useFormat();
    
    const metrics = project.metrics;
    const estimatedHours = project.estimatedHours ?? 0;
    const totalHours = metrics?.totalHours ?? 0;
    
    // Calcola percentuale di utilizzo ore
    const usagePercent = estimatedHours > 0 
        ? Math.min(100, (totalHours / estimatedHours) * 100)
        : 0;
    
    // Determina status basato su percentuale e budget
    let status: ProjectHealthStatus = 'unknown';
    if (project.type === 'PERSONAL') {
        // Per progetti personali, mostra sempre healthy se ci sono dati
        status = totalHours > 0 ? 'healthy' : 'unknown';
    } else {
        // Per progetti CLIENT, calcola status basato su percentuale
        if (estimatedHours > 0) {
            if (usagePercent < 75) {
                status = 'healthy';
            } else if (usagePercent >= 75 && usagePercent <= 90) {
                status = 'warning';
            } else {
                status = 'critical';
            }
        } else {
            status = 'unknown';
        }
        
        // Se supera il budget (se presente), sempre critical
        if (project.budget && metrics?.totalEarnings) {
            if (metrics.totalEarnings > project.budget) {
                status = 'critical';
            }
        }
    }
    
    const styles = HEALTH_STYLES[status];
    const progress = metrics?.progress ?? project.progress ?? 0;
    const earnings = metrics?.totalEarnings ?? (project.type === 'CLIENT' ? totalHours * (project.rate || 0) : 0);
    const lastLogLabel = metrics?.lastLog ? formatDateLong(metrics.lastLog) : 'Mai';
    const message = metrics?.velocityMessage ?? 'Inizia a tracciare log per vedere insight.';

    const handleManageClick = () => {
        navigate(`/workspace?projectId=${project.id}`);
    };

    // Calcola dove "dovresti essere" in base al tempo trascorso (progress marker)
    const idealUsage = estimatedHours > 0 && progress > 0 
        ? Math.round((progress / 100) * 100) // Dove dovresti essere in % di budget se fossi in linea
        : null;

    return (
        <div className={`card p-5 flex flex-col gap-4 border-2 ${
            status === 'critical' ? 'border-rose-500/40 bg-rose-500/5' :
            status === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
            status === 'healthy' ? 'border-emerald-500/30 bg-emerald-500/5' :
            'border-white/10 bg-white/5'
        }`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {project.icon && (
                        <span className="text-2xl flex-shrink-0">{project.icon}</span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-white/40 truncate">{project.code}</p>
                        <h3 className="text-xl font-semibold text-white truncate">{project.name}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        project.type === 'CLIENT' 
                            ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                        {project.type === 'CLIENT' ? 'CLIENT' : 'PERSONAL'}
                    </span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles.badge}`}>
                        {styles.label}
                    </span>
                </div>
            </div>

            <p className="text-sm text-white/60 line-clamp-2 min-h-[38px]">
                {project.description || 'Nessuna descrizione disponibile'}
            </p>

            {/* Health Bar - Solo per progetti CLIENT con stima */}
            {project.type === 'CLIENT' && estimatedHours > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/50">
                        <span>Consumo ore vs Progresso</span>
                        <span>{usagePercent.toFixed(1)}% usato / {progress}% fatto</span>
                    </div>
                    <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
                        {/* Barra consumo ore */}
                        <div 
                            className={`h-full ${styles.progress} transition-all`} 
                            style={{ width: `${Math.min(usagePercent, 100)}%` }} 
                        />
                        {/* Marker: dove dovresti essere */}
                        {idealUsage !== null && (
                            <div 
                                className="absolute top-0 h-full w-0.5 bg-white shadow-lg"
                                style={{ left: `${Math.min(idealUsage, 100)}%` }}
                                title={`Target: ${idealUsage}%`}
                            />
                        )}
                    </div>
                    {idealUsage !== null && (
                        <p className="text-xs text-white/40">
                            ▏= target se in linea ({idealUsage}%)
                        </p>
                    )}
                </div>
            )}

            {/* Per progetti PERSONAL, mostra solo le ore fatte */}
            {project.type === 'PERSONAL' && totalHours > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/50">
                        <span>Ore totali lavorate</span>
                    </div>
                    <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-purple-400 to-purple-500 transition-all" 
                            style={{ width: '100%' }} 
                        />
                    </div>
                </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-white/50 text-xs">Ore loggate</p>
                    <p className="font-semibold text-white">{formatHours(totalHours)}</p>
                </div>
                {project.type === 'CLIENT' ? (
                    <>
                        <div>
                            <p className="text-white/50 text-xs">Stima totale</p>
                            <p className="font-semibold text-white">{estimatedHours ? formatHours(estimatedHours) : 'N/D'}</p>
                        </div>
                        <div>
                            <p className="text-white/50 text-xs">Proiezione finale</p>
                            <p className={`font-semibold ${
                                metrics?.projectedHours && estimatedHours && metrics.projectedHours > estimatedHours 
                                    ? 'text-rose-300' 
                                    : 'text-emerald-300'
                            }`}>
                                {metrics?.projectedHours ? formatHours(metrics.projectedHours) : 'N/D'}
                            </p>
                        </div>
                        <div>
                            <p className="text-white/50 text-xs">Guadagno</p>
                            <p className="font-semibold text-primary-300">{formatMoney(earnings)}</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <p className="text-white/50 text-xs">Log totali</p>
                            <p className="font-semibold text-white">{metrics?.logCount ?? 0}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-white/50 text-xs">Ultimo log</p>
                            <p className="font-semibold text-white text-xs">{lastLogLabel}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Velocity Message - evidenziato */}
            {message && (
                <div className={`text-sm p-3 rounded-lg ${
                    status === 'critical' ? 'bg-rose-500/10 text-rose-200' :
                    status === 'warning' ? 'bg-amber-500/10 text-amber-200' :
                    status === 'healthy' ? 'bg-emerald-500/10 text-emerald-200' :
                    'bg-white/5 text-white/70'
                }`}>
                    {message}
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/5">
                {project.type === 'CLIENT' && <span>Progresso: {progress}%</span>}
                <span>Ultimo log: {lastLogLabel}</span>
            </div>

            {/* BOTTONE GESTISCI */}
            <button
                onClick={handleManageClick}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-300 hover:text-primary-200 transition-all text-sm font-medium"
            >
                <span>Gestisci nel Workspace</span>
                <FiArrowRight size={14} />
            </button>
        </div>
    );
};
