/**
 * 💀 PREFERENCES SKELETON - Skeleton loading per Preferences Settings
 */

import { motion } from 'framer-motion';

export const PreferencesSkeleton = () => {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Section 1: Language & Theme */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="h-5 w-48 bg-white/10 rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    {[...Array(2)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="space-y-2"
                        >
                            <div className="h-4 w-24 bg-white/10 rounded" />
                            <div className="h-12 w-full bg-white/10 rounded-xl" />
                        </motion.div>
                    ))}
                </div>
                {/* Theme Preview */}
                <div className="h-20 w-full bg-white/10 rounded-xl mt-3" />
            </div>

            {/* Section 2: Formatting */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="h-5 w-32 bg-white/10 rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    {[...Array(2)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 + 0.1 }}
                            className="space-y-2"
                        >
                            <div className="h-4 w-20 bg-white/10 rounded" />
                            <div className="h-12 w-full bg-white/10 rounded-xl" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-12 w-40 bg-white/10 rounded-xl" />
            </div>
        </div>
    );
};
