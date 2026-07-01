import React from 'react';

export const DeckSkeleton: React.FC = () => (
    <div className="rounded-2xl sm:rounded-3xl border border-theme-subtle bg-theme-surface p-5 sm:p-6 animate-pulse">
        <div className="flex items-start gap-4 mb-4 mt-8">
            <div className="w-14 h-14 rounded-xl bg-theme-surface-hover" />
            <div className="flex-1 space-y-2">
                <div className="w-3/4 h-5 bg-theme-surface-hover rounded-lg" />
                <div className="w-1/3 h-4 bg-theme-surface-hover rounded-lg" />
            </div>
        </div>
        <div className="h-2 bg-theme-surface-hover rounded-full mb-5" />
        <div className="space-y-2.5">
            <div className="h-14 bg-theme-surface-hover rounded-xl" />
            <div className="h-14 bg-theme-surface-hover rounded-xl" />
        </div>
    </div>
);
