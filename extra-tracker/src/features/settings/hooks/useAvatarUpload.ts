/**
 * 🖼️ USE AVATAR UPLOAD - Gestione upload foto profilo
 * 
 * Hook completo per:
 * - Preview immagine prima dell'upload
 * - Validazione dimensione e formato
 * - Upload con progresso
 * - Rimozione avatar
 * - Gestione errori
 */

import { useState, useCallback, useRef } from 'react';
import { emitToast } from '../../../shared/components/toast';

// Configurazione di default per l'upload
const DEFAULT_CONFIG = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.9,
};

interface AvatarUploadConfig {
    maxFileSize?: number;
    allowedTypes?: string[];
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

interface UseAvatarUploadOptions {
    config?: AvatarUploadConfig;
    onUpload?: (file: File) => Promise<string | null>; // Ritorna URL avatar
    onDelete?: () => Promise<boolean>;
    currentAvatarUrl?: string | null;
}

interface UseAvatarUploadReturn {
    // Stato
    previewUrl: string | null;
    isUploading: boolean;
    isDeleting: boolean;
    uploadProgress: UploadProgress | null;
    error: string | null;
    
    // Azioni
    selectFile: () => void;
    handleFileChange: (file: File | null) => Promise<void>;
    removeAvatar: () => Promise<void>;
    cancelUpload: () => void;
    clearError: () => void;
    
    // Refs
    inputRef: React.RefObject<HTMLInputElement | null>;
    
    // Stati booleani
    hasPreview: boolean;
    hasCurrentAvatar: boolean;
}

/**
 * Comprime un'immagine prima dell'upload
 */
const compressImage = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            let { width, height } = img;

            // Calcola le nuove dimensioni mantenendo il ratio
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Impossibile creare canvas context'));
                return;
            }

            // Disegna l'immagine compressa
            ctx.drawImage(img, 0, 0, width, height);

            // Converti in blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Compressione fallita'));
                    }
                },
                file.type,
                quality
            );
        };

        img.onerror = () => reject(new Error('Errore nel caricamento immagine'));
        reader.onerror = () => reject(new Error('Errore nella lettura del file'));
        reader.readAsDataURL(file);
    });
};

/**
 * Hook per gestire l'upload dell'avatar
 * 
 * @example
 * const {
 *     previewUrl,
 *     isUploading,
 *     selectFile,
 *     handleFileChange,
 *     removeAvatar,
 * } = useAvatarUpload({
 *     currentAvatarUrl: user.avatar,
 *     onUpload: async (file, preview) => {
 *         const url = await api.uploadAvatar(file);
 *         return url;
 *     },
 *     onDelete: async () => {
 *         return await api.deleteAvatar();
 *     }
 * });
 */
export const useAvatarUpload = (
    options: UseAvatarUploadOptions = {}
): UseAvatarUploadReturn => {
    const {
        config = {},
        onUpload,
        onDelete,
        currentAvatarUrl = null,
    } = options;

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Stati
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    /**
     * Apre il file picker
     */
    const selectFile = useCallback(() => {
        inputRef.current?.click();
    }, []);

    /**
     * Cancella l'upload in corso
     */
    const cancelUpload = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsUploading(false);
        setUploadProgress(null);
    }, []);

    /**
     * Pulisce gli errori
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Valida il file selezionato
     */
    const validateFile = useCallback((file: File): string | null => {
        // Verifica dimensione
        if (file.size > mergedConfig.maxFileSize) {
            const maxSizeMB = (mergedConfig.maxFileSize / 1024 / 1024).toFixed(1);
            return `Il file è troppo grande. Dimensione massima: ${maxSizeMB}MB`;
        }

        // Verifica tipo
        if (!mergedConfig.allowedTypes.includes(file.type)) {
            const allowed = mergedConfig.allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ');
            return `Formato non supportato. Usa: ${allowed}`;
        }

        return null;
    }, [mergedConfig]);

    /**
     * Gestisce il cambio file
     */
    const handleFileChange = useCallback(async (file: File | null) => {
        if (!file) return;

        // Reset stato
        clearError();
        setUploadProgress(null);

        // Validazione
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            emitToast.error(validationError, { title: 'File non valido' });
            return;
        }

        try {
            // Crea preview
            const objectUrl = URL.createObjectURL(file);
            objectUrlRef.current = objectUrl;
            setPreviewUrl(objectUrl);

            // Comprimi immagine se necessario
            const processedFile = await compressImage(
                file,
                mergedConfig.maxWidth,
                mergedConfig.maxHeight,
                mergedConfig.quality
            );

            // Crea File dal Blob compresso
            const compressedFile = new File([processedFile], file.name, {
                type: file.type,
            });

            // Se c'è una callback di upload, eseguila
            if (onUpload) {
                setIsUploading(true);
                
                // Salva l'objectUrl per poterlo revocare se necessario
                
                // Simula progresso (se non hai accesso al progress reale)
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => {
                        if (!prev) return { loaded: 0, total: 100, percentage: 0 };
                        const newPercentage = Math.min(prev.percentage + 10, 90);
                        return {
                            ...prev,
                            loaded: newPercentage,
                            percentage: newPercentage,
                        };
                    });
                }, 200);

                const result = await onUpload(compressedFile);

                clearInterval(progressInterval);

                if (result) {
                    setUploadProgress({ loaded: 100, total: 100, percentage: 100 });
                    setPreviewUrl(result);
                    // Revoca l'object URL temporaneo
                    URL.revokeObjectURL(objectUrlRef.current || objectUrl);
                    emitToast.success('Avatar aggiornato con successo!', {
                        title: 'Foto profilo salvata',
                    });
                } else {
                    // Ripristina preview precedente in caso di errore
                    setPreviewUrl(currentAvatarUrl);
                    // Revoca l'object URL temporaneo
                    URL.revokeObjectURL(objectUrlRef.current || objectUrl);
                    throw new Error('Upload fallito');
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Errore durante l\'upload';
            setError(errorMessage);
            emitToast.error(errorMessage, { title: 'Errore upload' });
            setPreviewUrl(currentAvatarUrl);
            // Revoca l'object URL in caso di errore
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
            // Reset input
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    }, [onUpload, currentAvatarUrl, mergedConfig, clearError, validateFile]);

    /**
     * Rimuove l'avatar
     */
    const removeAvatar = useCallback(async () => {
        if (!onDelete) {
            setPreviewUrl(null);
            return;
        }

        setIsDeleting(true);

        try {
            const success = await onDelete();
            if (success) {
                setPreviewUrl(null);
                emitToast.success('Avatar rimosso', {
                    title: 'Foto profilo eliminata',
                });
            } else {
                throw new Error('Eliminazione fallita');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Errore durante l\'eliminazione';
            emitToast.error(errorMessage, { title: 'Errore' });
        } finally {
            setIsDeleting(false);
        }
    }, [onDelete]);

    return {
        // Stato
        previewUrl,
        isUploading,
        isDeleting,
        uploadProgress,
        error,
        
        // Azioni
        selectFile,
        handleFileChange,
        removeAvatar,
        cancelUpload,
        clearError,
        
        // Refs
        inputRef,
        
        // Stati booleani
        hasPreview: !!previewUrl,
        hasCurrentAvatar: !!currentAvatarUrl,
    };
};
