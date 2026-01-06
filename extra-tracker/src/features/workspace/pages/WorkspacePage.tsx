/**
 * 🏠 WORKSPACE PAGE
 * =================
 * 
 * Pagina principale del Work Journal.
 * Mostra timeline delle entries e lista progetti.
 */

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace } from '../context/WorkspaceContext';
import { ProjectList } from '../components/ProjectList';
import { EntryTimeline } from '../components/EntryTimeline';
import { EntryDetailModal } from '../components/EntryDetailModal';
import { EntryForm } from '../components/EntryForm';
import { TodosWidget } from '../components/TodosWidget';
import { FiPlus, FiRefreshCw, FiSearch, FiFileText, FiX } from 'react-icons/fi';
import type { WorkLog } from '../../tracker/type';

export const WorkspacePage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const {
        projects,
        entries,
        projectsLoading,
        entriesLoading,
        refreshProjects,
        refreshEntries,
    } = useWorkspace();

    // Leggi projectId dall'URL all'avvio
    const urlProjectId = searchParams.get('projectId');
    
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [showNewProjectForm, setShowNewProjectForm] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<WorkLog | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<WorkLog | undefined>();
    const [projectNotFound, setProjectNotFound] = useState(false);

    const { deleteEntry } = useWorkspace();

    // Sincronizza selectedProject con URL quando i progetti sono caricati
    useEffect(() => {
        if (!urlProjectId) {
            setSelectedProject(null);
            setProjectNotFound(false);
            return;
        }

        // Aspetta che i progetti siano caricati
        if (projectsLoading) {
            return;
        }

        // Cerca il progetto nella lista
        const foundProject = projects.find((p) => {
            const pid = p.id || (p as any)._id;
            return String(pid) === String(urlProjectId);
        });

        if (foundProject) {
            setSelectedProject(urlProjectId);
            setProjectNotFound(false);
        } else {
            // Progetto non trovato
            setProjectNotFound(true);
            setSelectedProject(null);
        }
    }, [urlProjectId, projects, projectsLoading]);

    // Trova il progetto selezionato per mostrare il nome
    const selectedProjectData = useMemo(() => {
        if (!selectedProject) return null;
        return projects.find((p) => {
            const pid = p.id || (p as any)._id;
            return String(pid) === String(selectedProject);
        }) || null;
    }, [projects, selectedProject]);

    // Funzione per rimuovere il filtro progetto
    const handleClearProjectFilter = () => {
        setSelectedProject(null);
        // Rimuovi il parametro dall'URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('projectId');
        setSearchParams(newSearchParams, { replace: true });
    };

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

    // Aggiorna URL quando selectedProject cambia (tranne quando viene da URL)
    const handleProjectChange = (projectId: string | null) => {
        setSelectedProject(projectId);
        const newSearchParams = new URLSearchParams(searchParams);
        if (projectId) {
            newSearchParams.set('projectId', projectId);
        } else {
            newSearchParams.delete('projectId');
        }
        setSearchParams(newSearchParams, { replace: true });
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

            {/* INDICATORE PROGETTO SELEZIONATO */}
            {selectedProjectData && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center w-10 h-10 rounded-lg text-xl"
                            style={{ backgroundColor: `${selectedProjectData.color}20`, color: selectedProjectData.color }}
                        >
                            {selectedProjectData.icon}
                        </div>
                        <div>
                            <p className="text-sm text-white/60">Stai lavorando su:</p>
                            <p className="text-lg font-semibold text-white">{selectedProjectData.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClearProjectFilter}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title="Rimuovi filtro progetto"
                    >
                        <FiX size={20} />
                    </button>
                </motion.div>
            )}

            {/* MESSAGGIO PROGETTO NON TROVATO */}
            {projectNotFound && !projectsLoading && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="text-amber-400">⚠️</div>
                        <div>
                            <p className="text-sm font-medium text-amber-200">Progetto non trovato</p>
                            <p className="text-xs text-amber-200/60">
                                Il progetto con ID "{urlProjectId}" non esiste o non è accessibile.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClearProjectFilter}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title="Rimuovi filtro"
                    >
                        <FiX size={20} />
                    </button>
                </motion.div>
            )}

            {/* LOADING INDICATOR quando si sta caricando il progetto dall'URL */}
            {urlProjectId && projectsLoading && (
                <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-white/60">Caricamento progetto...</p>
                </div>
            )}

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
                            onChange={(e) => handleProjectChange(e.target.value || null)}
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
                                handleClearProjectFilter();
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
                        onSelectProject={handleProjectChange}
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
