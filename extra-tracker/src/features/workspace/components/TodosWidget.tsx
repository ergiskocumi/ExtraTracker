/**
 * ✅ TODOS WIDGET
 * ==============
 * 
 * Widget compatto per visualizzare e gestire TODO dalla pagina principale.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiPlus, FiClock, FiAlertCircle, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { workspaceTodosService } from '../services/workspaceService';
import { TodoForm } from './TodoForm';
import type { WorkTodo, WorkProject } from '../types';

interface TodosWidgetProps {
    projects: WorkProject[];
    selectedProject?: string | null;
}

export const TodosWidget = ({ projects, selectedProject }: TodosWidgetProps) => {
    const navigate = useNavigate();
    const [todos, setTodos] = useState<WorkTodo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formProject, setFormProject] = useState<WorkProject | null>(null);

    // Carica TODO in base al progetto selezionato o tutti i TODO in scadenza
    useEffect(() => {
        const loadTodos = async () => {
            setLoading(true);
            try {
                let data: WorkTodo[] = [];
                
                if (selectedProject) {
                    // Carica TODO del progetto selezionato
                    data = await workspaceTodosService.getByProject(selectedProject);
                } else {
                    // Carica TODO in scadenza (prossimi 7 giorni)
                    data = await workspaceTodosService.getUpcoming(7);
                }
                
                // Filtra solo pending e in-progress
                data = data.filter(t => t.status === 'pending' || t.status === 'in-progress');
                
                // Ordina per priorità e data scadenza
                data.sort((a, b) => {
                    const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
                    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                    if (priorityDiff !== 0) return priorityDiff;
                    
                    if (a.dueDate && b.dueDate) {
                        return a.dueDate.localeCompare(b.dueDate);
                    }
                    if (a.dueDate) return -1;
                    if (b.dueDate) return 1;
                    
                    return 0;
                });
                
                setTodos(data.slice(0, 5));
            } catch (err) {
                setTodos([]);
            } finally {
                setLoading(false);
            }
        };
        
        loadTodos();
    }, [selectedProject]);

    const handleCreateTodo = (project?: WorkProject) => {
        if (project) {
            setFormProject(project);
        } else if (selectedProject) {
            const project = projects.find(p => {
                const pid = p.id || (p as any)._id;
                return String(pid) === String(selectedProject);
            });
            setFormProject(project || null);
        } else if (projects.length > 0) {
            setFormProject(projects[0]);
        }
        setShowForm(true);
    };

    const getProjectName = (todo: WorkTodo) => {
        const projectId = typeof todo.project === 'string' ? todo.project : todo.project.id;
        const project = projects.find(p => {
            const pid = p.id || (p as any)._id;
            return String(pid) === String(projectId);
        });
        return project?.name || 'Progetto sconosciuto';
    };

    const getProjectColor = (todo: WorkTodo) => {
        const projectId = typeof todo.project === 'string' ? todo.project : todo.project.id;
        const project = projects.find(p => {
            const pid = p.id || (p as any)._id;
            return String(pid) === String(projectId);
        });
        return project?.color || '#6366f1';
    };

    const isOverdue = (dueDate?: string) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    const formatDueDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return `Scaduto ${Math.abs(diffDays)} giorni fa`;
        if (diffDays === 0) return 'Scade oggi';
        if (diffDays === 1) return 'Scade domani';
        if (diffDays < 7) return `Tra ${diffDays} giorni`;
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    };

    const priorityColors = {
        urgent: 'bg-red-500/20 border-red-500/50 text-red-300',
        high: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
        medium: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
        low: 'bg-green-500/20 border-green-500/50 text-green-300',
    };

    if (loading) {
        return (
            <div className="card p-6">
                <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <FiCheckCircle className="text-emerald-400" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">TODO & Promemoria</h3>
                        <p className="text-xs text-white/50">
                            {selectedProject 
                                ? 'TODO del progetto selezionato' 
                                : 'Prossimi TODO in scadenza'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => handleCreateTodo()}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                >
                    <FiPlus size={18} />
                    <span className="hidden sm:inline">Nuovo</span>
                </button>
            </div>

            {/* LISTA TODO */}
            {todos.length === 0 ? (
                <div className="text-center py-8">
                    <FiCheckCircle size={40} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/60 mb-2 text-sm">
                        {selectedProject 
                            ? 'Nessun TODO per questo progetto' 
                            : 'Nessun TODO in scadenza'}
                    </p>
                    <button
                        onClick={() => handleCreateTodo()}
                        className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                        Crea il primo TODO
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {todos.map((todo) => {
                            const projectName = getProjectName(todo);
                            const projectColor = getProjectColor(todo);
                            const overdue = todo.dueDate && isOverdue(todo.dueDate);
                            
                            return (
                                <motion.div
                                    key={todo.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onClick={() => {
                                        const projectId = typeof todo.project === 'string' 
                                            ? todo.project 
                                            : todo.project.id;
                                        navigate(`/workspace/project/${projectId}`);
                                    }}
                                    className={`
                                        p-3 rounded-lg border-2 cursor-pointer transition-all
                                        ${overdue
                                            ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                                        }
                                    `}
                                >
                                    <div className="flex items-start gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                                            style={{ backgroundColor: projectColor }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className={`
                                                    font-semibold text-sm truncate
                                                    ${overdue ? 'text-red-300' : 'text-white'}
                                                `}>
                                                    {todo.title}
                                                </h4>
                                                <span className={`
                                                    px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0
                                                    ${priorityColors[todo.priority]}
                                                `}>
                                                    {todo.priority === 'urgent' ? '🔴' : 
                                                     todo.priority === 'high' ? '🟠' : 
                                                     todo.priority === 'medium' ? '🟡' : '🟢'}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 text-xs text-white/50">
                                                <span className="truncate">{projectName}</span>
                                                {todo.dueDate && (
                                                    <div className={`
                                                        flex items-center gap-1 flex-shrink-0
                                                        ${overdue ? 'text-red-400' : 'text-white/50'}
                                                    `}>
                                                        <FiClock size={12} />
                                                        <span>{formatDueDate(todo.dueDate)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <FiChevronRight className="text-white/30 flex-shrink-0 mt-1" size={16} />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    
                    {todos.length >= 5 && (
                        <button
                            onClick={() => {
                                if (selectedProject) {
                                    navigate(`/workspace/project/${selectedProject}`);
                                } else {
                                    // Mostra tutti i TODO
                                }
                            }}
                            className="w-full mt-3 py-2 text-sm text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <span>Vedi tutti i TODO</span>
                            <FiChevronRight size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* FORM MODAL */}
            {showForm && formProject && (
                <TodoForm
                    project={formProject}
                    onClose={() => {
                        setShowForm(false);
                        setFormProject(null);
                    }}
                    onSave={async () => {
                        // Ricarica TODO
                        const loadTodos = async () => {
                            try {
                                let data: WorkTodo[] = [];
                                if (selectedProject) {
                                    data = await workspaceTodosService.getByProject(selectedProject);
                                } else {
                                    data = await workspaceTodosService.getUpcoming(7);
                                }
                                data = data.filter(t => t.status === 'pending' || t.status === 'in-progress');
                                data.sort((a, b) => {
                                    const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
                                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                                });
                                setTodos(data.slice(0, 5));
                            } catch (err) {
                                // Errore silenzioso, i TODO verranno ricaricati al prossimo refresh
                            }
                        };
                        await loadTodos();
                        setShowForm(false);
                        setFormProject(null);
                    }}
                />
            )}
        </div>
    );
};
