/**
 * ✅ TODO FORM
 * ============
 * 
 * Form per creare/modificare TODO.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSave, FiCalendar, FiAlertCircle } from 'react-icons/fi';
import DatePicker, { registerLocale } from 'react-datepicker';
import { it } from 'date-fns/locale/it';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import { workspaceTodosService } from '../services/workspaceService';
import type { WorkTodo, WorkProject, CreateWorkTodoDTO } from '../types';

registerLocale('it', it);

interface TodoFormProps {
    project: WorkProject;
    todo?: WorkTodo;
    onClose: () => void;
    onSave: () => void;
}

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Bassa', color: 'text-green-400', icon: '🟢' },
    { value: 'medium', label: 'Media', color: 'text-yellow-400', icon: '🟡' },
    { value: 'high', label: 'Alta', color: 'text-orange-400', icon: '🟠' },
    { value: 'urgent', label: 'Urgente', color: 'text-red-400', icon: '🔴' },
];

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Da fare', icon: '⏳' },
    { value: 'in-progress', label: 'In corso', icon: '🔄' },
    { value: 'completed', label: 'Completato', icon: '✅' },
];

export const TodoForm = ({ project, todo, onClose, onSave }: TodoFormProps) => {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState(todo?.title || '');
    const [description, setDescription] = useState(todo?.description || '');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(
        todo?.priority || 'medium'
    );
    const [status, setStatus] = useState<'pending' | 'in-progress' | 'completed' | 'cancelled'>(
        todo?.status || 'pending'
    );
    const [dueDate, setDueDate] = useState<Date | null>(
        todo?.dueDate ? new Date(todo.dueDate) : null
    );

    const isEditing = !!todo;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim()) {
            alert('Il titolo è obbligatorio');
            return;
        }

        // Assicurati che projectId sia valido
        const projectId = project.id || (project as any)._id;
        if (!projectId) {
            alert('Errore: progetto non valido');
            return;
        }

        const data: CreateWorkTodoDTO = {
            project: String(projectId),
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            status: status === 'cancelled' ? 'pending' : status,
            dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
        };

        setLoading(true);
        try {
            if (isEditing && todo) {
                await workspaceTodosService.update(todo.id, data);
            } else {
                await workspaceTodosService.create(data);
            }
            onSave();
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Errore nel salvataggio del TODO';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-white/10 w-full max-w-lg overflow-hidden"
                >
                    {/* HEADER */}
                    <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <FiAlertCircle className="text-emerald-400" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">
                                    {isEditing ? 'Modifica TODO' : 'Nuovo TODO'}
                                </h3>
                                <p className="text-xs text-white/50">
                                    {project.icon} {project.name}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* TITOLO */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2.5">
                                <span className="flex items-center gap-2">
                                    Titolo
                                    <span className="text-red-400">*</span>
                                </span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 text-white text-base focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                                placeholder="Es. Implementare autenticazione JWT"
                                required
                            />
                        </div>

                        {/* DESCRIZIONE */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2.5">
                                Descrizione (opzionale)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none transition-all"
                                placeholder="Aggiungi dettagli o note..."
                            />
                        </div>

                        {/* PRIORITÀ */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2.5">
                                Priorità *
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {PRIORITY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setPriority(opt.value as any)}
                                        className={`
                                            p-3 rounded-xl border-2 transition-all text-center
                                            ${priority === opt.value
                                                ? 'border-primary-500 bg-primary-500/20 shadow-lg shadow-primary-500/20'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        <div className="text-xl mb-1">{opt.icon}</div>
                                        <div className={`text-xs font-medium ${priority === opt.value ? 'text-white' : opt.color}`}>
                                            {opt.label}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* STATO */}
                        {isEditing && (
                            <div>
                                <label className="block text-sm font-semibold text-white mb-2.5">
                                    Stato
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setStatus(opt.value as any)}
                                            className={`
                                                p-3 rounded-xl border-2 transition-all text-center
                                                ${status === opt.value
                                                    ? 'border-primary-500 bg-primary-500/20 shadow-lg shadow-primary-500/20'
                                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                                }
                                            `}
                                        >
                                            <div className="text-xl mb-1">{opt.icon}</div>
                                            <div className={`text-xs font-medium ${status === opt.value ? 'text-white' : 'text-white/70'}`}>
                                                {opt.label}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DATA SCADENZA */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2.5">
                                <FiCalendar size={16} />
                                Data di scadenza (opzionale)
                            </label>
                            <DatePicker
                                selected={dueDate}
                                onChange={(date: Date | null) => setDueDate(date)}
                                dateFormat="dd/MM/yyyy"
                                locale="it"
                                minDate={new Date()}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 text-white text-base focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                                calendarClassName="dark-calendar"
                                placeholderText="Seleziona data..."
                            />
                            {dueDate && (
                                <p className="text-xs text-white/50 mt-1.5">
                                    Scadenza: {format(dueDate, 'dd MMMM yyyy', { locale: it })}
                                </p>
                            )}
                        </div>

                        {/* ACTIONS */}
                        <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border-2 border-white/10 text-white font-medium transition-all"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <FiSave size={18} />
                                {loading ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Crea TODO'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
