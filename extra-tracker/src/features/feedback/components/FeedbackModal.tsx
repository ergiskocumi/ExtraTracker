/**
 * 📝 FEEDBACK MODAL - Modal per invio feedback/bug report
 *
 * Form con:
 * - Titolo
 * - Tipo (dropdown)
 * - Descrizione
 * - File upload (drag & drop)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Send,
    Upload,
    Trash2,
    FileText,
    Image,
    Bug,
    Lightbulb,
    HelpCircle,
    Sparkles,
    MoreHorizontal,
    Loader2,
} from 'lucide-react';
import { feedbackService } from '../services/feedbackService';
import { emitToast } from '../../../shared/components/toast';
import type { FeedbackType, FeedbackPriority } from '../types';
import { FEEDBACK_TYPE_LABELS, FEEDBACK_PRIORITY_LABELS } from '../types';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: typeof Bug }[] = [
    { value: 'bug', label: FEEDBACK_TYPE_LABELS.bug, icon: Bug },
    { value: 'feature', label: FEEDBACK_TYPE_LABELS.feature, icon: Lightbulb },
    { value: 'improvement', label: FEEDBACK_TYPE_LABELS.improvement, icon: Sparkles },
    { value: 'question', label: FEEDBACK_TYPE_LABELS.question, icon: HelpCircle },
    { value: 'other', label: FEEDBACK_TYPE_LABELS.other, icon: MoreHorizontal },
];

const PRIORITY_OPTIONS: { value: FeedbackPriority; label: string }[] = [
    { value: 'low', label: FEEDBACK_PRIORITY_LABELS.low },
    { value: 'medium', label: FEEDBACK_PRIORITY_LABELS.medium },
    { value: 'high', label: FEEDBACK_PRIORITY_LABELS.high },
    { value: 'critical', label: FEEDBACK_PRIORITY_LABELS.critical },
];

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<FeedbackType>('bug');
    const [priority, setPriority] = useState<FeedbackPriority>('medium');
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setType('bug');
            setPriority('medium');
            setFiles([]);
            setErrors({});
        }
    }, [isOpen]);

    // Keyboard support (Escape to close)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    const validateFiles = (newFiles: File[]): File[] => {
        const validFiles: File[] = [];
        const totalFiles = files.length + newFiles.length;

        if (totalFiles > MAX_FILES) {
            emitToast.warning(`Puoi allegare massimo ${MAX_FILES} file`);
        }

        for (const file of newFiles) {
            if (validFiles.length + files.length >= MAX_FILES) break;

            if (!ALLOWED_TYPES.includes(file.type)) {
                emitToast.warning(`${file.name}: tipo non supportato`);
                continue;
            }

            if (file.size > MAX_FILE_SIZE) {
                emitToast.warning(`${file.name}: troppo grande (max 5MB)`);
                continue;
            }

            validFiles.push(file);
        }

        return validFiles;
    };

    const handleFileSelect = useCallback(
        (selectedFiles: FileList | null) => {
            if (!selectedFiles) return;
            const validFiles = validateFiles(Array.from(selectedFiles));
            setFiles((prev) => [...prev, ...validFiles]);
        },
        [files.length]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileSelect(e.dataTransfer.files);
        },
        [handleFileSelect]
    );

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = 'Il titolo è obbligatorio';
        } else if (title.length > 200) {
            newErrors.title = 'Titolo troppo lungo (max 200 caratteri)';
        }

        if (!description.trim()) {
            newErrors.description = 'La descrizione è obbligatoria';
        } else if (description.length > 5000) {
            newErrors.description = 'Descrizione troppo lunga (max 5000 caratteri)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);

        try {
            await feedbackService.create(
                {
                    title: title.trim(),
                    description: description.trim(),
                    type,
                    priority,
                },
                files
            );

            emitToast.success('Feedback inviato con successo!', {
                title: 'Grazie per il tuo feedback',
            });

            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Errore invio feedback:', error);
            emitToast.error(
                error?.response?.data?.error?.message ||
                    'Errore durante l\'invio del feedback'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) {
            return <Image className="w-4 h-4 text-blue-400" />;
        }
        return <FileText className="w-4 h-4 text-orange-400" />;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/80 backdrop-blur-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="feedback-modal-title"
                        initial={{ scale: 0.95, y: 12, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 12, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] shadow-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15">
                                    <Bug className="w-5 h-5 text-primary-400" />
                                </div>
                                <div>
                                    <h2
                                        id="feedback-modal-title"
                                        className="text-lg font-semibold text-white"
                                    >
                                        Invia Feedback
                                    </h2>
                                    <p className="text-sm text-white/60">
                                        Segnala un problema o suggerisci un miglioramento
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Titolo */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Titolo <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Breve descrizione del problema"
                                    maxLength={200}
                                    className={`w-full input ${
                                        errors.title ? 'border-red-500/50' : ''
                                    }`}
                                />
                                {errors.title && (
                                    <p className="mt-1 text-sm text-red-400">{errors.title}</p>
                                )}
                                <p className="mt-1 text-xs text-white/40">
                                    {title.length}/200 caratteri
                                </p>
                            </div>

                            {/* Tipo e Priorità */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Tipo
                                    </label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as FeedbackType)}
                                        className="w-full select"
                                    >
                                        {TYPE_OPTIONS.map((opt) => (
                                            <option
                                                key={opt.value}
                                                value={opt.value}
                                                className="bg-dark-300"
                                            >
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Priorità
                                    </label>
                                    <select
                                        value={priority}
                                        onChange={(e) =>
                                            setPriority(e.target.value as FeedbackPriority)
                                        }
                                        className="w-full select"
                                    >
                                        {PRIORITY_OPTIONS.map((opt) => (
                                            <option
                                                key={opt.value}
                                                value={opt.value}
                                                className="bg-dark-300"
                                            >
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Descrizione */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Descrizione <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descrivi il problema in dettaglio. Includi passi per riprodurlo, comportamento atteso vs effettivo..."
                                    rows={5}
                                    maxLength={5000}
                                    className={`w-full input resize-none ${
                                        errors.description ? 'border-red-500/50' : ''
                                    }`}
                                />
                                {errors.description && (
                                    <p className="mt-1 text-sm text-red-400">
                                        {errors.description}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-white/40">
                                    {description.length}/5000 caratteri
                                </p>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Allegati (opzionale)
                                </label>
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                        isDragging
                                            ? 'border-primary-500 bg-primary-500/10'
                                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                                    }`}
                                >
                                    <Upload
                                        className={`w-8 h-8 mx-auto mb-2 ${
                                            isDragging ? 'text-primary-400' : 'text-white/40'
                                        }`}
                                    />
                                    <p className="text-sm text-white/60">
                                        Trascina qui i file o{' '}
                                        <span className="text-primary-400">clicca per selezionare</span>
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">
                                        PNG, JPEG, GIF, PDF - Max 5MB per file, max 3 file
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".png,.jpg,.jpeg,.gif,.pdf"
                                        onChange={(e) => handleFileSelect(e.target.files)}
                                        className="hidden"
                                    />
                                </div>

                                {/* File List */}
                                {files.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {files.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                                            >
                                                {getFileIcon(file)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white truncate">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-xs text-white/40">
                                                        {formatFileSize(file.size)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Invio in corso...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Invia Feedback
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
