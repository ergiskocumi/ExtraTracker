/**
 * ✅ TODO LIST
 * ===========
 * 
 * Lista TODO per un progetto con filtri e azioni.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiFilter, FiCheckCircle, FiCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import { TodoItem } from './TodoItem';
import { TodoForm } from './TodoForm';
import type { WorkTodo, WorkProject } from '../types';

interface TodoListProps {
    project: WorkProject;
    todos: WorkTodo[];
    loading: boolean;
    onRefresh: () => void;
}

export const TodoList = ({ project, todos, loading, onRefresh }: TodoListProps) => {
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
    const [showForm, setShowForm] = useState(false);
    const [editingTodo, setEditingTodo] = useState<WorkTodo | undefined>();

    // Filtra TODO
    const filteredTodos = useMemo(() => {
        let filtered = [...todos];
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }
        
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(t => t.priority === priorityFilter);
        }
        
        // Ordina: pending/in-progress prima, poi per priorità, poi per data
        return filtered.sort((a, b) => {
            // Prima per stato (pending/in-progress prima)
            const statusOrder = { 'pending': 0, 'in-progress': 1, 'completed': 2, 'cancelled': 3 };
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            if (statusDiff !== 0) return statusDiff;
            
            // Poi per priorità
            const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            // Poi per data di scadenza (se presente)
            if (a.dueDate && b.dueDate) {
                return a.dueDate.localeCompare(b.dueDate);
            }
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            
            // Infine per data di creazione
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [todos, statusFilter, priorityFilter]);

    const stats = useMemo(() => {
        return {
            pending: todos.filter(t => t.status === 'pending').length,
            inProgress: todos.filter(t => t.status === 'in-progress').length,
            completed: todos.filter(t => t.status === 'completed').length,
            total: todos.length,
        };
    }, [todos]);

    if (loading) {
        return (
            <div className="card p-6">
                <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="card p-6">
                <p className="text-red-400">Errore: progetto non trovato</p>
            </div>
        );
    }

    return (
        <div className="card p-6">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <FiCheckCircle className="text-emerald-400" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">TODO & Promemoria</h3>
                        <p className="text-xs text-white/50">
                            {stats.total} task • {stats.pending} da fare • {stats.completed} completati
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingTodo(undefined);
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                >
                    <FiPlus size={18} />
                    <span>Nuovo TODO</span>
                </button>
            </div>

            {/* FILTRI */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <FiFilter className="text-white/40" size={16} />
                    <span className="text-sm text-white/60">Stato:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">Tutti</option>
                        <option value="pending">⏳ Da fare</option>
                        <option value="in-progress">🔄 In corso</option>
                        <option value="completed">✅ Completati</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-sm text-white/60">Priorità:</span>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as any)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">Tutte</option>
                        <option value="urgent">🔴 Urgente</option>
                        <option value="high">🟠 Alta</option>
                        <option value="medium">🟡 Media</option>
                        <option value="low">🟢 Bassa</option>
                    </select>
                </div>

                {(statusFilter !== 'all' || priorityFilter !== 'all') && (
                    <button
                        onClick={() => {
                            setStatusFilter('all');
                            setPriorityFilter('all');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
                    >
                        Reset
                    </button>
                )}
            </div>

            {/* LISTA TODO */}
            {filteredTodos.length === 0 ? (
                <div className="text-center py-12">
                    <FiCheckCircle size={48} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/60 mb-2">
                        {todos.length === 0 
                            ? 'Nessun TODO ancora' 
                            : 'Nessun TODO corrisponde ai filtri'}
                    </p>
                    {todos.length === 0 && (
                        <p className="text-sm text-white/40">
                            Crea il tuo primo TODO per tracciare le attività del progetto
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {filteredTodos.map((todo) => (
                            <TodoItem
                                key={todo.id}
                                todo={todo}
                                project={project}
                                onUpdate={onRefresh}
                                onEdit={(todo) => {
                                    setEditingTodo(todo);
                                    setShowForm(true);
                                }}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* FORM MODAL */}
            {showForm && (
                <TodoForm
                    project={project}
                    todo={editingTodo}
                    onClose={() => {
                        setShowForm(false);
                        setEditingTodo(undefined);
                    }}
                    onSave={async () => {
                        await onRefresh();
                        setShowForm(false);
                        setEditingTodo(undefined);
                    }}
                />
            )}
        </div>
    );
};
