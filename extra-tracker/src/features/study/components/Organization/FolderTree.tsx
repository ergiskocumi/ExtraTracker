/**
 * 📁 FOLDER TREE - Sidebar con albero gerarchico cartelle
 * 
 * Design migliorato con:
 * - Colori e gradienti dinamici per cartelle
 * - Icone contestuali
 * - Badge informativi (mazzi + carte)
 * - Micro-interazioni e animazioni
 * - Feedback visivo per drag & drop
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Folder, 
    FolderOpen, 
    ChevronRight, 
    ChevronDown,
    Plus,
    MoreVertical,
    Edit2,
    Trash2,
    Home,
    Check,
    X as XIcon,
    Clock,
    Zap,
    CheckCircle,
    Star,
    Target,
    Calendar,
    Wand2
} from 'lucide-react';
import { foldersService, type Folder as FolderType } from '../../services/foldersService';
import { emitToast } from '../../../../shared/components/toast';
import { getFolderTheme } from '../../utils/folderTheme';
import { studyOrgBadgeClass, studyOrgButtonClass, studyOrgFieldClass } from '../utils/studyButtonClasses';

interface FolderStats {
    totalCards: number;
    dueCards: number;
    masteryPercent: number;
    totalDecks: number;
}

interface FolderTreeProps {
    folders: FolderType[];
    selectedFolderId: string | null;
    onFolderSelect: (folderId: string | null) => void;
    onRefresh: () => void;
    onDeckDrop?: (deckId: string, folderId: string | null) => void;
    folderStats?: Map<string, FolderStats>;
}

interface FolderItemProps {
    folder: FolderType;
    level: number;
    isExpanded: boolean;
    isSelected: boolean;
    onToggle: () => void;
    onSelect: () => void;
    onRefresh: () => void;
    onDeckDrop?: (deckId: string, folderId: string | null) => void;
    folderStats?: FolderStats;
    folderStatsMap?: Map<string, FolderStats>;
}

const FolderItem: React.FC<FolderItemProps> = ({
    folder,
    level,
    isExpanded,
    isSelected,
    onToggle,
    onSelect,
    onRefresh,
    onDeckDrop,
    folderStats,
    folderStatsMap,
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(folder.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasChildren = folder.children && folder.children.length > 0;
    const hasDecks = (folder.count || 0) > 0;
    const theme = getFolderTheme(folder.name, hasDecks);
    const paddingLeft = `${level * 20 + 12}px`;

    // Calcola priorità visiva (solo per colori, non testi)
    const getPriorityColor = useMemo(() => {
        if (!folderStats || folderStats.totalCards === 0) return 'text-white/70';
        if (folderStats.dueCards === 0) return 'text-emerald-400';
        const ratio = folderStats.dueCards / folderStats.totalCards;
        return ratio > 0.5 ? 'text-amber-400' : 'text-violet-400';
    }, [folderStats]);

    // Verifica se è critico (più del 50% da ripassare)
    const isCritical = useMemo(() => {
        if (!folderStats || folderStats.totalCards === 0) return false;
        return folderStats.dueCards / folderStats.totalCards > 0.5;
    }, [folderStats]);

    // Verifica se c'è una scadenza urgente (entro 24h)
    const isUrgent = useMemo(() => {
        if (!folder.deadline) return false;
        const deadline = new Date(folder.deadline);
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days <= 1 && days >= 0;
    }, [folder.deadline]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (!isDragOver) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        const deckId = e.dataTransfer.getData('deckId') || e.dataTransfer.getData('text/plain');
        
        if (deckId && onDeckDrop) {
            onDeckDrop(deckId, folder.id);
        } else {
            console.warn('[FolderTree] Drop failed:', { 
                deckId, 
                hasHandler: !!onDeckDrop,
            });
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Eliminare la cartella "${folder.name}"? I mazzi verranno spostati nella cartella radice.`)) {
            return;
        }
        setIsDeleting(true);
        try {
            await foldersService.deleteFolder(folder.id);
            emitToast.success('Cartella eliminata');
            onRefresh();
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'eliminazione');
        } finally {
            setIsDeleting(false);
            setShowMenu(false);
        }
    };

    const handleRename = async () => {
        const trimmed = editedName.trim();
        if (trimmed && trimmed !== folder.name && trimmed.length > 0) {
            try {
                await foldersService.updateFolder(folder.id, { name: trimmed });
                emitToast.success('Cartella rinominata');
                setIsEditing(false);
                onRefresh();
            } catch (err: any) {
                emitToast.error(err.message || 'Errore nella rinomina');
                setEditedName(folder.name);
                setIsEditing(false);
            }
        } else {
            setEditedName(folder.name);
            setIsEditing(false);
        }
    };

    const handleCancelRename = () => {
        setEditedName(folder.name);
        setIsEditing(false);
    };

    const handleStartRename = () => {
        setIsEditing(true);
        setEditedName(folder.name);
        setShowMenu(false);
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Animazione pulsante durante drag over
    const dragOverVariants = {
        initial: { scale: 1 },
        hover: { scale: 1.05 },
        dragOver: { 
            scale: 1.1,
            boxShadow: `0 0 30px ${theme.glowColor}`,
        },
    };

    return (
        <div>
            <motion.div
                whileHover={{ x: 4 }}
                animate={isDragOver ? 'dragOver' : 'initial'}
                variants={dragOverVariants}
                transition={{ 
                    duration: 0.2,
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                }}
                className={`
                    group relative pl-${level * 4} pr-3 py-1.5 rounded-lg transition-all duration-200 touch-manipulation
                    ${isSelected 
                        ? 'bg-violet-500/20' 
                        : 'hover:bg-white/5'
                    }
                    ${isDragOver 
                        ? 'bg-violet-500/40 border-2 border-violet-400 border-dashed shadow-2xl' 
                        : ''
                    }
                `}
                style={{ 
                    paddingLeft: `${level * 16 + 12}px`,
                    ...(isDragOver && {
                        boxShadow: `0 0 30px ${theme.glowColor}, 0 0 60px ${theme.glowColor}40`,
                    }),
                }}
                onClick={onSelect}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Bordo sinistro sottile per indicare la cartella selezionata */}
                {isSelected && (
                    <div className="absolute left-0 top-0 h-full w-0.5 bg-violet-400" />
                )}

                {/* Header con nome e statistiche */}
                <div className="flex items-center justify-between w-full">
                    <div 
                        className="flex items-center cursor-pointer flex-1 min-w-0"
                        onClick={onSelect}
                    >
                        {hasChildren ? (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle();
                                }}
                                className={studyOrgButtonClass(
                                    'icon',
                                    'w-4 h-4 rounded-sm flex items-center justify-center mr-2 flex-shrink-0'
                                )}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                ) : (
                                    <ChevronRight className="w-3 h-3" />
                                )}
                            </button>
                        ) : (
                            <div className="w-4 mr-2 flex-shrink-0" />
                        )}
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                                folderStats && folderStats.totalCards > 0
                                    ? folderStats.dueCards === 0
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : isCritical
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-violet-500/20 text-violet-400'
                                    : 'bg-white/10 text-white/60'
                            }`}>
                                <Folder className="w-3 h-3" />
                            </div>
                            {isEditing ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleRename();
                                        } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            handleCancelRename();
                                        }
                                    }}
                                    onBlur={handleRename}
                                    className={studyOrgFieldClass('inline', 'flex-1 px-2 py-0.5 text-sm rounded')}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-[280px]">
                                    {folder.name}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Statistiche condensate - SOLO QUANDO RILEVANTI */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Badge con numero mazzi */}
                        {hasDecks && (
                            <span className={studyOrgBadgeClass('count', 'text-xs px-1.5 py-0.5 rounded')}>
                                {folderStats?.totalDecks || folder.count || 0}
                            </span>
                        )}
                        
                        {/* Badge con carte da ripassare (solo quando > 0) */}
                        {folderStats && folderStats.dueCards > 0 && (
                            <span className={studyOrgBadgeClass(
                                isCritical ? 'dueCritical' : 'due',
                                'text-xs px-1.5 py-0.5 rounded'
                            )}>
                                {folderStats.dueCards}
                            </span>
                        )}
                        
                        {/* Solo mostrare quando la padronanza è completa */}
                        {folderStats && folderStats.dueCards === 0 && folderStats.masteryPercent === 100 && (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        )}

                        {/* Indicatore scadenza urgente (solo quando critico) */}
                        {isUrgent && (
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                            />
                        )}

                        {/* Menu opzioni */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className={studyOrgButtonClass(
                                'icon',
                                'opacity-0 group-hover:opacity-100 p-1 rounded transition-all'
                            )}
                        >
                            <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                
                {/* Progress bar - SEMPRE visibile per uniformità quando ci sono carte */}
                {folderStats && folderStats.totalCards > 0 && (
                    <div className="mt-1.5">
                        <div className="flex justify-between text-[10px] text-white/50 mb-0.5">
                            <span>{folderStats.masteryPercent}% padronanza</span>
                            {folderStats.dueCards > 0 && (
                                <span>{folderStats.dueCards}/{folderStats.totalCards} da ripassare</span>
                            )}
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${folderStats.masteryPercent}%` }}
                                transition={{ duration: 0.5 }}
                                className={`h-full rounded-full ${
                                    folderStats.masteryPercent === 100 
                                        ? 'bg-emerald-400' 
                                        : folderStats.masteryPercent > 70 
                                            ? 'bg-violet-400' 
                                            : 'bg-amber-400'
                                }`}
                            />
                        </div>
                    </div>
                )}
                
                {/* Mostra suggerimento SOLO QUANDO CRITICO */}
                {isCritical && folderStats && (
                    <div className="mt-1.5 p-1.5 rounded bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[10px] text-amber-400">
                            Urgente: {Math.round(folderStats.dueCards / folderStats.totalCards * 100)}% da ripassare
                        </p>
                    </div>
                )}

                {/* Dropdown menu */}
                <AnimatePresence>
                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowMenu(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                className="absolute right-0 mt-1 z-50 w-40 py-2 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartRename();
                                    }}
                                    className={studyOrgButtonClass('menu', 'w-full flex items-center gap-2 px-4 py-2 text-sm')}
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Rinomina
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete();
                                    }}
                                    disabled={isDeleting}
                                    className={studyOrgButtonClass(
                                        'menuDanger',
                                        'w-full flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50'
                                    )}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Elimina
                                </button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Children (ricorsivo) */}
            <AnimatePresence>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {folder.children!.map((child) => {
                            // Passa folderStats ai children se disponibile
                            const childStats = folderStatsMap?.get(child.id);
                            return (
                                <FolderItem
                                    key={child.id}
                                    folder={child}
                                    level={level + 1}
                                    isExpanded={false}
                                    isSelected={false}
                                    onToggle={() => {}}
                                    onSelect={() => {}}
                                    onRefresh={onRefresh}
                                    onDeckDrop={onDeckDrop}
                                    folderStats={childStats}
                                    folderStatsMap={folderStatsMap}
                                />
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Root folder item (per drag & drop)
const RootFolderItem: React.FC<{
    isSelected: boolean;
    onSelect: () => void;
    onDeckDrop?: (deckId: string, folderId: string | null) => void;
}> = ({ isSelected, onSelect, onDeckDrop }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (!isDragOver) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        const deckId = e.dataTransfer.getData('deckId') || e.dataTransfer.getData('text/plain');
        
        if (deckId && onDeckDrop) {
            onDeckDrop(deckId, null);
        } else {
            console.warn('[FolderTree] Root drop failed:', { 
                deckId, 
                hasHandler: !!onDeckDrop,
            });
        }
    };

    const rootDragOverVariants = {
        initial: { scale: 1 },
        dragOver: { 
            scale: 1.1,
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.3)',
        },
    };

    return (
        <motion.div
            whileHover={{ x: 4 }}
            animate={isDragOver ? 'dragOver' : 'initial'}
            variants={rootDragOverVariants}
            transition={{ 
                duration: 0.2,
                type: 'spring',
                stiffness: 300,
                damping: 20,
            }}
            className={`
                group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer
                transition-all duration-200 touch-manipulation min-h-[44px]
                ${isSelected
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-lg shadow-violet-500/10' 
                    : 'hover:bg-white/10 text-white/70 hover:text-white border border-transparent'
                }
                ${isDragOver 
                    ? 'bg-violet-500/40 border-2 border-violet-400 border-dashed shadow-2xl' 
                    : ''
                }
            `}
            onClick={onSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-600">
                <Home className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="flex-1 text-sm font-medium">Tutti i mazzi</span>
        </motion.div>
    );
};

export const FolderTree: React.FC<FolderTreeProps> = ({
    folders,
    selectedFolderId,
    onFolderSelect,
    onRefresh,
    onDeckDrop,
    folderStats,
}) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolder = useCallback((folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    }, []);

    const renderFolder = (folder: FolderType, level: number = 0) => {
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = selectedFolderId === folder.id;
        const stats = folderStats?.get(folder.id);

        return (
            <FolderItem
                key={folder.id}
                folder={folder}
                level={level}
                isExpanded={isExpanded}
                isSelected={isSelected}
                onToggle={() => toggleFolder(folder.id)}
                onSelect={() => onFolderSelect(folder.id)}
                onRefresh={onRefresh}
                onDeckDrop={onDeckDrop}
                folderStats={stats}
                folderStatsMap={folderStats}
            />
        );
    };

    return (
        <div className="space-y-1">
            {/* Cartella "Tutti i mazzi" (root) */}
            <RootFolderItem
                isSelected={selectedFolderId === null}
                onSelect={() => onFolderSelect(null)}
                onDeckDrop={onDeckDrop}
            />

            {/* Cartelle gerarchiche */}
            {folders.map(folder => renderFolder(folder, 0))}
        </div>
    );
};
