/**
 * 📂 PROJECT CARD
 * ===============
 * 
 * Card singolo progetto con info e statistiche.
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFolder, FiClock } from 'react-icons/fi';
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
    
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Oggi';
        if (diffDays === 1) return 'Ieri';
        if (diffDays < 7) return `${diffDays} giorni fa`;
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
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

                    {/* STATISTICHE */}
                    <div className="flex items-center gap-4 text-xs text-white/50">
                        <div className="flex items-center gap-1">
                            <FiClock size={14} />
                            <span>{entriesCount} {entriesCount === 1 ? 'entry' : 'entries'}</span>
                        </div>
                        {lastEntryDate && (
                            <span>Ultimo: {formatDate(lastEntryDate)}</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
