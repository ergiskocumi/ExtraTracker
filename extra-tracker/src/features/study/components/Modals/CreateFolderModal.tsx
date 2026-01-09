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
                    className="absolute inset-0 bg-black/70"
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
                    className="relative w-full max-w-md bg-zinc-900/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                    style={{ 
                        WebkitBackdropFilter: 'blur(40px)',
                        backdropFilter: 'blur(40px)',
                    }}
                    onKeyDown={handleKeyDown}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
                                <Folder className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Nuova Cartella</h2>
                                <p className="text-xs text-white/60">Organizza i tuoi mazzi</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-5 h-5 text-white/60" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 bg-zinc-900/30">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Input Field */}
                            <div className="space-y-2">
                                <label 
                                    htmlFor="folder-name"
                                    className="block text-sm font-medium text-white/80"
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
                                        bg-zinc-800/50 border border-white/10
                                        text-white placeholder:text-white/40
                                        focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-all duration-200
                                    "
                                    whileFocus={{ scale: 1.01 }}
                                />
                                <p className="text-xs text-white/50">
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
                                        bg-zinc-800/50 hover:bg-zinc-800/70
                                        border border-white/10 hover:border-white/20
                                        text-white/80 hover:text-white
                                        font-medium text-sm
                                        transition-all duration-200
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
                                        shadow-lg shadow-violet-500/30
                                        hover:shadow-xl hover:shadow-violet-500/40
                                        transition-all duration-200
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        disabled:hover:shadow-lg
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
