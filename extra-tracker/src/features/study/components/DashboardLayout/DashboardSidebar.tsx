import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Folder as FolderIcon, Menu } from 'lucide-react';
import { FolderTree } from '../Organization/FolderTree';
import { TagCloud } from '../Organization/TagCloud';
import type { Folder, Tag } from '../../services/foldersService';
import { foldersService } from '../../services/foldersService';
import { emitToast } from '../../../../shared/components/toast';

interface DashboardSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onToggle?: () => void;
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
    onToggle,
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
        <>
            {/* Floating Action Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: isOpen ? 90 : 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (onToggle) {
                        onToggle();
                    } else {
                        // Fallback: se non c'è toggle, chiude se aperto
                        if (isOpen) {
                            onClose();
                        }
                    }
                }}
                className={`fixed bottom-6 right-6 z-40
                           w-14 h-14 rounded-full
                           ${isOpen 
                               ? 'bg-gradient-to-br from-violet-600 to-purple-700' 
                               : 'bg-gradient-to-br from-violet-500 to-purple-600'
                           }
                           shadow-lg shadow-violet-500/50
                           border border-violet-400/30
                           flex items-center justify-center
                           hover:shadow-xl hover:shadow-violet-500/60
                           transition-all duration-300
                           backdrop-blur-sm`}
                aria-label={isOpen ? "Chiudi organizzazione" : "Apri organizzazione"}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <Menu className="w-6 h-6 text-white" />
                )}
            </motion.button>

            {/* Overlay backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        
                        {/* Drawer/Overlay Sidebar */}
                        <motion.aside
                            initial={{ 
                                x: '100%',
                                y: 0
                            }}
                            animate={{ 
                                x: 0,
                                y: 0
                            }}
                            exit={{ 
                                x: '100%',
                                y: 0
                            }}
                            transition={{ 
                                type: 'spring', 
                                damping: 30, 
                                stiffness: 300 
                            }}
                            className="fixed top-0 right-0 h-full w-full max-w-sm
                                       sm:max-w-sm
                                       bg-gradient-to-b from-[#111122]/95 to-[#0f172a]/95 
                                       backdrop-blur-xl 
                                       border-l border-violet-500/25
                                       shadow-2xl shadow-black/50
                                       z-50
                                       flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-white/10 bg-[#111122]/30 flex-shrink-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-sm font-bold text-white/90 uppercase tracking-widest">
                                        Organizza
                                    </h2>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                        aria-label="Chiudi"
                                    >
                                        <X className="w-5 h-5 text-white/60" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-white/40 mt-1">
                                    💡 Trascina un mazzo per organizzarlo
                                </p>
                            </div>

                            {/* Scrollable content */}
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
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
