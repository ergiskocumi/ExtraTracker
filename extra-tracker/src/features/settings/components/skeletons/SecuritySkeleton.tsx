/**
 * 💀 SECURITY SKELETON - Skeleton loading per Security Settings
 */

import { motion } from 'framer-motion';

export const SecuritySkeleton = () => {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Change Password Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10" />
                    <div className="space-y-2">
                        <div className="h-5 w-40 bg-white/10 rounded" />
                        <div className="h-3 w-56 bg-white/10 rounded" />
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="space-y-2"
                        >
                            <div className="h-4 w-32 bg-white/10 rounded" />
                            <div className="h-12 w-full bg-white/10 rounded-xl" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* 2FA Section */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10" />
                        <div className="space-y-2">
                            <div className="h-5 w-48 bg-white/10 rounded" />
                            <div className="h-3 w-64 bg-white/10 rounded" />
                        </div>
                    </div>
                    <div className="w-12 h-6 rounded-full bg-white/10" />
                </div>
            </div>

            {/* Sessions Section */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="space-y-4">
                    <div className="h-5 w-40 bg-white/10 rounded" />
                    <div className="h-3 w-72 bg-white/10 rounded" />
                    <div className="space-y-3 pt-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.05]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-white/10" />
                                    <div className="space-y-1">
                                        <div className="h-4 w-32 bg-white/10 rounded" />
                                        <div className="h-3 w-48 bg-white/10 rounded" />
                                    </div>
                                </div>
                                <div className="h-8 w-24 bg-white/10 rounded-lg" />
                            </div>
                        ))}
                    </div>
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
