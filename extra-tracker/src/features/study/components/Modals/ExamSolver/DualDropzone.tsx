/**
 * 🎯 DUAL DROPZONE - Componente riutilizzabile per upload file
 * 
 * Gestisce due dropzone affiancati con validazione intelligente,
 * animazioni e feedback visivo migliorato.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileQuestion, BookOpen, Trash2 } from 'lucide-react';
import type { DropzoneConfig } from './ExamSolverModal.types';
import { validateFileSize } from './utils/fileValidation';

// Re-export for convenience
export type { DropzoneConfig };

interface DualDropzoneProps {
    questionsConfig: DropzoneConfig;
    sourceConfig: DropzoneConfig;
    error: string | null;
    onError: (error: string | null) => void;
}

// ============================================
// HOOK: useDropzone
// ============================================

const useDropzone = (config: DropzoneConfig, onError: (error: string | null) => void) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFile = useCallback((file: File): boolean => {
        const { acceptedTypes, acceptedExtensions } = config;
        
        // Check MIME type
        const isValidType = acceptedTypes.includes(file.type);
        
        // Check extension
        const isValidExtension = acceptedExtensions.some(ext => 
            file.name.toLowerCase().endsWith(ext.toLowerCase())
        );
        
        return isValidType || isValidExtension;
    }, [config]);

    const handleFile = useCallback((file: File) => {
        setIsValidating(true);
        setValidationResult(null);

        // Small delay for visual feedback
        setTimeout(() => {
            // VALIDATION 1: Check file size (50MB limit)
            const sizeValidation = validateFileSize(file, 50);
            if (!sizeValidation.isValid) {
                setValidationResult('invalid');
                onError(sizeValidation.error || 'File troppo grande (max 50MB)');

                // Reset validation state after animation
                setTimeout(() => {
                    setIsValidating(false);
                    setValidationResult(null);
                }, 2000);
                return;
            }

            // Show warning for large files (>20MB)
            if (file.size > 20 * 1024 * 1024) {
                console.warn(`⚠️ File grande (${(file.size / 1024 / 1024).toFixed(2)}MB), l'elaborazione potrebbe richiedere tempo`);
            }

            // VALIDATION 2: Check file type
            const isValid = validateFile(file);

            if (isValid) {
                setValidationResult('valid');
                config.onFileSelect(file);
                onError(null);

                // Reset validation state after animation
                setTimeout(() => {
                    setIsValidating(false);
                    setValidationResult(null);
                }, 1000);
            } else {
                setValidationResult('invalid');
                const errorMsg = config.id === 'questions'
                    ? 'File domande deve essere PDF, TXT o DOCX'
                    : 'File materiale deve essere un PDF';
                onError(errorMsg);

                // Reset validation state after animation
                setTimeout(() => {
                    setIsValidating(false);
                    setValidationResult(null);
                }, 2000);
            }
        }, 100);
    }, [config, validateFile, onError]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if file type matches this dropzone
        const file = e.dataTransfer.items?.[0];
        if (file) {
            const fileType = file.type;
            const isValidForThisZone = config.acceptedTypes.some(type => 
                fileType.includes(type.split('/')[1]) || fileType === type
            );
            
            if (isValidForThisZone || file.kind === 'file') {
                setIsDragging(true);
            }
        } else {
            setIsDragging(true);
        }
    }, [config]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Only reset if we're actually leaving the dropzone
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
        
        // Reset input value to allow re-selecting same file
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [handleFile]);

    const handleClick = useCallback(() => {
        if (!config.file && inputRef.current) {
            inputRef.current.click();
        }
    }, [config.file]);

    return {
        isDragging,
        isValidating,
        validationResult,
        inputRef,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        handleFileSelect,
        handleClick,
    };
};

// ============================================
// COMPONENT: SingleDropzone
// ============================================

interface SingleDropzoneProps {
    config: DropzoneConfig;
    dropzone: ReturnType<typeof useDropzone>;
    error: string | null;
}

const SingleDropzone: React.FC<SingleDropzoneProps> = ({ config, dropzone, error }) => {
    const {
        isDragging,
        isValidating,
        validationResult,
        inputRef,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        handleFileSelect,
        handleClick,
    } = dropzone;

    const Icon = config.icon;

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    // Determine dropzone state
    const getDropzoneState = () => {
        if (config.file) {
            return 'uploaded';
        }
        if (isValidating) {
            return validationResult === 'valid' ? 'validating-valid' : 'validating-invalid';
        }
        if (isDragging) {
            return 'dragging';
        }
        return 'idle';
    };

    const state = getDropzoneState();

    return (
        <motion.div
            onDragEnter={!config.file ? handleDragEnter : undefined}
            onDragLeave={!config.file ? handleDragLeave : undefined}
            onDragOver={!config.file ? handleDragOver : undefined}
            onDrop={!config.file ? handleDrop : undefined}
            onClick={handleClick}
            animate={{
                scale: state === 'validating-invalid' ? [1, 1.02, 1, 1.02, 1] : 1,
                borderColor: 
                    state === 'uploaded' ? 'rgba(34, 197, 94, 0.4)' :
                    state === 'dragging' ? 'rgba(59, 130, 246, 0.4)' :
                    state === 'validating-valid' ? 'rgba(34, 197, 94, 0.6)' :
                    state === 'validating-invalid' ? 'rgba(239, 68, 68, 0.6)' :
                    'rgba(255, 255, 255, 0.1)',
            }}
            transition={{
                scale: { duration: 0.3 },
                borderColor: { duration: 0.2 },
            }}
            className={`
                relative h-48 rounded-2xl border-2 border-dashed transition-all duration-300
                flex flex-col items-center justify-center gap-4 cursor-pointer
                ${state === 'uploaded'
                    ? 'bg-emerald-500/10'
                    : state === 'dragging'
                    ? 'bg-blue-500/10'
                    : state === 'validating-valid'
                    ? 'bg-emerald-500/20'
                    : state === 'validating-invalid'
                    ? 'bg-red-500/20'
                    : 'bg-zinc-900/40 hover:border-white/20 hover:bg-zinc-900/60'
                }
            `}
        >
            <input
                ref={inputRef}
                type="file"
                accept={config.acceptedExtensions.join(',') + ',' + config.acceptedTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
            />

            {config.file ? (
                <>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <Icon className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                    <div className="text-center px-4">
                        <p className="text-sm font-medium text-white truncate max-w-[200px]">
                            {config.file.name}
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                            {formatFileSize(config.file.size)}
                        </p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            config.onFileRemove();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Rimuovi
                    </button>
                </>
            ) : (
                <>
                    <AnimatePresence mode="wait">
                        {state === 'validating-valid' ? (
                            <motion.div
                                key="valid"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <Icon className="w-10 h-10 text-emerald-400" />
                            </motion.div>
                        ) : state === 'validating-invalid' ? (
                            <motion.div
                                key="invalid"
                                initial={{ scale: 0 }}
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.3 }}
                            >
                                <Icon className="w-10 h-10 text-red-400" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Icon className="w-10 h-10 text-white/40" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="text-center px-4">
                        <p className="text-sm font-medium text-white/80">
                            {config.label}
                        </p>
                        <p className="text-xs text-white/50 mt-1">
                            {config.id === 'questions' ? 'PDF, TXT, DOCX' : 'PDF'}
                        </p>
                    </div>
                </>
            )}
        </motion.div>
    );
};

// ============================================
// COMPONENT: DualDropzone
// ============================================

export const DualDropzone: React.FC<DualDropzoneProps> = ({
    questionsConfig,
    sourceConfig,
    error,
    onError,
}) => {
    const questionsDropzone = useDropzone(questionsConfig, onError);
    const sourceDropzone = useDropzone(sourceConfig, onError);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SingleDropzone
                    config={questionsConfig}
                    dropzone={questionsDropzone}
                    error={error}
                />
                <SingleDropzone
                    config={sourceConfig}
                    dropzone={sourceDropzone}
                    error={error}
                />
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm flex items-center gap-2"
                >
                    <span className="text-red-400">⚠️</span>
                    <p className="text-sm text-red-400">{error}</p>
                </motion.div>
            )}
        </div>
    );
};

export default DualDropzone;
