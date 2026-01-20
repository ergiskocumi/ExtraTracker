/**
 * 🎴 DECK GRID SKELETON - Loading State for Deck Grid
 * ===================================================
 *
 * Skeleton component that shows a grid of loading deck cards
 * for better perceived loading performance.
 *
 * @module DeckGridSkeleton
 */

import React, { memo } from 'react';
import { DeckCardSkeleton } from './DeckCardSkeleton';

export interface DeckGridSkeletonProps {
    /** Number of skeleton cards to display */
    count?: number;
}

/**
 * DeckGridSkeleton Component
 *
 * Displays a grid of loading deck card skeletons.
 *
 * @param props - DeckGridSkeleton props
 * @returns Deck grid loading skeleton
 */
const DeckGridSkeletonComponent: React.FC<DeckGridSkeletonProps> = ({ count = 6 }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {Array.from({ length: count }).map((_, index) => (
                <DeckCardSkeleton key={`deck-skeleton-${index}`} />
            ))}
        </div>
    );
};

/**
 * Memoized DeckGridSkeleton
 */
export const DeckGridSkeleton = memo(DeckGridSkeletonComponent);

export default DeckGridSkeleton;
