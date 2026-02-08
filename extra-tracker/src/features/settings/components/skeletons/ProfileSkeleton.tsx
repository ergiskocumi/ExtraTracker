/**
 * 💀 PROFILE SKELETON - Skeleton loading per Profile Settings
 */

import { motion } from 'framer-motion';

export const ProfileSkeleton = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Avatar Section */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <div className="w-20 h-20 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-white/10 rounded" />
                    <div className="h-3 w-48 bg-white/10 rounded" />
                </div>
            </div>

            {/* Email Section */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-4 w-40 bg-white/10 rounded" />
                </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="space-y-2"
                    >
                        <div className="h-4 w-20 bg-white/10 rounded" />
                        <div className="h-12 w-full bg-white/10 rounded-xl" />
                    </motion.div>
                ))}
            </div>

            {/* Bio Textarea */}
            <div className="space-y-2">
                <div className="h-4 w-16 bg-white/10 rounded" />
                <div className="h-32 w-full bg-white/10 rounded-xl" />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-12 w-36 bg-white/10 rounded-xl" />
            </div>
        </div>
    );
};
