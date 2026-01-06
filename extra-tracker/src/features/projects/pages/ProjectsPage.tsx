import { useMemo, useState } from 'react';
import { useProjects } from '../context/ProjectsContext';
import type { ProjectHealthStatus } from '../type';
import { useFormat } from '../../../shared/hooks/useFormat';
import { ClockIcon, CurrencyIcon, WarningIcon, ChartIcon } from '../../../shared/components/icons';
import { ProjectHealthCard } from '../components/ProjectHealthCard';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { FiPlus, FiFolder } from 'react-icons/fi';

export const ProjectsPage = () => {
    const { projects, addProject, loading, error } = useProjects();
    const { formatMoney, formatHours } = useFormat();
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const activeProjects = orderedProjects.filter(p => p.status !== 'archived');

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header con bottone Nuovo Progetto */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-primary-300/80">Control room</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Project Health Monitoring</h1>
                    <p className="text-white/60 max-w-2xl">
                        Tieni sotto controllo burn rate, budget e segnali di rischio per ogni cliente in tempo reale.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30"
                >
                    <FiPlus size={18} />
                    <span className="hidden sm:inline">Nuovo Progetto</span>
                </button>
            </div>

            {error && (
                <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-100 text-sm">
                    {error}
                </div>
            )}

            {/* Top Stats Cards */}
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

            {/* Projects Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-white">Stato progetti</h2>
                        <p className="text-sm text-white/50">Priorità ordinate per livello di rischio</p>
                    </div>
                    {loading && <span className="text-xs text-white/40">Aggiornamento in corso...</span>}
                </div>

                {/* Empty State */}
                {activeProjects.length === 0 && !loading ? (
                    <div className="card p-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10">
                                <FiFolder className="text-4xl text-white/40" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-white">Nessun progetto</h3>
                                <p className="text-white/60 max-w-md">
                                    Inizia creando il tuo primo progetto per monitorare le ore lavorate e il budget.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="mt-4 flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-all shadow-lg shadow-primary-500/20"
                            >
                                <FiPlus size={18} />
                                <span>Crea il primo progetto</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Responsive Grid: 1 col mobile, 2 tablet, 3 desktop */
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {activeProjects.map(project => (
                            <ProjectHealthCard key={project.id} project={project} />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal per nuovo progetto */}
            <ProjectFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                projects={projects}
                onAdd={addProject}
            />
        </div>
    );
};
