import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Folder as FolderIcon } from 'lucide-react';
import { FolderTree } from '../FolderTree';
import { TagCloud } from '../TagCloud';
import type { Folder, Tag } from '../../services/foldersService';
import { foldersService } from '../../services/foldersService';
import { emitToast } from '../../../../shared/components/toast';

interface DashboardSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    folders: Folder[];
    tags: Tag[];
    selectedFolderId: string | null;
    selectedTags: string[];
    folderStats: Map<string, {
        totalCards: number;
        dueCards: number;
        masteryPercent: number;
        totalDecks: number;
    }>;
    onFolderSelect: (folderId: string | null) => void;
    onTagToggle: (tagName: string) => void;
    onDeckDrop: (deckId: string, folderId: string | null) => void;
    onRefresh: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    isOpen,
    onClose,
    folders,
    tags,
    selectedFolderId,
    selectedTags,
    folderStats,
    onFolderSelect,
    onTagToggle,
    onDeckDrop,
    onRefresh,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.aside
                    initial={{ x: -350, opacity: 0 }}
                    animate={{ x: -50, opacity: 1 }}
                    exit={{ x: -350, opacity: 0 }}
                    transition={{ 
                        type: 'spring', 
                        damping: 30, 
                        stiffness: 250 
                    }}
                    className="hidden lg:flex flex-col w-80 
                               border-r border-violet-500/25 
                               relative bg-gradient-to-b from-[#111122]/85 to-[#0f172a]/55 
                               backdrop-blur-xl 
                               shadow-[inset_0_0_15px_rgba(139,92,246,0.1),_0_0_25px_rgba(0,0,0,0.3)]
                               ml-[-15px]"
                >
                    <div className="p-5 border-b border-white/10 bg-[#111122]/30">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-sm font-bold text-white/90 uppercase tracking-widest">
                                Organizza
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>
                        <p className="text-[10px] text-white/40 mt-1">
                            💡 Trascina un mazzo per organizzarlo
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {/* Cartelle */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                                    <FolderIcon className="w-3.5 h-3.5" />
                                    Cartelle
                                </h3>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={async () => {
                                        const name = prompt('Nome della nuova cartella:');
                                        if (name && name.trim()) {
                                            try {
                                                await foldersService.createFolder({ name: name.trim() });
                                                emitToast.success('Cartella creata');
                                                onRefresh();
                                            } catch (err: any) {
                                                emitToast.error(err.message || 'Errore nella creazione');
                                            }
                                        }
                                    }}
                                    className="p-1.5 rounded-full bg-violet-500/20 hover:bg-violet-500/30 transition-colors border border-violet-500/30"
                                >
                                    <Plus className="w-3.5 h-3.5 text-violet-300" />
                                </motion.button>
                            </div>
                            {folders.length > 0 ? (
                                <FolderTree
                                    folders={folders}
                                    selectedFolderId={selectedFolderId}
                                    onFolderSelect={onFolderSelect}
                                    onRefresh={onRefresh}
                                    onDeckDrop={onDeckDrop}
                                    folderStats={folderStats}
                                />
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="px-3 py-6 text-center"
                                >
                                    <FolderIcon className="w-10 h-10 mx-auto mb-3 text-white/20" />
                                    <p className="text-xs text-white/40 mb-2">Nessuna cartella ancora</p>
                                    <button
                                        onClick={async () => {
                                            const name = prompt('Nome della nuova cartella:');
                                            if (name && name.trim()) {
                                                try {
                                                    await foldersService.createFolder({ name: name.trim() });
                                                    emitToast.success('Cartella creata');
                                                    onRefresh();
                                                } catch (err: any) {
                                                    emitToast.error(err.message || 'Errore nella creazione');
                                                }
                                            }
                                        }}
                                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                                    >
                                        Crea la tua prima cartella →
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Tag */}
                        <div>
                            <TagCloud
                                tags={tags}
                                selectedTags={selectedTags}
                                onTagToggle={onTagToggle}
                                onRefresh={onRefresh}
                            />
                        </div>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
};
