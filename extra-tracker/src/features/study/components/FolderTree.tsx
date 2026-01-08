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

import { useState, useCallback, useRef, useEffect } from 'react';
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
    X as XIcon
} from 'lucide-react';
import { foldersService, type Folder as FolderType } from '../services/foldersService';
import { emitToast } from '../../../shared/components/toast';
import { getFolderTheme } from '../utils/folderTheme';

interface FolderTreeProps {
    folders: FolderType[];
    selectedFolderId: string | null;
    onFolderSelect: (folderId: string | null) => void;
    onRefresh: () => void;
    onDeckDrop?: (deckId: string, folderId: string | null) => void;
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
                    group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer
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
                style={{ 
                    paddingLeft,
                    ...(isDragOver && {
                        boxShadow: `0 0 30px ${theme.glowColor}, 0 0 60px ${theme.glowColor}40`,
                    }),
                }}
                onClick={onSelect}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Chevron per espandere/collassare */}
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>
                ) : (
                    <div className="w-5 flex-shrink-0" />
                )}

                {/* Icona cartella con tema */}
                <div 
                    className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-sm"
                    style={{
                        background: theme.gradient,
                        boxShadow: isSelected ? `0 0 10px ${theme.glowColor}` : 'none',
                    }}
                >
                    {isExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 text-white" />
                    ) : (
                        <span className="text-xs">{theme.icon}</span>
                    )}
                </div>

                {/* Nome cartella o input per rinomina */}
                {isEditing ? (
                    <div className="flex-1 flex items-center gap-1">
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
                            className="flex-1 px-2 py-1 text-sm bg-white/10 border border-violet-500/50 rounded text-white placeholder-white/30 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRename();
                            }}
                            className="p-1 rounded hover:bg-green-500/20 transition-colors"
                        >
                            <Check className="w-3.5 h-3.5 text-green-400" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRename();
                            }}
                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                        >
                            <XIcon className="w-3.5 h-3.5 text-red-400" />
                        </button>
                    </div>
                ) : (
                    <span className="flex-1 text-sm font-medium truncate">
                        {folder.name}
                    </span>
                )}

                {/* Badge con conteggio */}
                {hasDecks && (
                    <motion.span
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="text-xs text-white/60 px-2 py-0.5 rounded-full bg-white/10 font-medium"
                    >
                        {folder.count}
                    </motion.span>
                )}

                {/* Menu opzioni */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
                >
                    <MoreVertical className="w-3.5 h-3.5" />
                </button>

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
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
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
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
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
                        {folder.children!.map((child) => (
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
                            />
                        ))}
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
