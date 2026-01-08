/**
 * 📁 FOLDER TREE - Sidebar con albero gerarchico cartelle
 * 
 * Componente per visualizzare e navigare le cartelle in modo gerarchico.
 * Supporta:
 * - Espansione/collasso delle cartelle
 * - Drag & drop per spostare mazzi
 * - Creazione rapida di cartelle
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Folder, 
    FolderOpen, 
    ChevronRight, 
    ChevronDown,
    Plus,
    MoreVertical,
    Edit2,
    Trash2
} from 'lucide-react';
import { foldersService, type Folder as FolderType } from '../services/foldersService';
import { emitToast } from '../../../shared/components/toast';

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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (!isDragOver) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Solo se stiamo uscendo veramente dall'elemento (non da un child)
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
        
        // Prova entrambi i formati
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

    const hasChildren = folder.children && folder.children.length > 0;
    const paddingLeft = `${level * 16 + 12}px`;

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

    return (
        <div>
            <div
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                    transition-colors touch-manipulation min-h-[40px]
                    ${isSelected 
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                        : 'hover:bg-white/5 text-white/70 hover:text-white'
                    }
                    ${isDragOver ? 'bg-violet-500/30 border-2 border-violet-400 border-dashed' : ''}
                `}
                style={{ paddingLeft }}
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
                        className="p-0.5 rounded hover:bg-white/10 transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>
                ) : (
                    <div className="w-5" /> // Spacer per allineamento
                )}

                {/* Icona cartella */}
                <div className="flex-shrink-0">
                    {isExpanded ? (
                        <FolderOpen className="w-4 h-4" style={{ color: folder.color }} />
                    ) : (
                        <Folder className="w-4 h-4" style={{ color: folder.color }} />
                    )}
                </div>

                {/* Nome cartella */}
                <span className="flex-1 text-sm font-medium truncate">
                    {folder.name}
                </span>

                {/* Contatore */}
                {folder.count !== undefined && folder.count > 0 && (
                    <span className="text-xs text-white/40 px-1.5 py-0.5 rounded bg-white/5">
                        {folder.count}
                    </span>
                )}

                {/* Menu opzioni */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
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
                                        setShowMenu(false);
                                        // TODO: Implementa edit
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
            </div>

            {/* Children (ricorsivo) */}
            <AnimatePresence>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {folder.children!.map((child) => (
                            <FolderItem
                                key={child.id}
                                folder={child}
                                level={level + 1}
                                isExpanded={false} // TODO: gestire stato espansione per ogni cartella
                                isSelected={false} // TODO: gestire selezione
                                onToggle={() => {}} // TODO
                                onSelect={() => {}} // TODO
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

    return (
        <div
            className={`
                flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                transition-colors touch-manipulation min-h-[40px]
                ${isSelected
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                    : 'hover:bg-white/5 text-white/70 hover:text-white'
                }
                ${isDragOver ? 'bg-violet-500/30 border-2 border-violet-400 border-dashed' : ''}
            `}
            onClick={onSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <Folder className="w-4 h-4 text-violet-400" />
            <span className="flex-1 text-sm font-medium">Tutti i mazzi</span>
        </div>
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
