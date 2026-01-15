import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FolderPlus } from 'lucide-react';
import type { Folder as FolderType } from '../../services/foldersService';

// ============================================
// TYPES
// ============================================

interface DragDropZoneProps {
    folders: FolderType[];
    onDrop: (deckId: string, folderId: string | null) => void;
    onShowCreateFolder?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const DragDropZone: React.FC<DragDropZoneProps> = ({
    folders,
    onDrop,
    onShowCreateFolder,
}) => {
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    React.useEffect(() => {
        const handleDragEnter = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes('deckId')) {
                setIsDragging(true);
            }
        };

        const handleDragLeave = (e: DragEvent) => {
            if (!e.relatedTarget || !(e.currentTarget as Element).contains(e.relatedTarget as Node)) {
                setIsDragging(false);
                setDragOverFolderId(null);
            }
        };

        const handleDragOver = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes('deckId')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        };

        const handleDrop = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes('deckId')) {
                e.preventDefault();
                const deckId = e.dataTransfer.getData('deckId');
                if (deckId) {
                    onDrop(deckId, null);
                }
                setIsDragging(false);
                setDragOverFolderId(null);
            }
        };

        document.addEventListener('dragenter', handleDragEnter);
        document.addEventListener('dragleave', handleDragLeave);
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('drop', handleDrop);

        return () => {
            document.removeEventListener('dragenter', handleDragEnter);
            document.removeEventListener('dragleave', handleDragLeave);
            document.removeEventListener('dragover', handleDragOver);
            document.removeEventListener('drop', handleDrop);
        };
    }, [onDrop]);

    if (!isDragging) return null;

    return (
        <AnimatePresence>
            {isDragging && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 pointer-events-none"
                >
                    {/* Drop Zones */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                        <div className="flex items-center gap-3 bg-zinc-900/95 backdrop-blur-xl border border-primary-500/30 rounded-2xl p-4 shadow-2xl">
                            <p className="text-sm text-white/80 font-medium">Trascina qui per organizzare:</p>
                            
                            {/* Root Folder */}
                            <motion.div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDragOverFolderId('root');
                                }}
                                onDragLeave={() => setDragOverFolderId(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const deckId = e.dataTransfer.getData('deckId') || e.dataTransfer.getData('text/plain');
                                    if (deckId) {
                                        onDrop(deckId, null);
                                    }
                                    setIsDragging(false);
                                    setDragOverFolderId(null);
                                }}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-xl border transition-all pointer-events-auto
                                    ${dragOverFolderId === 'root'
                                        ? 'bg-primary-500/20 border-primary-400 scale-105'
                                        : 'bg-white/5 border-white/10'
                                    }
                                `}
                            >
                                <Folder className="w-4 h-4 text-white/60" />
                                <span className="text-xs text-white/70">Radice</span>
                            </motion.div>

                            {/* Folders */}
                            {folders.slice(0, 5).map((folder) => (
                                <motion.div
                                    key={folder.id}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverFolderId(folder.id);
                                    }}
                                    onDragLeave={() => setDragOverFolderId(null)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const deckId = e.dataTransfer.getData('deckId') || e.dataTransfer.getData('text/plain');
                                        if (deckId) {
                                            onDrop(deckId, folder.id);
                                        }
                                        setIsDragging(false);
                                        setDragOverFolderId(null);
                                    }}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-xl border transition-all pointer-events-auto
                                        ${dragOverFolderId === folder.id
                                            ? 'bg-primary-500/20 border-primary-400 scale-105'
                                            : 'bg-white/5 border-white/10'
                                        }
                                    `}
                                    style={{
                                        borderColor: dragOverFolderId === folder.id 
                                            ? undefined 
                                            : folder.color ? `${folder.color}40` : undefined,
                                    }}
                                >
                                    <Folder 
                                        className="w-4 h-4"
                                        style={{
                                            color: folder.color || undefined,
                                        }}
                                    />
                                    <span className="text-xs text-white/70 truncate max-w-[100px]">
                                        {folder.name}
                                    </span>
                                </motion.div>
                            ))}

                            {/* Create Folder */}
                            {onShowCreateFolder && (
                                <motion.button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowCreateFolder();
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/20 border border-primary-500/30 hover:bg-primary-500/30 transition-colors"
                                >
                                    <FolderPlus className="w-4 h-4 text-primary-400" />
                                    <span className="text-xs text-primary-300">Nuova</span>
                                </motion.button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
