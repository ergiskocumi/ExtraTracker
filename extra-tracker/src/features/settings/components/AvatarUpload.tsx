/**
 * 🖼️ AVATAR UPLOAD - Componente upload foto profilo premium con zoom
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, Loader2, ZoomIn } from 'lucide-react';
import { useAvatarUpload } from '../hooks/useAvatarUpload';

interface AvatarUploadProps {
    currentAvatarUrl?: string | null;
    displayName?: string;
    onUpload?: (file: File) => Promise<string | null>;
    onDelete?: () => Promise<boolean>;
}

/**
 * Componente per l'upload dell'avatar con preview, zoom e gestione errori
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

    // Stato per la modal di zoom
    const [isZoomOpen, setIsZoomOpen] = useState(false);

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
        <>
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
                {/* Avatar Preview - Più Grande e Cliccabile */}
                <div className="relative group">
                    <motion.div
                        className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white/[0.12] shadow-2xl cursor-pointer"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => hasPreview && setIsZoomOpen(true)}
                    >
                        {hasPreview ? (
                            <img
                                src={previewUrl!}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${getGradient(displayName || 'user')} flex items-center justify-center`}>
                                <span className="text-4xl sm:text-5xl font-bold text-white">
                                    {initials}
                                </span>
                            </div>
                        )}

                        {/* Overlay on hover - Mostra camera o zoom */}
                        <AnimatePresence>
                            {!isUploading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileHover={{ opacity: 1 }}
                                    className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2"
                                >
                                    {hasPreview ? (
                                        <>
                                            <ZoomIn className="w-8 h-8 text-white" />
                                            <span className="text-xs text-white/80">Clicca per zoomare</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-8 h-8 text-white" />
                                            <span className="text-xs text-white/80">Clicca per caricare</span>
                                        </>
                                    )}
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
                                    <Loader2 className="w-10 h-10 text-white animate-spin mb-2" />
                                    <span className="text-sm text-white/80 font-medium">
                                        {uploadProgress.percentage}%
                                    </span>
                                    <div className="w-20 h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
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

                    {/* Remove button - Solo se c'è un'immagine */}
                    <AnimatePresence>
                        {hasPreview && !isUploading && (
                            <motion.button
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeAvatar();
                                }}
                                disabled={isDeleting}
                                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50 z-10"
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <X className="w-4 h-4" />
                                )}
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Pulsante cambia foto - In basso a destra */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            selectFile();
                        }}
                        disabled={isUploading}
                        className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg hover:bg-primary-400 transition-colors disabled:opacity-50 z-10 border-2 border-dark-500"
                    >
                        <Camera className="w-5 h-5" />
                    </motion.button>
                </div>

                {/* Info and Actions */}
                <div className="flex-1 text-center sm:text-left">
                    <h4 className="text-xl font-semibold text-white mb-2">
                        Foto profilo
                    </h4>
                    <p className="text-sm text-white/60 mb-4">
                        Clicca sulla foto per zoomare. Formati: JPG, PNG, WebP, GIF. Max 5MB.
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
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Caricamento...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    {hasPreview ? 'Cambia foto' : 'Carica foto'}
                                </>
                            )}
                        </motion.button>

                        {hasPreview && (
                            <motion.button
                                type="button"
                                onClick={() => setIsZoomOpen(true)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/70 hover:text-white text-sm font-medium transition-colors"
                            >
                                <ZoomIn className="w-4 h-4" />
                                Visualizza
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

            {/* Modal Zoom - Stile Instagram */}
            <AnimatePresence>
                {isZoomOpen && hasPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsZoomOpen(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                    >
                        {/* Close button */}
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => setIsZoomOpen(false)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </motion.button>

                        {/* Immagine zoomata */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-[90vw] max-h-[90vh]"
                        >
                            <img
                                src={previewUrl!}
                                alt="Avatar zoomato"
                                className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                            />
                            
                            {/* Info sotto l'immagine */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm"
                            >
                                <span className="text-sm text-white/80">{displayName || 'Foto profilo'}</span>
                            </motion.div>
                        </motion.div>

                        {/* Click per chiudere hint */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-white/50"
                        >
                            Clicca fuori per chiudere
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
