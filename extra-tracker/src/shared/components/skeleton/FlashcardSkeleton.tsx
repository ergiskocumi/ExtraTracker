/**
 * 📇 FLASHCARD SKELETON - Loading State for Flashcards
 * ====================================================
 *
 * Skeleton component that mimics the Flashcard structure
 * for better perceived loading performance.
 *
 * @module FlashcardSkeleton
 */

import React, { memo } from 'react';
import { Skeleton } from './Skeleton';

/**
 * FlashcardSkeleton Component
 *
 * Displays a loading skeleton that matches the Flashcard layout.
 *
 * @returns Flashcard loading skeleton
 */
const FlashcardSkeletonComponent: React.FC = () => {
    return (
        <div
            className="
                rounded-xl border border-theme-default
                bg-theme-card
                p-4 sm:p-5 space-y-3
            "
        >
            {/* Question section */}
            <div className="flex items-start gap-3">
                <Skeleton width="w-8" height="h-8" rounded="rounded-lg" className="flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton height="h-4" rounded="rounded" />
                    <Skeleton height="h-4" width="w-4/5" rounded="rounded" />
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-theme-default" />

            {/* Answer section */}
            <div className="flex items-start gap-3">
                <Skeleton width="w-8" height="h-8" rounded="rounded-lg" className="flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton height="h-4" rounded="rounded" />
                    <Skeleton height="h-4" width="w-3/4" rounded="rounded" />
                </div>
            </div>
        </div>
    );
};

/**
 * Memoized FlashcardSkeleton
 */
export const FlashcardSkeleton = memo(FlashcardSkeletonComponent);

export default FlashcardSkeleton;
