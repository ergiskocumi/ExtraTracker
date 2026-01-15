import React from 'react';

export const DeckSkeleton: React.FC = () => (
    <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 animate-pulse">
        <div className="flex items-start gap-4 mb-4 mt-8">
            <div className="w-14 h-14 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-2">
                <div className="w-3/4 h-5 bg-white/10 rounded-lg" />
                <div className="w-1/3 h-4 bg-white/5 rounded-lg" />
            </div>
        </div>
        <div className="h-2 bg-white/5 rounded-full mb-5" />
        <div className="space-y-2.5">
            <div className="h-14 bg-white/5 rounded-xl" />
            <div className="h-14 bg-white/5 rounded-xl" />
        </div>
    </div>
);
