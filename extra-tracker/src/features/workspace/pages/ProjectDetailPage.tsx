/**
 * 📂 PROJECT DETAIL PAGE
 * ======================
 * 
 * Pagina dettaglio progetto con tutte le sue entries.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWorkspace } from '../context/WorkspaceContext';
import { EntryTimeline } from '../components/EntryTimeline';
import { EntryDetailModal } from '../components/EntryDetailModal';
import { TodoList } from '../components/TodoList';
import { FiArrowLeft, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import type { WorkEntry, WorkEntryCategory, WorkTodo } from '../types';

export const ProjectDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { projects, entries, deleteProject, deleteEntry, getTodosByProject } = useWorkspace();

    const [selectedEntry, setSelectedEntry] = useState<WorkEntry | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<WorkEntryCategory | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [todos, setTodos] = useState<WorkTodo[]>([]);
    const [todosLoading, setTodosLoading] = useState(true);

    const project = projects.find((p) => {
        const pid = p.id || (p as any)._id;
        return String(pid) === String(id);
    });

    // Carica TODO del progetto
    useEffect(() => {
        if (!project) {
            setTodosLoading(false);
            return;
        }
        
        const loadTodos = async () => {
            setTodosLoading(true);
            try {
                const projectId = project.id || (project as any)._id;
                if (!projectId) return;
                
                const data = await getTodosByProject(String(projectId));
                setTodos(data || []);
            } catch (err) {
                setTodos([]);
            } finally {
                setTodosLoading(false);
            }
        };
        
        loadTodos();
    }, [project, getTodosByProject]);

    // Filtra entries del progetto
    const projectEntries = useMemo(() => {
        if (!project) return [];

        let filtered = entries.filter((e) => {
            const projectId = typeof e.project === 'string' ? e.project : e.project.id;
            return projectId === project.id;
        });

        if (selectedCategory) {
            filtered = filtered.filter((e) => e.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((e) => {
                const titleMatch = e.title.toLowerCase().includes(query);
                const contentMatch = e.content?.toLowerCase().includes(query);
                const tagMatch = e.tags?.some((tag) => tag.toLowerCase().includes(query));
                return titleMatch || contentMatch || tagMatch;
            });
        }

        return filtered.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [project, entries, selectedCategory, searchQuery]);

    const handleDeleteProject = async () => {
        if (!project) return;
        try {
            await deleteProject(project.id);
            navigate('/workspace');
        } catch (err) {
            // Errori gestiti dal context
        }
    };

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Progetto non trovato</h2>
                    <button
                        onClick={() => navigate('/workspace')}
                        className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                    >
                        Torna al Workspace
                    </button>
                </div>
            </div>
        );
    }

    const stats = {
        totalEntries: projectEntries.length,
        totalDuration: projectEntries.reduce((sum, e) => sum + (e.duration || 0), 0),
        categories: projectEntries.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    };

    return (
        <div className="min-h-screen animate-fade-in pb-10">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/workspace')}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl"
                            style={{ backgroundColor: `${project.color}20`, color: project.color }}
                        >
                            {project.icon}
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white">{project.name}</h2>
                            {project.description && (
                                <p className="text-white/50">{project.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 transition-all"
                    >
                        <FiTrash2 size={18} />
                        <span>Elimina</span>
                    </motion.button>
                </div>
            </div>

            {/* STATISTICHE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="card p-4">
                    <div className="text-sm text-white/60 mb-1">Total Entries</div>
                    <div className="text-2xl font-bold text-white">{stats.totalEntries}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-white/60 mb-1">Total Duration</div>
                    <div className="text-2xl font-bold text-white">
                        {Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m
                    </div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-white/60 mb-1">Categories</div>
                    <div className="text-2xl font-bold text-white">
                        {Object.keys(stats.categories).length}
                    </div>
                </div>
            </div>

            {/* TODO LIST */}
            <div className="mb-8">
                <TodoList
                    project={project}
                    todos={todos}
                    loading={todosLoading}
                    onRefresh={async () => {
                        if (!project) return;
                        const projectId = project.id || (project as any)._id;
                        const data = await getTodosByProject(String(projectId));
                        setTodos(data);
                    }}
                />
            </div>

            {/* FILTRI E RICERCA */}
            <div className="space-y-4 mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca nelle entries..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-white/60">Categoria:</span>
                        <select
                            value={selectedCategory || ''}
                            onChange={(e) => setSelectedCategory(e.target.value as WorkEntryCategory || null)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">Tutte</option>
                            <option value="development">💻 Development</option>
                            <option value="documentation">📝 Documentation</option>
                            <option value="ticket">🎫 Ticket</option>
                            <option value="meeting">🤝 Meeting</option>
                            <option value="research">🔬 Research</option>
                            <option value="freeform">📄 Freeform</option>
                        </select>
                    </div>

                    {(selectedCategory || searchQuery) && (
                        <button
                            onClick={() => {
                                setSelectedCategory(null);
                                setSearchQuery('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* ENTRIES TIMELINE */}
            <EntryTimeline
                entries={projectEntries}
                loading={false}
                projects={[project]}
                onEntryClick={setSelectedEntry}
            />

            {/* ENTRY DETAIL MODAL */}
            <EntryDetailModal
                isOpen={!!selectedEntry}
                entry={selectedEntry}
                project={project}
                onClose={() => setSelectedEntry(null)}
                onDelete={(entryId) => {
                    deleteEntry(entryId);
                    setSelectedEntry(null);
                }}
            />

            {/* DELETE PROJECT CONFIRMATION */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title="Elimina Progetto"
                description={`Sei sicuro di voler eliminare "${project.name}"? Tutte le entries associate verranno eliminate permanentemente.`}
                confirmLabel="Elimina"
                destructive
                onConfirm={handleDeleteProject}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};
