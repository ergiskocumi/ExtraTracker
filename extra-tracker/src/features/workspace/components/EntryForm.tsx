/**
 * 📝 ENTRY FORM
 * =============
 * 
 * Form semplificato per creare/modificare una entry del Work Journal.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace } from '../context/WorkspaceContext';
import { FiX, FiSave, FiCalendar, FiFolder, FiTag } from 'react-icons/fi';
import DatePicker, { registerLocale } from 'react-datepicker';
import { it } from 'date-fns/locale/it';
import 'react-datepicker/dist/react-datepicker.css';
import type { WorkEntry, WorkEntryCategory, CreateWorkEntryDTO } from '../types';

registerLocale('it', it);

interface EntryFormProps {
    onClose: () => void;
    entry?: WorkEntry;
    defaultProjectId?: string;
    defaultDate?: string;
}

const CATEGORIES: Array<{ value: WorkEntryCategory; label: string; icon: string }> = [
    { value: 'development', label: 'Development', icon: '💻' },
    { value: 'documentation', label: 'Documentation', icon: '📝' },
    { value: 'ticket', label: 'Ticket', icon: '🎫' },
    { value: 'meeting', label: 'Meeting', icon: '🤝' },
    { value: 'research', label: 'Research', icon: '🔬' },
    { value: 'freeform', label: 'Freeform', icon: '📄' },
];

export const EntryForm = ({ onClose, entry, defaultProjectId, defaultDate }: EntryFormProps) => {
    const { projects, addEntry, updateEntry } = useWorkspace();
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [projectId, setProjectId] = useState<string>(() => {
        if (entry) {
            return typeof entry.project === 'string' ? entry.project : entry.project.id;
        }
        return defaultProjectId || '';
    });
    const [selectedDate, setSelectedDate] = useState<Date | null>(
        entry?.date ? new Date(entry.date) : (defaultDate ? new Date(defaultDate) : new Date())
    );
    const [category, setCategory] = useState<WorkEntryCategory>(entry?.category || 'freeform');
    const [title, setTitle] = useState(entry?.title || '');
    const [content, setContent] = useState(entry?.content || '');
    const [tags, setTags] = useState<string[]>(entry?.tags || []);
    const [duration, setDuration] = useState<number | undefined>(entry?.duration);
    const [tagInput, setTagInput] = useState('');

    const isEditing = !!entry;
    const activeProjects = projects.filter((p) => p.status === 'active');
    
    // Debug: verifica che i progetti abbiano ID validi
    useEffect(() => {
        console.log('🔍 EntryForm - Progetti attivi:', activeProjects.map(p => ({ id: p.id, name: p.name, idType: typeof p.id })));
        console.log('🔍 EntryForm - projectId corrente:', projectId, 'tipo:', typeof projectId);
    }, [activeProjects, projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!projectId) {
            alert('Seleziona un progetto');
            return;
        }
        
        if (!title.trim()) {
            alert('Il titolo è obbligatorio');
            return;
        }
        
        if (!selectedDate) {
            alert('Seleziona una data');
            return;
        }

        const dateStr = selectedDate.toISOString().split('T')[0];
        
        // Verifica che projectId sia un ID valido, non il testo
        // Supporta sia id che _id
        const selectedProjectObj = activeProjects.find(p => {
            const pid = p.id || (p as any)._id;
            return String(pid) === String(projectId);
        });
        if (!selectedProjectObj) {
            console.error('❌ Progetto non trovato! projectId:', projectId);
            console.error('📂 Progetti disponibili:', activeProjects);
            alert(`Progetto non valido. Seleziona un progetto dalla lista.\n\nprojectId: ${projectId}`);
            return;
        }
        
        // Usa l'ID del progetto trovato per sicurezza (supporta sia id che _id)
        const finalProjectId = selectedProjectObj.id || (selectedProjectObj as any)._id;
        
        const data: CreateWorkEntryDTO = {
            project: finalProjectId, // Usa sempre l'ID del progetto trovato
            date: dateStr,
            category,
            title: title.trim(),
            content: content.trim() || undefined,
            tags: tags.length > 0 ? tags : undefined,
            duration: duration || undefined,
        };

        console.log('📝 Dati entry da inviare:', data);
        console.log('📝 projectId originale:', projectId);
        console.log('📝 finalProjectId usato:', finalProjectId);
        console.log('📂 Progetto trovato:', selectedProjectObj);

        setLoading(true);
        try {
            if (isEditing) {
                await updateEntry(entry.id, data);
            } else {
                await addEntry(data);
            }
            onClose();
        } catch (err: any) {
            console.error('❌ Errore creazione entry:', err);
            // Mostra errore più dettagliato
            if (err.response?.data?.error?.message) {
                alert(`Errore: ${err.response.data.error.message}`);
            } else if (err.message) {
                alert(`Errore: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
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
                    className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                >
                    {/* HEADER */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-white">
                            {isEditing ? 'Modifica Entry' : 'Nuova Entry'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* PROGETTO */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                                <FiFolder size={16} />
                                Progetto *
                            </label>
                            <select
                                value={projectId}
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    console.log('🔍 Select cambiato - valore selezionato:', selectedValue);
                                    console.log('🔍 Select cambiato - tipo:', typeof selectedValue);
                                    console.log('🔍 Select cambiato - opzioni disponibili:', activeProjects.map(p => ({ id: p.id, name: p.name })));
                                    
                                    // Verifica che il valore sia un ID valido
                                    const project = activeProjects.find(p => p.id === selectedValue);
                                    if (!project && selectedValue) {
                                        console.error('❌ Valore selezionato non corrisponde a nessun progetto!', selectedValue);
                                        alert('Errore: progetto non valido. Seleziona un progetto dalla lista.');
                                        return;
                                    }
                                    
                                    setProjectId(selectedValue);
                                }}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            >
                                <option key="empty" value="">Seleziona progetto...</option>
                                {activeProjects.map((p) => {
                                    // Usa id o _id come fallback
                                    const projectId = p.id || (p as any)._id;
                                    if (!projectId) {
                                        console.error('❌ Progetto senza ID!', p);
                                        return null;
                                    }
                                    return (
                                        <option key={projectId} value={String(projectId)}>
                                            {p.icon} {p.name}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* DATA */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                                <FiCalendar size={16} />
                                Data *
                            </label>
                            <DatePicker
                                selected={selectedDate}
                                onChange={(date: Date | null) => setSelectedDate(date)}
                                dateFormat="dd/MM/yyyy"
                                locale="it"
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                calendarClassName="dark-calendar"
                                required
                            />
                        </div>

                        {/* CATEGORIA */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Categoria *
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value)}
                                        className={`
                                            p-3 rounded-lg border-2 transition-all text-center
                                            ${category === cat.value
                                                ? 'border-primary-500 bg-primary-500/20 scale-105'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        <div className="text-2xl mb-1">{cat.icon}</div>
                                        <div className="text-xs text-white/80">{cat.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* TITOLO */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Titolo *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Es. Auth JWT implementato"
                                required
                            />
                        </div>

                        {/* CONTENUTO */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Note / Contenuto
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                placeholder="Aggiungi note dettagliate..."
                            />
                        </div>

                        {/* DURATA */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Durata (minuti, opzionale)
                            </label>
                            <input
                                type="number"
                                value={duration || ''}
                                onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                                min="0"
                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Es. 120"
                            />
                        </div>

                        {/* TAG */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                                <FiTag size={16} />
                                Tag
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTag();
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Aggiungi tag (premi Enter)"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    className="px-4 py-2 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-300 transition-colors"
                                >
                                    Aggiungi
                                </button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary-500/20 text-primary-300 text-sm"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="hover:text-primary-100"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ACTIONS */}
                        <div className="flex items-center gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <FiSave size={18} />
                                {loading ? 'Salvataggio...' : isEditing ? 'Salva' : 'Crea'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
