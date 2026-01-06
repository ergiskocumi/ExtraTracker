import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import type { Project } from '../type';
import { ProjectForm } from '../ProjectForm';
import { BuildingIcon } from '../../../shared/components/icons';

interface ProjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    onAdd: (params: {
        name: string;
        code: string;
        type: 'CLIENT' | 'PERSONAL';
        rate?: number;
        budget?: number;
        description?: string;
        estimatedHours?: number;
        progress?: number;
    }) => void;
}

export const ProjectFormModal = ({ isOpen, onClose, projects, onAdd }: ProjectFormModalProps) => {
    const handleAdd = (params: {
        name: string;
        code: string;
        type: 'CLIENT' | 'PERSONAL';
        rate?: number;
        budget?: number;
        description?: string;
        estimatedHours?: number;
        progress?: number;
    }) => {
        onAdd(params);
        onClose(); // Chiudi il modal dopo l'aggiunta
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-lg"
                    />

                    {/* Modal */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        initial={{ scale: 0.95, y: 12, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 12, opacity: 0 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                        onClick={(event) => event.stopPropagation()}
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/30 pointer-events-none" />

                        {/* Header */}
                        <div className="relative flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-white/10">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/15 text-primary-300">
                                    <BuildingIcon size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        Nuovo Progetto
                                    </h2>
                                    <p className="mt-1 text-sm text-white/60">
                                        Definisci tariffa, stima e progresso per attivare il monitoraggio
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                                aria-label="Close"
                            >
                                <FiX className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="relative overflow-y-auto max-h-[calc(90vh-120px)]">
                            <div className="p-6">
                                <ProjectForm projects={projects} onAdd={handleAdd} />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
