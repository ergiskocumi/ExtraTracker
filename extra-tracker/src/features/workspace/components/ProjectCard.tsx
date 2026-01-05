/**
 * 📂 PROJECT CARD
 * ===============
 * 
 * Card singolo progetto con info e statistiche.
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFolder, FiClock, FiTrendingUp, FiCalendar } from 'react-icons/fi';
import type { WorkProject } from '../types';

interface ProjectCardProps {
    project: WorkProject;
    isSelected: boolean;
    onClick: () => void;
}

export const ProjectCard = ({ project, isSelected, onClick }: ProjectCardProps) => {
    const navigate = useNavigate();
    const entriesCount = project.entriesCount ?? 0;
    const lastEntryDate = project.lastEntryDate;
    const totalDuration = project.totalDuration ?? 0; // in minuti
    const streak = project.streak ?? 0;
    
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'oggi';
        if (diffDays === 1) return 'ieri';
        if (diffDays < 7) return `${diffDays} giorni fa`;
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    };
    
    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Se c'è un onClick custom, usa quello, altrimenti naviga al dettaglio
        if (onClick) {
            onClick();
        } else {
            navigate(`/workspace/project/${project.id}`);
        }
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCardClick}
            className={`
                card p-4 cursor-pointer transition-all
                ${isSelected 
                    ? 'border-2 border-primary-500/50 bg-primary-500/10' 
                    : 'border border-white/10 hover:border-white/20 hover:bg-white/5'
                }
            `}
        >
            <div className="flex items-start gap-3">
                {/* ICONA */}
                <div
                    className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl"
                    style={{ backgroundColor: `${project.color}20`, color: project.color }}
                >
                    {project.icon || <FiFolder />}
                </div>

                {/* CONTENUTO */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-white truncate mb-1">
                        {project.name}
                    </h4>
                    
                    {project.description && (
                        <p className="text-sm text-white/60 line-clamp-2 mb-2">
                            {project.description}
                        </p>
                    )}

                    {/* STATISTICHE RAPIDE */}
                    <div className="space-y-2 mt-2">
                        {/* Prima riga: Entries e Durata */}
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5 text-white/70">
                                <span className="text-base">📊</span>
                                <span className="font-medium">{entriesCount} {entriesCount === 1 ? 'entry' : 'entries'}</span>
                            </div>
                            {totalDuration > 0 && (
                                <div className="flex items-center gap-1.5 text-white/70">
                                    <FiClock size={12} />
                                    <span className="font-medium">{formatDuration(totalDuration)}</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Seconda riga: Streak e Ultimo */}
                        {(streak > 0 || lastEntryDate) && (
                            <div className="flex items-center gap-3 text-xs">
                                {streak > 0 && (
                                    <div className="flex items-center gap-1.5 text-emerald-400">
                                        <FiTrendingUp size={12} />
                                        <span className="font-medium">Streak: {streak} {streak === 1 ? 'giorno' : 'giorni'}</span>
                                    </div>
                                )}
                                {lastEntryDate && (
                                    <div className="flex items-center gap-1.5 text-white/60">
                                        <FiCalendar size={12} />
                                        <span>Ultimo: {formatDate(lastEntryDate)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
