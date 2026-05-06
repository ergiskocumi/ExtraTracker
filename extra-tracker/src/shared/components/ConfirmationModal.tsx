import { useEffect, useId, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    icon?: ReactNode;
    destructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    description,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    isLoading = false,
    icon,
    destructive = true,
}) => {
    const titleId = useId();
    const descriptionId = useId();

    const handleCancel = useCallback(() => {
        if (!isLoading) {
            onCancel();
        }
    }, [isLoading, onCancel]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleCancel]);

    const handleConfirm = () => {
        if (!isLoading) {
            onConfirm();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={handleCancel}
                >
                    <div className="absolute inset-0 bg-theme-overlay backdrop-blur-lg" />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={description ? descriptionId : undefined}
                        initial={{ scale: 0.95, y: 12, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 12, opacity: 0 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                        onClick={(event) => event.stopPropagation()}
                        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-theme-default bg-theme-elevated shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/10 pointer-events-none" />

                        <div className="relative flex items-start justify-between gap-4 px-6 pt-6">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-xl border ${
                                    destructive
                                        ? 'border-red-500/30 bg-red-500/15 text-red-300'
                                        : 'border-theme-default bg-theme-surface text-theme-muted'
                                }`}>
                                    {icon || <AlertTriangle className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h2 id={titleId} className="text-lg font-semibold text-theme-primary">
                                        {title}
                                    </h2>
                                    {description && (
                                        <p id={descriptionId} className="mt-1 text-sm text-theme-secondary">
                                            {description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="rounded-full border border-theme-default bg-theme-surface p-1.5 text-theme-muted transition-colors hover:bg-theme-surface-hover hover:text-theme-primary"
                                aria-label="Close"
                                disabled={isLoading}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="relative flex items-center justify-end gap-3 px-6 pb-6 pt-5">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="rounded-xl border border-theme-default bg-theme-surface px-4 py-2 text-sm font-medium text-theme-secondary transition-colors duration-200 hover:bg-theme-surface-hover active:scale-[0.97]"
                                disabled={isLoading}
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 active:scale-[0.97] ${
                                    destructive
                                        ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20'
                                        : 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/20'
                                } ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {isLoading && (
                                    <motion.span
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                        className="h-4 w-4 rounded-full border-2 border-white/50 border-t-transparent"
                                    />
                                )}
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
