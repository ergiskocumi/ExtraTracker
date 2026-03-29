import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    CheckCircle2,
    Gauge,
    Clock3,
} from 'lucide-react';
import type { ProgressData, LogEntry } from '../../../hooks/useMagicGenerate';
import { PIPELINE_PHASES, stepLabel } from '../../../hooks/useMagicGenerate';

interface StepProgressProps {
    progress: ProgressData;
    logs: LogEntry[];
    logsEndRef: React.RefObject<HTMLDivElement>;
    pipelineProgress: number;
    currentStepPosition: number;
    elapsedSeconds: number;
    cardsPerMinute: number | null;
    getPhaseState: (phaseIndex: number) => 'done' | 'active' | 'pending';
    formatTime: (seconds: number) => string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
    progress,
    logs,
    logsEndRef,
    pipelineProgress,
    currentStepPosition,
    elapsedSeconds,
    cardsPerMinute,
    getPhaseState,
    formatTime,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 lg:grid-cols-12"
        >
            <section className="lg:col-span-8 space-y-4">
                {/* Control Center */}
                <div className="rounded-2xl border border-theme-default bg-theme-surface/80 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.15em] text-theme-muted mb-1">Control Center</p>
                            <h3 className="text-xl font-semibold text-theme-primary tracking-tight">
                                {stepLabel[progress.step]}
                            </h3>
                            <p className="text-sm text-theme-muted mt-1">
                                {progress.message || 'Elaborazione in corso...'}
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
                            <Gauge className="w-4 h-4 text-primary-600 dark:text-primary-300" />
                            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                                {pipelineProgress}%
                            </span>
                        </div>
                    </div>

                    <div className="h-2 rounded-full bg-theme-elevated overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pipelineProgress}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-primary-500 via-violet-500 to-amber-500"
                        />
                    </div>
                </div>

                {/* Pipeline Phases Grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                    {PIPELINE_PHASES.map((phase, index) => {
                        const state = getPhaseState(index);
                        const PhaseIcon = phase.icon;
                        const isActive = state === 'active';
                        const isDone = state === 'done';

                        return (
                            <div
                                key={phase.key}
                                className={`rounded-xl border p-3 transition-all ${
                                    isActive
                                        ? 'border-primary-500/45 bg-primary-500/10'
                                        : isDone
                                            ? 'border-emerald-500/35 bg-emerald-500/10'
                                            : 'border-theme-default bg-theme-elevated/50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-1.5 rounded-lg ${
                                        isDone
                                            ? 'bg-emerald-500/20'
                                            : isActive
                                                ? `bg-gradient-to-br ${phase.accent} text-white`
                                                : 'bg-theme-surface'
                                    }`}>
                                        {isDone ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                            <PhaseIcon className="w-4 h-4 text-current" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-theme-primary">{phase.label}</p>
                                        <p className="text-xs text-theme-muted">{phase.description}</p>
                                        <p className={`text-[11px] mt-1 font-medium ${
                                            isDone
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : isActive
                                                    ? 'text-primary-700 dark:text-primary-300'
                                                    : 'text-theme-muted'
                                        }`}>
                                            {isDone ? 'Completato' : isActive ? 'In esecuzione' : 'In coda'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Event Stream / Logs */}
                <div className="rounded-2xl border border-theme-default bg-theme-surface/80 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-theme-muted">Event Stream</p>
                        <span className="text-xs text-theme-muted">{logs.length} eventi</span>
                    </div>
                    {logs.length === 0 ? (
                        <p className="text-xs text-theme-muted">Nessun evento ancora registrato.</p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            <AnimatePresence>
                                {logs.map((log) => {
                                    const LogIcon = log.icon || FileText;
                                    return (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="rounded-lg border border-theme-subtle bg-theme-elevated/80 px-3 py-2"
                                        >
                                            <div className="flex items-start gap-2">
                                                <LogIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                                                    log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                                                    log.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                                    log.type === 'analysis' ? 'text-primary-600 dark:text-primary-400' :
                                                    'text-theme-muted'
                                                }`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-theme-secondary leading-relaxed">{log.message}</p>
                                                    <p className="text-[10px] text-theme-muted mt-1">
                                                        {new Date(log.timestamp).toLocaleTimeString('it-IT', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>
            </section>

            {/* Telemetry Sidebar */}
            <aside className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl border border-theme-default bg-theme-surface/80 p-4 space-y-3">
                    <p className="text-xs font-semibold text-theme-secondary uppercase tracking-[0.14em]">Telemetria</p>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                            <p className="text-[11px] text-theme-muted mb-1">Flashcard</p>
                            <p className="text-2xl font-semibold text-theme-primary">{progress.generatedCount || 0}</p>
                        </div>
                        <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                            <p className="text-[11px] text-theme-muted mb-1">Fase</p>
                            <p className="text-sm font-semibold text-theme-primary">{currentStepPosition}/5</p>
                        </div>
                        <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                            <p className="text-[11px] text-theme-muted mb-1">Tempo</p>
                            <div className="flex items-center gap-1.5">
                                <Clock3 className="w-3.5 h-3.5 text-theme-muted" />
                                <p className="text-sm font-semibold text-theme-primary">{formatTime(elapsedSeconds)}</p>
                            </div>
                        </div>
                        <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                            <p className="text-[11px] text-theme-muted mb-1">Velocità</p>
                            <p className="text-sm font-semibold text-theme-primary">
                                {cardsPerMinute ? `${cardsPerMinute}/min` : '--'}
                            </p>
                        </div>
                    </div>

                    {progress.totalChunks ? (
                        <div className="rounded-xl border border-theme-subtle bg-theme-elevated/70 p-3">
                            <p className="text-[11px] text-theme-muted mb-1">Sezioni elaborate</p>
                            <p className="text-sm font-semibold text-theme-primary">
                                {(progress.currentChunk || 0)} / {progress.totalChunks}
                            </p>
                        </div>
                    ) : null}

                    {progress.currentTopic ? (
                        <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 p-3">
                            <p className="text-[11px] text-primary-700 dark:text-primary-300 mb-1">Topic in lavorazione</p>
                            <p className="text-sm font-medium text-primary-700 dark:text-primary-200">{progress.currentTopic}</p>
                        </div>
                    ) : null}
                </div>

                {progress.blueprint?.mainTopics && progress.blueprint.mainTopics.length > 0 ? (
                    <div className="rounded-2xl border border-theme-default bg-theme-surface/80 p-4">
                        <p className="text-xs font-semibold text-theme-secondary mb-2">Argomenti individuati</p>
                        <div className="flex flex-wrap gap-1.5">
                            {progress.blueprint.mainTopics.slice(0, 8).map((topic, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-1 rounded-md bg-primary-500/10 border border-primary-500/20 text-[11px] text-primary-700 dark:text-primary-300"
                                >
                                    {topic}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}
            </aside>
        </motion.div>
    );
};

export default StepProgress;
