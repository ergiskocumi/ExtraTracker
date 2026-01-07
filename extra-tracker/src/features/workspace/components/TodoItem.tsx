/**
 * ✅ TODO ITEM
 * ===========
 * 
 * Singolo TODO con azioni rapide.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiCircle, FiEdit2, FiTrash2, FiClock, FiAlertCircle } from 'react-icons/fi';
import { workspaceTodosService } from '../services/workspaceService';
import { emitToast } from '../../../shared/components/toast';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import type { WorkTodo, WorkProject } from '../types';

interface TodoItemProps {
    todo: WorkTodo;
    project: WorkProject;
    onUpdate: () => void;
    onEdit: (todo: WorkTodo) => void;
}

const PRIORITY_COLORS = {
    urgent: 'bg-red-500/20 border-red-500/50 text-red-300',
    high: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
    medium: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
    low: 'bg-green-500/20 border-green-500/50 text-green-300',
};

const PRIORITY_LABELS = {
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Media',
    low: 'Bassa',
};

export const TodoItem = ({ todo, project, onUpdate, onEdit }: TodoItemProps) => {
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isCompleted = todo.status === 'completed';
    const isOverdue = todo.dueDate && !isCompleted && new Date(todo.dueDate) < new Date();

    const handleToggleComplete = async () => {
        setLoading(true);
        try {
            if (isCompleted) {
                await workspaceTodosService.reopen(todo.id);
                emitToast.success('TODO riaperto', { title: 'Task' });
            } else {
                await workspaceTodosService.complete(todo.id);
                emitToast.success('TODO completato!', { title: 'Task' });
            }
            onUpdate();
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'aggiornamento del TODO');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await workspaceTodosService.delete(todo.id);
            emitToast.success('TODO eliminato', { title: 'Task' });
            onUpdate();
        } catch (err: any) {
            emitToast.error(err.message || 'Errore nell\'eliminazione del TODO');
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const formatDueDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return `Scaduto ${Math.abs(diffDays)} giorni fa`;
        if (diffDays === 0) return 'Scade oggi';
        if (diffDays === 1) return 'Scade domani';
        if (diffDays < 7) return `Scade tra ${diffDays} giorni`;
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`
                    p-4 rounded-xl border-2 transition-all
                    ${isCompleted 
                        ? 'bg-white/5 border-white/10 opacity-60' 
                        : isOverdue
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }
                `}
            >
                <div className="flex items-start gap-3">
                    {/* CHECKBOX */}
                    <button
                        onClick={handleToggleComplete}
                        disabled={loading}
                        className={`
                            flex-shrink-0 mt-0.5 transition-all
                            ${isCompleted 
                                ? 'text-emerald-400' 
                                : 'text-white/40 hover:text-white/60'
                            }
                        `}
                    >
                        {isCompleted ? (
                            <FiCheckCircle size={22} />
                        ) : (
                            <FiCircle size={22} />
                        )}
                    </button>

                    {/* CONTENUTO */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className={`
                                font-semibold text-base
                                ${isCompleted 
                                    ? 'text-white/50 line-through' 
                                    : 'text-white'
                                }
                            `}>
                                {todo.title}
                            </h4>
                            
                            {/* PRIORITÀ */}
                            <span className={`
                                px-2 py-0.5 rounded-lg text-xs font-medium border flex-shrink-0
                                ${PRIORITY_COLORS[todo.priority]}
                            `}>
                                {PRIORITY_LABELS[todo.priority]}
                            </span>
                        </div>

                        {todo.description && (
                            <p className={`
                                text-sm mb-2
                                ${isCompleted ? 'text-white/40' : 'text-white/60'}
                            `}>
                                {todo.description}
                            </p>
                        )}

                        {/* METADATA */}
                        <div className="flex items-center gap-4 text-xs">
                            {todo.dueDate && (
                                <div className={`
                                    flex items-center gap-1.5
                                    ${isOverdue 
                                        ? 'text-red-400' 
                                        : isCompleted
                                        ? 'text-white/40'
                                        : 'text-white/50'
                                    }
                                `}>
                                    <FiClock size={14} />
                                    <span>{formatDueDate(todo.dueDate)}</span>
                                </div>
                            )}
                            
                            {todo.status === 'in-progress' && (
                                <div className="flex items-center gap-1.5 text-primary-400">
                                    <FiAlertCircle size={14} />
                                    <span>In corso</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AZIONI */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={() => onEdit(todo)}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            title="Modifica"
                        >
                            <FiEdit2 size={16} />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                            title="Elimina"
                        >
                            <FiTrash2 size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* DELETE CONFIRMATION */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title="Elimina TODO"
                description={`Sei sicuro di voler eliminare "${todo.title}"?`}
                confirmLabel="Elimina"
                destructive
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
};
