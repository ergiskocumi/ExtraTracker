/**
 * 🎴 DECK CARD SKELETON - Loading State for Deck Cards
 * ====================================================
 *
 * Skeleton component that mimics the DeckCard structure
 * for better perceived loading performance.
 *
 * @module DeckCardSkeleton
 */

import React, { memo } from 'react';
import { Skeleton } from './Skeleton';

/**
 * DeckCardSkeleton Component
 *
 * Displays a loading skeleton that matches the DeckCard layout.
 *
 * @returns DeckCard loading skeleton
 */
const DeckCardSkeletonComponent: React.FC = () => {
    return (
        <div
            className="
                relative rounded-xl sm:rounded-2xl md:rounded-3xl border
                border-slate-700/50 bg-gradient-to-br from-slate-800/30 via-transparent to-transparent
                overflow-hidden flex flex-col
                min-h-[280px] sm:min-h-[320px] md:min-h-[340px]
                p-4 sm:p-5 md:p-6
            "
        >
            {/* Header */}
            <div className="mb-4">
                {/* Icon */}
                <Skeleton width="w-12" height="h-12" rounded="rounded-xl" className="mb-3" />

                {/* Title */}
                <Skeleton height="h-6" rounded="rounded-lg" className="mb-2" />

                {/* Description/Cards count */}
                <Skeleton height="h-4" width="w-2/3" rounded="rounded" />
            </div>

            {/* Progress bar */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <Skeleton height="h-3" width="w-16" rounded="rounded" />
                    <Skeleton height="h-3" width="w-12" rounded="rounded" />
                </div>
                <Skeleton height="h-2" rounded="rounded-full" />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
                <Skeleton height="h-10" width="w-full" rounded="rounded-lg" />
                <Skeleton height="h-10" width="w-10" rounded="rounded-lg" />
            </div>
        </div>
    );
};

/**
 * Memoized DeckCardSkeleton
 */
export const DeckCardSkeleton = memo(DeckCardSkeletonComponent);

export default DeckCardSkeleton;
