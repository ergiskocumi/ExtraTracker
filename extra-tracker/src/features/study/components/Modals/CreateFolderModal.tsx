/**
 * 📁 CREATE FOLDER MODAL - Stile macOS
 * 
 * Modale elegante per creare una nuova cartella
 * in stile macOS, scuro e allineato ai colori del progetto
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, X } from 'lucide-react';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string) => Promise<void>;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
}) => {
    const [folderName, setFolderName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input quando si apre il modale
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Reset quando si chiude
    useEffect(() => {
        if (!isOpen) {
            setFolderName('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!folderName.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(folderName.trim());
            onClose();
        } catch (error) {
            // L'errore viene gestito dal componente padre
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Backdrop - Scuro */}
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-theme-overlay"
                    style={{ WebkitBackdropFilter: 'blur(20px)' }}
                />

                {/* Modal Window - Stile macOS scuro */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ 
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md bg-theme-elevated backdrop-blur-2xl rounded-3xl border border-theme-default shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden"
                    style={{ 
                        WebkitBackdropFilter: 'blur(40px)',
                        backdropFilter: 'blur(40px)',
                    }}
                    onKeyDown={handleKeyDown}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-theme-elevated/90">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
                                <Folder className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-theme-primary">Nuova Cartella</h2>
                                <p className="text-xs text-theme-muted">Organizza i tuoi mazzi</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="p-1.5 rounded-lg hover:bg-theme-surface transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-5 h-5 text-theme-muted" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 bg-theme-elevated/30">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Input Field */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="folder-name"
                                    className="block text-sm font-medium text-theme-primary"
                                >
                                    Nome della cartella
                                </label>
                                <motion.input
                                    ref={inputRef}
                                    id="folder-name"
                                    type="text"
                                    value={folderName}
                                    onChange={(e) => setFolderName(e.target.value)}
                                    placeholder="Es: Programmazione, Matematica..."
                                    disabled={isSubmitting}
                                    className="
                                        w-full px-4 py-3.5 rounded-xl
                                        bg-theme-surface/60 border border-theme-default
                                        text-theme-primary placeholder:text-theme-muted
                                        focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-colors duration-200
                                    "
                                    whileFocus={{ scale: 1.01 }}
                                />
                                <p className="text-xs text-theme-muted">
                                    Scegli un nome descrittivo per organizzare i tuoi mazzi
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <motion.button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="
                                        px-5 py-2.5 rounded-xl
                                        bg-theme-surface/60 hover:bg-theme-surface
                                        border border-theme-default hover:border-theme-strong
                                        text-theme-secondary hover:text-theme-primary
                                        font-medium text-sm
                                        transition-colors duration-200
                                        active:scale-[0.97]
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                >
                                    Annulla
                                </motion.button>
                                <motion.button
                                    type="submit"
                                    disabled={!folderName.trim() || isSubmitting}
                                    whileHover={{ scale: folderName.trim() ? 1.02 : 1 }}
                                    whileTap={{ scale: folderName.trim() ? 0.98 : 1 }}
                                    className="
                                        px-6 py-2.5 rounded-xl
                                        bg-gradient-to-r from-violet-500 to-violet-600
                                        hover:from-violet-600 hover:to-violet-700
                                        text-white font-semibold text-sm
                                        shadow-[0_4px_12px_-4px_rgba(139,92,246,0.4)]
                                        hover:shadow-[0_8px_20px_-6px_rgba(139,92,246,0.5)]
                                        transition-colors duration-200
                                        active:scale-[0.97]
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                >
                                    {isSubmitting ? 'Creazione...' : 'Crea'}
                                </motion.button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
