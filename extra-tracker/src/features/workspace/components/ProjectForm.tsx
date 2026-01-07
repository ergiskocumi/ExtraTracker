/**
 * 📝 PROJECT FORM
 * ===============
 * 
 * Form per creare/modificare un progetto.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspace } from '../context/WorkspaceContext';
import { FiX, FiBriefcase, FiUser } from 'react-icons/fi';
import { emitToast } from '../../../shared/components/toast';

interface ProjectFormProps {
    onClose: () => void;
    project?: {
        id: string;
        name: string;
        description?: string;
        color: string;
        icon: string;
        type?: 'CLIENT' | 'PERSONAL';
        rate?: number;
    };
}

const DEFAULT_COLORS = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#ef4444', // red
    '#14b8a6', // teal
];

const DEFAULT_ICONS = ['📂', '💻', '🎨', '📱', '🔧', '📊', '🚀', '🎯'];

export const ProjectForm = ({ onClose, project }: ProjectFormProps) => {
    const { addProject, updateProject } = useWorkspace();
    const [projectType, setProjectType] = useState<'CLIENT' | 'PERSONAL'>(project?.type || 'CLIENT');
    const [name, setName] = useState(project?.name || '');
    const [description, setDescription] = useState(project?.description || '');
    const [rate, setRate] = useState<number | undefined>(project?.rate);
    const [color, setColor] = useState(project?.color || DEFAULT_COLORS[0]);
    const [icon, setIcon] = useState(project?.icon || DEFAULT_ICONS[0]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) {
            emitToast.error('Il nome del progetto è obbligatorio', { title: 'Errore' });
            return;
        }

        // Validazione: rate obbligatorio per CLIENT
        if (projectType === 'CLIENT' && (!rate || rate <= 0)) {
            emitToast.error('La tariffa oraria è obbligatoria per progetti CLIENT', { title: 'Errore' });
            return;
        }

        setLoading(true);
        try {
            const projectData: any = {
                name,
                description,
                color,
                icon,
                type: projectType,
            };
            
            // Rate solo per CLIENT
            if (projectType === 'CLIENT') {
                projectData.rate = rate;
            }
            
            if (project) {
                await updateProject(project.id, projectData);
            } else {
                await addProject(projectData);
            }
            onClose();
        } catch (err) {
            // Errori già gestiti dal context
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card p-5"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                    {project ? 'Modifica Progetto' : 'Nuovo Progetto'}
                </h3>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                    <FiX size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* TIPO PROGETTO */}
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        Tipo Progetto *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setProjectType('CLIENT')}
                            className={`
                                p-4 rounded-lg border-2 transition-all text-left
                                ${projectType === 'CLIENT'
                                    ? 'border-primary-500 bg-primary-500/20'
                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                }
                            `}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <FiBriefcase size={18} />
                                <span className="font-semibold text-white">Cliente</span>
                            </div>
                            <p className="text-xs text-white/60">Progetto fatturabile con tariffa oraria</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setProjectType('PERSONAL')}
                            className={`
                                p-4 rounded-lg border-2 transition-all text-left
                                ${projectType === 'PERSONAL'
                                    ? 'border-primary-500 bg-primary-500/20'
                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                }
                            `}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <FiUser size={18} />
                                <span className="font-semibold text-white">Personale</span>
                            </div>
                            <p className="text-xs text-white/60">Progetto personale senza tariffa</p>
                        </button>
                    </div>
                </div>

                {/* NOME */}
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        Nome *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Es. Jarvis AI"
                        required
                    />
                </div>

                {/* TARIFFA ORARIA (solo per CLIENT) */}
                {projectType === 'CLIENT' && (
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Tariffa Oraria (€) *
                        </label>
                        <input
                            type="number"
                            value={rate || ''}
                            onChange={(e) => setRate(e.target.value ? parseFloat(e.target.value) : undefined)}
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Es. 75.00"
                            required
                        />
                    </div>
                )}

                {/* DESCRIZIONE */}
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        Descrizione
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        placeholder="Breve descrizione del progetto..."
                    />
                </div>

                {/* COLORE */}
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        Colore
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {DEFAULT_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                                    color === c
                                        ? 'border-white scale-110'
                                        : 'border-white/20 hover:border-white/40'
                                }`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* ICONA */}
                <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        Icona
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {DEFAULT_ICONS.map((i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setIcon(i)}
                                className={`w-10 h-10 rounded-lg border-2 text-xl transition-all ${
                                    icon === i
                                        ? 'border-primary-500 bg-primary-500/20 scale-110'
                                        : 'border-white/20 hover:border-white/40'
                                }`}
                            >
                                {i}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-3 pt-2">
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
                        className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Salvataggio...' : project ? 'Salva' : 'Crea'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};
