/**
 * 🖼️ AVATAR UPLOAD - Componente upload foto profilo premium
 */

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, Loader2 } from 'lucide-react';
import { useAvatarUpload } from '../hooks/useAvatarUpload';

interface AvatarUploadProps {
    currentAvatarUrl?: string | null;
    displayName?: string;
    onUpload?: (file: File) => Promise<string | null>;
    onDelete?: () => Promise<boolean>;
}

/**
 * Componente per l'upload dell'avatar con preview e gestione errori
 */
export const AvatarUpload = ({
    currentAvatarUrl,
    displayName,
    onUpload,
    onDelete,
}: AvatarUploadProps) => {
    const {
        previewUrl,
        isUploading,
        isDeleting,
        uploadProgress,
        error,
        selectFile,
        handleFileChange,
        removeAvatar,
        inputRef,
        hasPreview,
    } = useAvatarUpload({
        currentAvatarUrl,
        onUpload,
        onDelete,
    });

    // Genera iniziali per l'avatar placeholder
    const initials = displayName
        ? displayName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '??';

    const getGradient = (name: string) => {
        const gradients = [
            'from-violet-500 to-fuchsia-500',
            'from-blue-500 to-cyan-500',
            'from-emerald-500 to-teal-500',
            'from-amber-500 to-orange-500',
            'from-rose-500 to-pink-500',
            'from-indigo-500 to-purple-500',
        ];
        const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return gradients[index % gradients.length];
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
            {/* Avatar Preview */}
            <div className="relative group">
                <motion.div
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/[0.12] shadow-lg"
                    whileHover={{ scale: 1.02 }}
                >
                    {hasPreview ? (
                        <img
                            src={previewUrl!}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getGradient(displayName || 'user')} flex items-center justify-center`}>
                            <span className="text-3xl sm:text-4xl font-bold text-white">
                                {initials}
                            </span>
                        </div>
                    )}

                    {/* Overlay on hover */}
                    <AnimatePresence>
                        {!isUploading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
                                onClick={selectFile}
                            >
                                <Camera className="w-8 h-8 text-white" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Upload progress overlay */}
                    <AnimatePresence>
                        {isUploading && uploadProgress && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center"
                            >
                                <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                                <span className="text-xs text-white/80 font-medium">
                                    {uploadProgress.percentage}%
                                </span>
                                <div className="w-16 h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-white rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${uploadProgress.percentage}%` }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Remove button */}
                <AnimatePresence>
                    {hasPreview && !isUploading && (
                        <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={removeAvatar}
                            disabled={isDeleting}
                            className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <X className="w-4 h-4" />
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Status indicator */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-dark-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                </div>
            </div>

            {/* Info and Actions */}
            <div className="flex-1 text-center sm:text-left">
                <h4 className="text-lg font-semibold text-white mb-1">
                    Foto profilo
                </h4>
                <p className="text-sm text-white/60 mb-4">
                    Formati supportati: JPG, PNG, WebP, GIF. Max 5MB.
                </p>

                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-400 mb-3"
                    >
                        {error}
                    </motion.p>
                )}

                <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                    <motion.button
                        type="button"
                        onClick={selectFile}
                        disabled={isUploading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Carica foto
                            </>
                        )}
                    </motion.button>

                    {hasPreview && (
                        <motion.button
                            type="button"
                            onClick={removeAvatar}
                            disabled={isDeleting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/70 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <X className="w-4 h-4" />
                            Rimuovi
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
            />
        </div>
    );
};
