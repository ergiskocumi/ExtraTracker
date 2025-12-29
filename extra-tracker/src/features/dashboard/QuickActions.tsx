import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiCopy, FiPlus, FiClock, FiCalendar, FiChevronDown } from 'react-icons/fi';
import type { WorkLog } from '../tracker/type';
import type { Project } from '../projects/type';

interface QuickActionsProps {
    logs: WorkLog[];
    projects: Project[];
    onQuickAdd: (projectId: string, hours: number) => void;
    onDuplicate: (log: WorkLog) => void;
}

// Preset orari comuni
const TIME_PRESETS = [
    { label: '1h', hours: 1, description: 'Sessione breve' },
    { label: '2h', hours: 2, description: 'Mezza mattina' },
    { label: '4h', hours: 4, description: 'Mezza giornata' },
    { label: '8h', hours: 8, description: 'Giornata intera' },
];

export const QuickActions = ({ logs, projects, onQuickAdd, onDuplicate }: QuickActionsProps) => {
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);

    // Trova gli ultimi 3 log unici per progetto
    const recentLogs = logs
        .slice()
        .reverse()
        .reduce((acc: WorkLog[], log) => {
            if (!acc.find(l => l.projectId === log.projectId) && acc.length < 3) {
                acc.push(log);
            }
            return acc;
        }, []);

    const selectedProjectData = projects.find(p => p.id === selectedProject);

    const handleQuickAdd = (hours: number) => {
        if (selectedProject) {
            onQuickAdd(selectedProject, hours);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <FiZap className="text-amber-400" size={16} />
                </div>
                <div>
                    <h3 className="font-semibold text-white">Azioni Rapide</h3>
                    <p className="text-xs text-white/50">Aggiungi velocemente le tue ore</p>
                </div>
            </div>

            {/* Project Selector */}
            <div className="mb-4">
                <label className="block mb-2 text-xs font-medium text-white/60">
                    <FiClock className="inline mr-1" size={12} />
                    Seleziona progetto
                </label>
                <div className="relative">
                    <button
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-left"
                    >
                        <span className={selectedProjectData ? 'text-white' : 'text-white/50'}>
                            {selectedProjectData?.name || 'Scegli un progetto...'}
                        </span>
                        <FiChevronDown className={`text-white/50 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                        {showProjectDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-20 w-full mt-2 py-2 rounded-xl bg-dark-800 border border-white/[0.1] shadow-xl"
                            >
                                {projects.map(project => (
                                    <button
                                        key={project.id}
                                        onClick={() => {
                                            setSelectedProject(project.id);
                                            setShowProjectDropdown(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">
                                                {project.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{project.name}</p>
                                            <p className="text-xs text-white/50">€{project.rate}/h</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Quick Time Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {TIME_PRESETS.map(preset => (
                    <button
                        key={preset.label}
                        onClick={() => handleQuickAdd(preset.hours)}
                        disabled={!selectedProject}
                        className={`py-3 px-2 rounded-xl text-center transition-all ${
                            selectedProject
                                ? 'bg-primary-500/20 border border-primary-500/30 hover:bg-primary-500/30 text-primary-300'
                                : 'bg-white/[0.03] border border-white/[0.06] text-white/30 cursor-not-allowed'
                        }`}
                    >
                        <FiPlus className="mx-auto mb-1" size={14} />
                        <span className="text-sm font-semibold">{preset.label}</span>
                    </button>
                ))}
            </div>

            {/* Recent Logs - Quick Duplicate */}
            {recentLogs.length > 0 && (
                <div className="pt-4 border-t border-white/[0.06]">
                    <p className="flex items-center gap-1 mb-3 text-xs font-medium text-white/60">
                        <FiCalendar size={12} />
                        Duplica recenti
                    </p>
                    <div className="space-y-2">
                        {recentLogs.map(log => {
                            const project = projects.find(p => p.id === log.projectId);
                            if (!project) return null;
                            
                            const start = new Date(`2000-01-01T${log.startTime}`);
                            const end = new Date(`2000-01-01T${log.endTime}`);
                            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            
                            return (
                                <button
                                    key={log.id}
                                    onClick={() => onDuplicate(log)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center">
                                            <span className="text-xs font-bold text-blue-300">
                                                {project.name.charAt(0)}
                                            </span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-white">{project.name}</p>
                                            <p className="text-xs text-white/50">
                                                {log.startTime} - {log.endTime} ({hours.toFixed(1)}h)
                                            </p>
                                        </div>
                                    </div>
                                    <FiCopy className="text-white/30 group-hover:text-primary-400 transition-colors" size={16} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </motion.div>
    );
};
