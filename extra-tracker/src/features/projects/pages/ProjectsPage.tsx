import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectForm } from '../ProjectForm';
import { useProjects } from '../context/ProjectsContext';
import type { Project, ProjectHealthStatus } from '../type';
import { useFormat } from '../../../shared/hooks/useFormat';
import { ClockIcon, CurrencyIcon, WarningIcon, ChartIcon } from '../../../shared/components/icons';
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

const ProjectHealthCard = ({ project }: { project: Project }) => {
    const navigate = useNavigate();
    const { formatMoney, formatHours, formatDateLong } = useFormat();
    const metrics = project.metrics;
    const estimatedHours = project.estimatedHours ?? 0;
    const progress = metrics?.progress ?? project.progress ?? 0;
    const usagePercent = metrics ? Math.max(0, Math.min(metrics.budgetUsagePercent, 200)) : 0;
    const status: ProjectHealthStatus = metrics?.healthStatus ?? 'unknown';
    const styles = HEALTH_STYLES[status];
    const totalHours = metrics?.totalHours ?? 0;
    const projectedHours = metrics?.projectedHours;
    const earnings = metrics?.totalEarnings ?? totalHours * (project.rate || 0);
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
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-mono text-white/40">{project.code}</p>
                    <h3 className="text-xl font-semibold text-white">{project.name}</h3>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles.badge}`}>
                    {styles.label}
                </span>
            </div>

            <p className="text-sm text-white/60 line-clamp-2 min-h-[38px]">
                {project.description || 'Nessuna descrizione disponibile'}
            </p>

            {/* Barra Progress Comparata */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white/50">
                    <span>Consumo budget vs Progresso</span>
                    <span>{usagePercent}% usato / {progress}% fatto</span>
                </div>
                <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
                    {/* Barra consumo budget */}
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

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-white/50 text-xs">Ore loggate</p>
                    <p className="font-semibold text-white">{formatHours(totalHours)}</p>
                </div>
                <div>
                    <p className="text-white/50 text-xs">Stima totale</p>
                    <p className="font-semibold text-white">{estimatedHours ? formatHours(estimatedHours) : 'N/D'}</p>
                </div>
                <div>
                    <p className="text-white/50 text-xs">Proiezione finale</p>
                    <p className={`font-semibold ${
                        projectedHours && estimatedHours && projectedHours > estimatedHours 
                            ? 'text-rose-300' 
                            : 'text-emerald-300'
                    }`}>
                        {projectedHours ? formatHours(projectedHours) : 'N/D'}
                    </p>
                </div>
                <div>
                    <p className="text-white/50 text-xs">Guadagno</p>
                    <p className="font-semibold text-primary-300">{formatMoney(earnings)}</p>
                </div>
            </div>

            {/* Velocity Message - evidenziato */}
            <div className={`text-sm p-3 rounded-lg ${
                status === 'critical' ? 'bg-rose-500/10 text-rose-200' :
                status === 'warning' ? 'bg-amber-500/10 text-amber-200' :
                status === 'healthy' ? 'bg-emerald-500/10 text-emerald-200' :
                'bg-white/5 text-white/70'
            }`}>
                {message}
            </div>

            <div className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/5">
                <span>Progresso: {progress}%</span>
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

export const ProjectsPage = () => {
    const { projects, addProject, loading, error } = useProjects();
    const { formatMoney, formatHours } = useFormat();

    const stats = useMemo(() => {
        const base = {
            totalHours: 0,
            totalEarnings: 0,
            critical: 0,
            missingEstimates: 0,
            activeProjects: 0,
        };

        return projects.reduce((acc, project) => {
            const metrics = project.metrics;
            if (metrics) {
                acc.totalHours += metrics.totalHours;
                acc.totalEarnings += metrics.totalEarnings ?? metrics.totalHours * (project.rate || 0);
                if (metrics.healthStatus === 'critical') acc.critical += 1;
            }

            if (!project.estimatedHours || project.estimatedHours === 0) {
                acc.missingEstimates += 1;
            }

            if (project.status !== 'archived') {
                acc.activeProjects += 1;
            }

            return acc;
        }, base);
    }, [projects]);

    const orderedProjects = useMemo(() => {
        const priority: Record<ProjectHealthStatus, number> = {
            critical: 0,
            warning: 1,
            healthy: 2,
            unknown: 3,
        };
        return [...projects].sort((a, b) => {
            const aStatus = a.metrics?.healthStatus ?? 'unknown';
            const bStatus = b.metrics?.healthStatus ?? 'unknown';
            return priority[aStatus] - priority[bStatus];
        });
    }, [projects]);

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-primary-300/80">Control room</p>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Project Health Monitoring</h1>
                <p className="text-white/60 max-w-2xl">
                    Tieni sotto controllo burn rate, budget e segnali di rischio per ogni cliente in tempo reale.
                </p>
            </div>

            {error && (
                <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-100 text-sm">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="stat-card glow-effect">
                    <div className="flex items-center gap-4">
                        <div className="icon-container">
                            <ClockIcon className="text-primary-300" size={22} />
                        </div>
                        <div>
                            <p className="text-white/50 text-xs">Ore loggate</p>
                            <p className="text-2xl font-semibold text-white">{formatHours(stats.totalHours)}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card glow-effect">
                    <div className="flex items-center gap-4">
                        <div className="icon-container-accent">
                            <CurrencyIcon className="text-accent-300" size={22} />
                        </div>
                        <div>
                            <p className="text-white/50 text-xs">Valore generato</p>
                            <p className="text-2xl font-semibold text-primary-200">{formatMoney(stats.totalEarnings)}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card glow-effect">
                    <div className="flex items-center gap-4">
                        <div className="icon-container">
                            <WarningIcon className="text-amber-300" size={22} />
                        </div>
                        <div>
                            <p className="text-white/50 text-xs">Progetti critici</p>
                            <p className="text-2xl font-semibold text-white">{stats.critical}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card glow-effect">
                    <div className="flex items-center gap-4">
                        <div className="icon-container">
                            <ChartIcon className="text-primary-300" size={22} />
                        </div>
                        <div>
                            <p className="text-white/50 text-xs">Senza stima</p>
                            <p className="text-2xl font-semibold text-white">{stats.missingEstimates}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-white">Stato progetti</h2>
                            <p className="text-sm text-white/50">Priorità ordinate per livello di rischio</p>
                        </div>
                        {loading && <span className="text-xs text-white/40">Aggiornamento in corso...</span>}
                    </div>

                    {orderedProjects.length === 0 ? (
                        <div className="card p-8 text-center text-white/60">Nessun progetto ancora configurato.</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {orderedProjects.map(project => (
                                <ProjectHealthCard key={project.id} project={project} />
                            ))}
                        </div>
                    )}
                </div>

                <ProjectForm projects={projects} onAdd={addProject} />
            </div>
        </div>
    );
};
