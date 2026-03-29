/**
 * ⚠️ CONFIRM MODAL - Modale di conferma per azioni critiche
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { ConfirmModalType } from '../hooks/useConfirmModal';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: ConfirmModalType;
    confirmLabel?: string;
    cancelLabel?: string;
    requireTextInput?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Componente modale di conferma con stili differenti in base al tipo
 */
export const ConfirmModal = ({
    isOpen,
    title,
    message,
    type,
    confirmLabel = 'Conferma',
    cancelLabel = 'Annulla',
    requireTextInput,
    onConfirm,
    onCancel,
}: ConfirmModalProps) => {
    const [inputValue, setInputValue] = useState('');

    // Reset input quando si chiude
    useEffect(() => {
        if (!isOpen) {
            setInputValue('');
        }
    }, [isOpen]);

    // Chiudi con tasto ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    const handleConfirm = () => {
        if (requireTextInput && inputValue !== requireTextInput) {
            return;
        }
        onConfirm();
    };

    const isConfirmDisabled = !!requireTextInput && inputValue !== requireTextInput;

    // Configurazione stili in base al tipo
    const config = {
        danger: {
            icon: AlertTriangle,
            iconBg: 'bg-red-500/20',
            iconColor: 'text-red-400',
            buttonBg: 'bg-red-500 hover:bg-red-400',
            ring: 'focus:ring-red-500/50',
        },
        warning: {
            icon: AlertCircle,
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-400',
            buttonBg: 'bg-amber-500 hover:bg-amber-400',
            ring: 'focus:ring-amber-500/50',
        },
        info: {
            icon: Info,
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            buttonBg: 'bg-blue-500 hover:bg-blue-400',
            ring: 'focus:ring-blue-500/50',
        },
        success: {
            icon: CheckCircle,
            iconBg: 'bg-emerald-500/20',
            iconColor: 'text-emerald-400',
            buttonBg: 'bg-emerald-500 hover:bg-emerald-400',
            ring: 'focus:ring-emerald-500/50',
        },
    };

    const { icon: Icon, iconBg, iconColor, buttonBg, ring } = config[type];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
                    >
                        <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-dark-500/95 backdrop-blur-xl p-6 shadow-2xl pointer-events-auto">
                            {/* Header */}
                            <div className="flex items-start gap-4 mb-6">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
                                    <Icon className={`w-6 h-6 ${iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold text-white mb-1">
                                        {title}
                                    </h3>
                                    <p className="text-white/70 text-sm leading-relaxed">
                                        {message}
                                    </p>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="flex-shrink-0 p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Text Input Verification */}
                            {requireTextInput && (
                                <div className="mb-6">
                                    <label className="block text-sm text-white/60 mb-2">
                                        Digita <span className="font-mono text-white font-medium">{requireTextInput}</span> per confermare
                                    </label>
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={requireTextInput}
                                        autoFocus
                                        className={`w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white placeholder-white/30 focus:outline-none focus:border-white/30 ${ring} transition-all`}
                                    />
                                    {inputValue && inputValue !== requireTextInput && (
                                        <p className="text-red-400 text-xs mt-2">
                                            Il testo non corrisponde. Digita esattamente: {requireTextInput}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3">
                                <motion.button
                                    onClick={onCancel}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors font-medium"
                                >
                                    {cancelLabel}
                                </motion.button>
                                <motion.button
                                    onClick={handleConfirm}
                                    disabled={isConfirmDisabled}
                                    whileHover={{ scale: isConfirmDisabled ? 1 : 1.02 }}
                                    whileTap={{ scale: isConfirmDisabled ? 1 : 0.98 }}
                                    className={`px-6 py-2.5 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${buttonBg}`}
                                >
                                    {confirmLabel}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
