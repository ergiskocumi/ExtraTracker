/**
 * 📝 ENTRY FORM
 * =============
 * 
 * Form per creare/modificare una entry del Work Journal.
 * Include selezione categoria e template dinamico.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWorkspace } from '../context/WorkspaceContext';
import { TemplateSelector } from './templates/TemplateSelector';
import { DevelopmentTemplate } from './templates/DevelopmentTemplate';
import { TicketTemplate } from './templates/TicketTemplate';
import { DocumentationTemplate } from './templates/DocumentationTemplate';
import { FreeformTemplate } from './templates/FreeformTemplate';
import { FiX, FiSave } from 'react-icons/fi';
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

export const EntryForm = ({ onClose, entry, defaultProjectId, defaultDate }: EntryFormProps) => {
    const { projects, addEntry, updateEntry } = useWorkspace();
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [projectId, setProjectId] = useState(entry ? (typeof entry.project === 'string' ? entry.project : entry.project.id) : (defaultProjectId || ''));
    const [selectedDate, setSelectedDate] = useState<Date | null>(
        entry?.date ? new Date(entry.date) : (defaultDate ? new Date(defaultDate) : new Date())
    );
    const [category, setCategory] = useState<WorkEntryCategory>(entry?.category || 'freeform');
    const [title, setTitle] = useState(entry?.title || '');
    const [content, setContent] = useState(entry?.content || '');
    const [tags, setTags] = useState<string[]>(entry?.tags || []);
    const [duration, setDuration] = useState<number | undefined>(entry?.duration);
    const [templateData, setTemplateData] = useState<Record<string, unknown>>(entry?.templateData || {});

    const isEditing = !!entry;

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
        
        const data: CreateWorkEntryDTO = {
            project: projectId,
            date: dateStr,
            category,
            title: title.trim(),
            content: content.trim() || undefined,
            templateData: Object.keys(templateData).length > 0 ? templateData : undefined,
            tags: tags.length > 0 ? tags : undefined,
            duration: duration || undefined,
        };

        setLoading(true);
        try {
            if (isEditing) {
                await updateEntry(entry.id, data);
            } else {
                await addEntry(data);
            }
            onClose();
        } catch (err) {
            // Errori già gestiti dal context
        } finally {
            setLoading(false);
        }
    };

    const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            e.preventDefault();
            const newTag = e.currentTarget.value.trim();
            if (!tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            e.currentTarget.value = '';
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
    };

    // Render template in base alla categoria
    const renderTemplate = () => {
        switch (category) {
            case 'development':
                return (
                    <DevelopmentTemplate
                        data={templateData}
                        onChange={setTemplateData}
                    />
                );
            case 'ticket':
                return (
                    <TicketTemplate
                        data={templateData}
                        onChange={setTemplateData}
                    />
                );
            case 'documentation':
                return (
                    <DocumentationTemplate
                        data={templateData}
                        onChange={setTemplateData}
                    />
                );
            case 'freeform':
            case 'meeting':
            case 'research':
            default:
                return (
                    <FreeformTemplate
                        data={templateData}
                        onChange={setTemplateData}
                    />
                );
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="card p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* PROGETTO */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Progetto *
                        </label>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                        >
                            <option value="">Seleziona progetto...</option>
                            {projects
                                .filter((p) => p.status === 'active')
                                .map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.icon} {p.name}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* DATA */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
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
                        <TemplateSelector
                            value={category}
                            onChange={setCategory}
                        />
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

                    {/* TEMPLATE (dinamico in base alla categoria) */}
                    {renderTemplate()}

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

                    {/* DURATA (opzionale) */}
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
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Tag (premi Enter per aggiungere)
                        </label>
                        <input
                            type="text"
                            onKeyDown={handleTagInput}
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Aggiungi tag..."
                        />
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
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
    );
};
