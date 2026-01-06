/**
 * 🏠 WORKSPACE PAGE
 * =================
 * 
 * Pagina principale del Work Journal.
 * Mostra timeline delle entries e lista progetti.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace } from '../context/WorkspaceContext';
import { ProjectList } from '../components/ProjectList';
import { EntryTimeline } from '../components/EntryTimeline';
import { EntryDetailModal } from '../components/EntryDetailModal';
import { EntryForm } from '../components/EntryForm';
import { TodosWidget } from '../components/TodosWidget';
import { FiPlus, FiRefreshCw, FiSearch, FiFileText } from 'react-icons/fi';
import type { WorkLog } from '../../tracker/type';

export const WorkspacePage = () => {
    const {
        projects,
        entries,
        projectsLoading,
        entriesLoading,
        refreshProjects,
        refreshEntries,
    } = useWorkspace();

    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [showNewProjectForm, setShowNewProjectForm] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<WorkLog | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<WorkLog | undefined>();

    const { deleteEntry } = useWorkspace();

    // Filtra entries in base a progetto e ricerca
    const filteredEntries = useMemo(() => {
        let filtered = [...entries];
        
        if (selectedProject) {
            filtered = filtered.filter((e) => {
                return String(e.projectId) === String(selectedProject);
            });
        }
        
        // Ricerca full-text su titolo e descrizione
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((e) => {
                const titleMatch = e.title.toLowerCase().includes(query);
                const descriptionMatch = e.description?.toLowerCase().includes(query);
                const tagMatch = e.tags?.some((tag) => tag.toLowerCase().includes(query));
                return titleMatch || descriptionMatch || tagMatch;
            });
        }
        
        return filtered.sort((a, b) => {
            // Ordina per data (più recente prima), poi per createdAt
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [entries, selectedProject, searchQuery]);

    const handleRefresh = async () => {
        await Promise.all([refreshProjects(), refreshEntries()]);
    };

    return (
        <div className="min-h-screen animate-fade-in pb-10">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1">Workspace</h2>
                    <p className="text-white/50">Il tuo diario di lavoro</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRefresh}
                        disabled={projectsLoading || entriesLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all disabled:opacity-50"
                    >
                        <FiRefreshCw size={18} className={projectsLoading || entriesLoading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Aggiorna</span>
                    </motion.button>
                    
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setEditingEntry(undefined);
                            setShowEntryForm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                    >
                        <FiFileText size={18} />
                        <span>Nuova Entry</span>
                    </motion.button>
                    
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowNewProjectForm(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all"
                    >
                        <FiPlus size={18} />
                        <span>Nuovo Progetto</span>
                    </motion.button>
                </div>
            </div>

            {/* FILTRI E RICERCA */}
            <div className="space-y-4 mb-6">
                {/* RICERCA */}
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca nelle entries (titolo, contenuto, tag)..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                {/* FILTRI */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-white/60">Progetto:</span>
                        <select
                            value={selectedProject || ''}
                            onChange={(e) => setSelectedProject(e.target.value || null)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option key="all" value="">Tutti</option>
                            {projects.map((p) => {
                                const projectId = p.id || (p as any)._id;
                                if (!projectId) return null;
                                return (
                                    <option key={projectId} value={String(projectId)}>
                                        {p.icon} {p.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    
                    {/* RESET FILTRI */}
                    {(selectedProject || searchQuery) && (
                        <button
                            onClick={() => {
                                setSelectedProject(null);
                                setSearchQuery('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* CONTENUTO PRINCIPALE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLONNA SINISTRA: LISTA PROGETTI E TODO */}
                <div className="lg:col-span-1 space-y-6">
                    <ProjectList
                        projects={projects}
                        loading={projectsLoading}
                        selectedProject={selectedProject}
                        onSelectProject={setSelectedProject}
                        showNewProjectForm={showNewProjectForm}
                        onCloseNewProjectForm={() => setShowNewProjectForm(false)}
                    />
                    
                    {/* TODO WIDGET */}
                    <TodosWidget 
                        projects={projects}
                        selectedProject={selectedProject}
                    />
                </div>

                {/* COLONNA DESTRA: TIMELINE ENTRIES */}
                <div className="lg:col-span-2">
                    <EntryTimeline
                        entries={filteredEntries}
                        loading={entriesLoading}
                        projects={projects}
                        onEntryClick={setSelectedEntry}
                    />
                </div>
            </div>

            {/* ENTRY DETAIL MODAL */}
            <EntryDetailModal
                isOpen={!!selectedEntry}
                entry={selectedEntry}
                project={selectedEntry ? projects.find((p) => {
                    const pid = p.id || (p as any)._id;
                    return String(pid) === String(selectedEntry.projectId);
                }) || null : null}
                onClose={() => setSelectedEntry(null)}
                onEdit={(entry) => {
                    setSelectedEntry(null);
                    setEditingEntry(entry);
                    setShowEntryForm(true);
                }}
                onDelete={(entryId) => {
                    deleteEntry(entryId);
                    setSelectedEntry(null);
                }}
            />

            {/* ENTRY FORM MODAL */}
            <AnimatePresence>
                {showEntryForm && (
                    <EntryForm
                        entry={editingEntry}
                        defaultProjectId={selectedProject || undefined}
                        onClose={() => {
                            setShowEntryForm(false);
                            setEditingEntry(undefined);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
