import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Folder as FolderIcon, Menu, BookOpen } from 'lucide-react';
import { FolderTree } from '../Organization/FolderTree';
import { ExamTree } from '../Organization/ExamTree';
import { TagCloud } from '../Organization/TagCloud';
import { CreateFolderModal } from '../Modals/CreateFolderModal';
import type { Folder, Tag } from '../../services/foldersService';
import type { Exam } from '../../types/exam';
import type { Deck } from '../../services/studyService';
import { foldersService } from '../../services/foldersService';
import { emitToast } from '../../../../shared/components/toast';

interface DashboardSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onToggle?: () => void;
    folders: Folder[];
    tags: Tag[];
    exams?: Exam[];
    decks?: Deck[]; // Mazzi per calcolare statistiche
    selectedFolderId: string | null;
    selectedExamId?: string | null;
    selectedTags: string[];
    folderStats: Map<string, {
        totalCards: number;
        dueCards: number;
        masteryPercent: number;
        totalDecks: number;
    }>;
    onFolderSelect: (folderId: string | null) => void;
    onExamSelect?: (examId: string | null) => void;
    onDeckClick?: (deckId: string) => void;
    onTagToggle: (tagName: string) => void;
    onDeckDrop: (deckId: string, folderId: string | null) => void;
    onRefresh: () => void;
    onCreateExam?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    isOpen,
    onClose,
    onToggle,
    folders,
    tags,
    exams = [],
    decks = [],
    selectedFolderId,
    selectedExamId = null,
    selectedTags,
    folderStats,
    onFolderSelect,
    onExamSelect,
    onDeckClick,
    onTagToggle,
    onDeckDrop,
    onRefresh,
    onCreateExam,
}) => {
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);

    // Handler per selezionare una cartella e chiudere la sidebar
    const handleFolderSelect = (folderId: string | null) => {
        onFolderSelect(folderId);
        // Reset selezione esame quando si seleziona una cartella
        if (onExamSelect) {
            onExamSelect(null);
        }
        // Chiudi la sidebar dopo la selezione per mostrare il contenuto
        onClose();
    };

    // Handler per selezionare un esame e chiudere la sidebar
    const handleExamSelect = (examId: string | null) => {
        if (onExamSelect) {
            onExamSelect(examId);
        }
        // Reset selezione cartella quando si seleziona un esame
        onFolderSelect(null);
        // Chiudi la sidebar dopo la selezione per mostrare il contenuto
        onClose();
    };

    const handleCreateFolder = () => {
        setIsCreateFolderModalOpen(true);
    };

    const handleCreateFolderSubmit = async (name: string) => {
        try {
            await foldersService.createFolder({ name });
            emitToast.success('Cartella creata');
            onRefresh();
            setIsCreateFolderModalOpen(false);
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nella creazione');
            throw err; // Rilancia per gestione nel modale
        }
    };

    return (
        <>
            {/* Create Folder Modal */}
            <CreateFolderModal
                isOpen={isCreateFolderModalOpen}
                onClose={() => setIsCreateFolderModalOpen(false)}
                onSubmit={handleCreateFolderSubmit}
            />

            {/* Floating Action Button - Sempre visibile sopra la sidebar */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: isOpen ? 90 : 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (onToggle) {
                        onToggle();
                    } else {
                        if (isOpen) {
                            onClose();
                        }
                    }
                }}
                className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 ${isOpen ? 'z-[60]' : 'z-40'}
                           w-12 h-12 sm:w-14 sm:h-14 rounded-full
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
                    <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                ) : (
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}
            </motion.button>

            {/* macOS-style Window Sidebar - Si espande dal pulsante verso l'alto */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        initial={{ 
                            opacity: 0,
                            scaleX: 0.1,
                            scaleY: 0.1,
                            y: 0,
                            filter: 'blur(10px)'
                        }}
                        animate={{ 
                            opacity: 1,
                            scaleX: 1,
                            scaleY: 1,
                            y: 0,
                            filter: 'blur(0px)'
                        }}
                        exit={{ 
                            opacity: 0,
                            scaleX: 0.1,
                            scaleY: 0.1,
                            y: 0,
                            filter: 'blur(10px)'
                        }}
                        transition={{ 
                            type: 'spring',
                            damping: 25,
                            stiffness: 300,
                            mass: 0.6
                        }}
                        className="fixed bottom-6 right-6
                                   w-[calc(100vw-2rem)]
                                   max-w-[20rem]
                                   h-[calc(100vh-6rem)]
                                   sm:max-w-[22rem]
                                   md:max-w-[24rem]
                                   lg:max-w-[26rem]
                                   rounded-2xl
                                   shadow-2xl shadow-black/60
                                   z-50
                                   flex flex-col
                                   pointer-events-auto
                                   overflow-hidden
                                   bg-theme-elevated border border-theme-default"
                        style={{
                            // Effetto vetro tipo macOS con theme variables
                            background: `linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)`,
                            backdropFilter: 'blur(40px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                            borderColor: 'var(--border-default)',
                            boxShadow: `0 8px 32px 0 var(--shadow-md), inset 0 1px 0 0 var(--border-subtle)`,
                            transformOrigin: 'bottom right', // Parte dal punto in basso a destra (dove c'è il pulsante)
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header con stile macOS */}
                        <div className="p-6 border-b border-theme-subtle flex-shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-sm font-bold text-theme-primary uppercase tracking-widest">
                                    Organizza
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors group dark:hover:bg-white/10"
                                    aria-label="Chiudi"
                                >
                                    <X className="w-4 h-4 text-theme-muted group-hover:text-theme-primary transition-colors" />
                                </button>
                            </div>
                            <p className="text-[10px] text-theme-muted">
                                💡 Trascina un mazzo per organizzarlo
                            </p>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {/* Esami - Prima delle cartelle per priorità */}
                            {exams && exams.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-bold text-theme-muted uppercase tracking-wider flex items-center gap-2">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            Esami
                                        </h3>
                                        {onCreateExam && (
                                            <motion.button
                                                whileHover={{ scale: 1.1, rotate: 90 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={onCreateExam}
                                                className="p-1.5 rounded-full bg-violet-500/20 hover:bg-violet-500/30 transition-colors border border-violet-500/30"
                                                aria-label="Crea nuovo esame"
                                            >
                                                <Plus className="w-3.5 h-3.5 text-violet-300" />
                                            </motion.button>
                                        )}
                                    </div>
                                    <ExamTree
                                        exams={exams}
                                        decks={decks}
                                        selectedExamId={selectedExamId}
                                        onExamSelect={handleExamSelect}
                                        onDeckClick={(deckId) => {
                                            if (onDeckClick) {
                                                onDeckClick(deckId);
                                                // Chiudi la sidebar dopo il click
                                                onClose();
                                            }
                                        }}
                                        onRefresh={onRefresh}
                                    />
                                </div>
                            )}

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
                                        onClick={handleCreateFolder}
                                        className="p-1.5 rounded-full bg-violet-500/20 hover:bg-violet-500/30 transition-colors border border-violet-500/30"
                                        aria-label="Crea nuova cartella"
                                    >
                                        <Plus className="w-3.5 h-3.5 text-violet-300" />
                                    </motion.button>
                                </div>
                                {folders.length > 0 ? (
                                    <FolderTree
                                        folders={folders}
                                        selectedFolderId={selectedFolderId}
                                        onFolderSelect={handleFolderSelect}
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
                                            onClick={handleCreateFolder}
                                            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                                        >
                                            Crea la tua prima cartella →
                                        </button>
                                    </motion.div>
                                )}
                            </div>

                            {/* Tag */}
                            <div>
                                <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <span>🏷️</span>
                                    Tag
                                </h3>
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
        </>
    );
};
