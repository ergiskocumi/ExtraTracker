/**
 * GLOBAL FEEDBACK MODAL - Modal globale per feedback
 *
 * Versione del modal che:
 * - Si connette al FeedbackContext
 * - Supporta minimizzazione per fare screenshot
 * - Supporta paste da clipboard (Ctrl+V)
 * - Può essere richiamato da qualsiasi parte dell'app
 * - Theme-aware (light/dark via CSS variables)
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
    Minimize2,
    Maximize2,
    Clipboard,
    Camera,
} from 'lucide-react';
import { useFeedback } from '../context/FeedbackContext';
import { feedbackService } from '../services/feedbackService';
import { emitToast } from '../../../shared/components/toast';
import type { FeedbackType, FeedbackPriority } from '../types';
import { FEEDBACK_TYPE_LABELS, FEEDBACK_PRIORITY_LABELS } from '../types';

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

export const GlobalFeedbackModal: React.FC = () => {
    const { isOpen, isMinimized, closeFeedback, toggleMinimize } = useFeedback();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<FeedbackType>('bug');
    const [priority, setPriority] = useState<FeedbackPriority>('medium');
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    // Full reset when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setDescription('');
            setType('bug');
            setPriority('medium');
            setFiles([]);
            setErrors({});
        }
    }, [isOpen]);

    // Handle paste from clipboard
    useEffect(() => {
        if (!isOpen || isMinimized) return;

        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            const imageItems: File[] = [];

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        const timestamp = Date.now();
                        const newFile = new File(
                            [file],
                            `screenshot-${timestamp}.png`,
                            { type: file.type }
                        );
                        imageItems.push(newFile);
                    }
                }
            }

            if (imageItems.length > 0) {
                e.preventDefault();
                const validFiles = validateFiles(imageItems);
                if (validFiles.length > 0) {
                    setFiles((prev) => [...prev, ...validFiles]);
                    emitToast.success(`${validFiles.length} screenshot aggiunto!`);
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isOpen, isMinimized, files.length]);

    // Keyboard: Escape to close (only if not submitting)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSubmitting) {
                if (isMinimized) {
                    closeFeedback();
                } else {
                    toggleMinimize();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isMinimized, isSubmitting, closeFeedback, toggleMinimize]);

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

            closeFeedback();
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { error?: { message?: string } } } };
            emitToast.error(
                apiError?.response?.data?.error?.message ||
                    "Errore durante l'invio del feedback"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) {
            return <Image className="w-4 h-4" style={{ color: 'var(--info)' }} />;
        }
        return <FileText className="w-4 h-4 text-orange-500" />;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const macKey = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Minimized State */}
                    {isMinimized ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            className="fixed bottom-6 right-6 z-50"
                        >
                            <div
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-default)',
                                    boxShadow: 'var(--shadow-lg)',
                                }}
                            >
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                                    style={{ background: 'rgba(124, 58, 237, 0.12)' }}
                                >
                                    <Bug className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <p
                                        className="text-sm font-medium"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        Feedback in corso
                                    </p>
                                    <p
                                        className="text-xs"
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        Fai lo screenshot, poi torna qui
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                    <button
                                        onClick={toggleMinimize}
                                        className="p-2 rounded-lg transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        title="Espandi"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={closeFeedback}
                                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors hover:text-red-500"
                                        style={{ color: 'var(--text-muted)' }}
                                        title="Chiudi"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* Full Modal State */
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Backdrop */}
                            <motion.div
                                className="absolute inset-0"
                                style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => toggleMinimize()}
                            />

                            {/* Modal */}
                            <motion.div
                                ref={formRef}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="feedback-modal-title"
                                initial={{ scale: 0.95, y: 12, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.95, y: 12, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-default)',
                                    boxShadow: 'var(--shadow-lg)',
                                }}
                            >
                                {/* Header */}
                                <div
                                    className="flex items-center justify-between px-6 py-4"
                                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                                            style={{ background: 'rgba(124, 58, 237, 0.12)' }}
                                        >
                                            <Bug className="w-5 h-5 text-primary-500" />
                                        </div>
                                        <div>
                                            <h2
                                                id="feedback-modal-title"
                                                className="text-lg font-semibold"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                Segnala un problema
                                            </h2>
                                            <p
                                                className="text-sm"
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                {macKey}+V per incollare screenshot
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={toggleMinimize}
                                            disabled={isSubmitting}
                                            className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                            style={{ color: 'var(--text-muted)' }}
                                            title="Minimizza per fare screenshot"
                                        >
                                            <Minimize2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={closeFeedback}
                                            disabled={isSubmitting}
                                            className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                            style={{ color: 'var(--text-muted)' }}
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tip Banner */}
                                <div
                                    className="mx-6 mt-4 p-3 rounded-xl"
                                    style={{
                                        background: 'rgba(245, 158, 11, 0.08)',
                                        border: '1px solid rgba(245, 158, 11, 0.2)',
                                    }}
                                >
                                    <div className="flex items-start gap-2">
                                        <Camera className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            <strong>Tip:</strong> Clicca su{' '}
                                            <Minimize2 className="w-3 h-3 inline" /> per minimizzare,
                                            fai lo screenshot, poi{' '}
                                            <span
                                                className="font-mono px-1 rounded text-[11px]"
                                                style={{
                                                    background: 'var(--bg-surface)',
                                                    border: '1px solid var(--border-subtle)',
                                                }}
                                            >
                                                {macKey}+V
                                            </span>{' '}
                                            per incollarlo qui.
                                        </p>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                    {/* Titolo */}
                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Titolo <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Breve descrizione del problema"
                                            maxLength={200}
                                            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                                            style={{
                                                background: 'var(--bg-input)',
                                                border: errors.title
                                                    ? '1px solid var(--error)'
                                                    : '1px solid var(--border-default)',
                                                color: 'var(--text-primary)',
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--border-focus)';
                                                e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = errors.title
                                                    ? 'var(--error)'
                                                    : 'var(--border-default)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        />
                                        {errors.title && (
                                            <p className="mt-1 text-sm" style={{ color: 'var(--error)' }}>
                                                {errors.title}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs" style={{ color: 'var(--text-disabled)' }}>
                                            {title.length}/200 caratteri
                                        </p>
                                    </div>

                                    {/* Tipo e Priorita */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label
                                                className="block text-sm font-medium mb-2"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Tipo
                                            </label>
                                            <select
                                                value={type}
                                                onChange={(e) => setType(e.target.value as FeedbackType)}
                                                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer"
                                                style={{
                                                    background: 'var(--bg-input)',
                                                    border: '1px solid var(--border-default)',
                                                    color: 'var(--text-primary)',
                                                }}
                                            >
                                                {TYPE_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                className="block text-sm font-medium mb-2"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Priorita
                                            </label>
                                            <select
                                                value={priority}
                                                onChange={(e) =>
                                                    setPriority(e.target.value as FeedbackPriority)
                                                }
                                                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer"
                                                style={{
                                                    background: 'var(--bg-input)',
                                                    border: '1px solid var(--border-default)',
                                                    color: 'var(--text-primary)',
                                                }}
                                            >
                                                {PRIORITY_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Descrizione */}
                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Descrizione <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Descrivi il problema in dettaglio. Includi passi per riprodurlo, comportamento atteso vs effettivo..."
                                            rows={4}
                                            maxLength={5000}
                                            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all resize-none"
                                            style={{
                                                background: 'var(--bg-input)',
                                                border: errors.description
                                                    ? '1px solid var(--error)'
                                                    : '1px solid var(--border-default)',
                                                color: 'var(--text-primary)',
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--border-focus)';
                                                e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = errors.description
                                                    ? 'var(--error)'
                                                    : 'var(--border-default)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        />
                                        {errors.description && (
                                            <p className="mt-1 text-sm" style={{ color: 'var(--error)' }}>
                                                {errors.description}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs" style={{ color: 'var(--text-disabled)' }}>
                                            {description.length}/5000 caratteri
                                        </p>
                                    </div>

                                    {/* File Upload */}
                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Screenshot / Allegati
                                        </label>
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all"
                                            style={{
                                                borderColor: isDragging
                                                    ? 'rgb(124, 58, 237)'
                                                    : 'var(--border-default)',
                                                background: isDragging
                                                    ? 'rgba(124, 58, 237, 0.06)'
                                                    : 'transparent',
                                            }}
                                        >
                                            <div className="flex items-center justify-center gap-4">
                                                <div className="flex flex-col items-center">
                                                    <Upload
                                                        className="w-6 h-6 mb-1"
                                                        style={{
                                                            color: isDragging
                                                                ? 'rgb(124, 58, 237)'
                                                                : 'var(--text-disabled)',
                                                        }}
                                                    />
                                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        Trascina o{' '}
                                                        <span className="text-primary-500">clicca</span>
                                                    </p>
                                                </div>
                                                <div
                                                    className="w-px h-8"
                                                    style={{ background: 'var(--border-subtle)' }}
                                                />
                                                <div className="flex flex-col items-center">
                                                    <Clipboard
                                                        className="w-6 h-6 mb-1"
                                                        style={{ color: 'var(--text-disabled)' }}
                                                    />
                                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        <span
                                                            className="font-mono px-1 rounded text-[10px]"
                                                            style={{
                                                                background: 'var(--bg-surface)',
                                                                border: '1px solid var(--border-subtle)',
                                                            }}
                                                        >
                                                            {macKey}+V
                                                        </span>{' '}
                                                        incolla
                                                    </p>
                                                </div>
                                            </div>
                                            <p
                                                className="text-[10px] mt-2"
                                                style={{ color: 'var(--text-disabled)' }}
                                            >
                                                PNG, JPEG, GIF, PDF - Max 5MB, max 3 file
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
                                                        className="flex items-center gap-3 p-2.5 rounded-lg"
                                                        style={{
                                                            background: 'var(--bg-surface)',
                                                            border: '1px solid var(--border-subtle)',
                                                        }}
                                                    >
                                                        {file.type.startsWith('image/') ? (
                                                            <img
                                                                src={URL.createObjectURL(file)}
                                                                alt={file.name}
                                                                className="w-10 h-10 rounded-lg object-cover"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                                style={{ background: 'var(--bg-surface-hover)' }}
                                                            >
                                                                {getFileIcon(file)}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p
                                                                className="text-sm truncate"
                                                                style={{ color: 'var(--text-primary)' }}
                                                            >
                                                                {file.name}
                                                            </p>
                                                            <p
                                                                className="text-xs"
                                                                style={{ color: 'var(--text-disabled)' }}
                                                            >
                                                                {formatFileSize(file.size)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(index)}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors hover:text-red-500"
                                                            style={{ color: 'var(--text-muted)' }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div
                                        className="flex justify-end gap-3 pt-4"
                                        style={{ borderTop: '1px solid var(--border-subtle)' }}
                                    >
                                        <button
                                            type="button"
                                            onClick={closeFeedback}
                                            disabled={isSubmitting}
                                            className="px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                                            style={{
                                                border: '1px solid var(--border-default)',
                                                color: 'var(--text-secondary)',
                                            }}
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
                                                    Invio...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Invia
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
};
