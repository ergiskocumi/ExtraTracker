/**
 * 💀 PRIVACY SKELETON - Skeleton loading per Privacy Settings
 */

import { motion } from 'framer-motion';

export const PrivacySkeleton = () => {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Privacy Overview Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10" />
                    <div className="space-y-2">
                        <div className="h-5 w-48 bg-white/10 rounded" />
                        <div className="h-3 w-64 bg-white/10 rounded" />
                    </div>
                </div>
            </div>

            {/* Data Sharing Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="h-5 w-40 bg-white/10 rounded" />
                </div>
                <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]"
                        >
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-white/10 rounded" />
                                <div className="h-3 w-56 bg-white/10 rounded" />
                            </div>
                            <div className="w-12 h-6 rounded-full bg-white/10" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Visibility Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="h-5 w-32 bg-white/10 rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 + 0.1 }}
                            className="space-y-2"
                        >
                            <div className="h-4 w-24 bg-white/10 rounded" />
                            <div className="h-12 w-full bg-white/10 rounded-xl" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Data Retention Section */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="space-y-4">
                    <div className="h-5 w-40 bg-white/10 rounded" />
                    <div className="h-3 w-full bg-white/10 rounded" />
                    <div className="h-12 w-full bg-white/10 rounded-xl" />
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
