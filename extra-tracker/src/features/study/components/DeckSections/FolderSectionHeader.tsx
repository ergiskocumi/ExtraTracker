import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Folder, 
    MoreVertical, 
    TrendingUp, 
    Clock, 
    Target,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import type { FolderSection } from '../../hooks/useOrganizedDecks';

// ============================================
// TYPES
// ============================================

interface FolderSectionHeaderProps {
    folderSection: FolderSection;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onViewFolder?: (folderId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export const FolderSectionHeader: React.FC<FolderSectionHeaderProps> = ({
    folderSection,
    isCollapsed,
    onToggleCollapse,
    onViewFolder,
}) => {
    const { folder, stats } = folderSection;
    const [showMenu, setShowMenu] = useState(false);

    const masteryColor = stats.masteryPercent >= 80 
        ? 'text-emerald-400' 
        : stats.masteryPercent >= 50 
        ? 'text-blue-400' 
        : 'text-primary-400';

    const dueColor = stats.dueCards > 0 ? 'text-orange-400' : 'text-white/50';

    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
                {/* Collapse Toggle */}
                <button
                    onClick={onToggleCollapse}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-white/60" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-white/60" />
                    )}
                </button>

                {/* Folder Icon */}
                <div 
                    className="p-2 rounded-lg bg-primary-500/20 border border-primary-500/30 flex-shrink-0"
                    style={{
                        backgroundColor: folder.color ? `${folder.color}20` : undefined,
                        borderColor: folder.color ? `${folder.color}40` : undefined,
                    }}
                >
                    <Folder 
                        className="w-5 h-5 text-primary-400"
                        style={{
                            color: folder.color || undefined,
                        }}
                    />
                </div>

                {/* Title & Stats */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-semibold text-white truncate">
                            {folder.name}
                        </h2>
                        {onViewFolder && (
                            <button
                                onClick={() => onViewFolder(folder.id)}
                                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                            >
                                Vedi tutto
                            </button>
                        )}
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="flex items-center gap-4 text-xs">
                        {/* Total Cards */}
                        <div className="flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-white/50" />
                            <span className="text-white/70">
                                {stats.totalCards} carte
                            </span>
                        </div>

                        {/* Mastery */}
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className={`w-3.5 h-3.5 ${masteryColor}`} />
                            <span className={masteryColor}>
                                {stats.masteryPercent}% padronanza
                            </span>
                        </div>

                        {/* Due Cards */}
                        {stats.dueCards > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Clock className={`w-3.5 h-3.5 ${dueColor}`} />
                                <span className={dueColor}>
                                    {stats.dueCards} da ripassare
                                </span>
                            </div>
                        )}

                        {/* Total Decks */}
                        <div className="flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5 text-white/50" />
                            <span className="text-white/70">
                                {stats.totalDecks} {stats.totalDecks === 1 ? 'mazzo' : 'mazzi'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Menu */}
            <div className="relative">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                    <MoreVertical className="w-5 h-5 text-white/50" />
                </button>

                {showMenu && (
                    <>
                        <div 
                            className="fixed inset-0 z-10"
                            onClick={() => setShowMenu(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-zinc-900/95 border border-white/10 
                                     backdrop-blur-xl shadow-xl z-20 py-2"
                        >
                            <button
                                onClick={() => {
                                    onViewFolder?.(folder.id);
                                    setShowMenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5 transition-colors"
                            >
                                Apri cartella
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: Implementare "Studia tutti i deck della cartella"
                                    setShowMenu(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/5 transition-colors"
                            >
                                Studia tutti
                            </button>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
};
