/**
 * 💀 NOTIFICATIONS SKELETON - Skeleton loading per Notifications Settings
 */

import { motion } from 'framer-motion';

export const NotificationsSkeleton = () => {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Email Notifications Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="h-5 w-40 bg-white/10 rounded" />
                </div>
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
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

            {/* Push Notifications Section */}
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
                            transition={{ delay: i * 0.05 + 0.1 }}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]"
                        >
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-white/10 rounded" />
                                <div className="h-3 w-48 bg-white/10 rounded" />
                            </div>
                            <div className="w-12 h-6 rounded-full bg-white/10" />
                        </motion.div>
                    ))}
                </div>
                {/* Time selector */}
                <div className="h-12 w-40 bg-white/10 rounded-xl" />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-12 w-48 bg-white/10 rounded-xl" />
            </div>
        </div>
    );
};
