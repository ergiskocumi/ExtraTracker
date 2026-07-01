/**
 * 💀 SKELETON - Base Loading Skeleton Component
 * =============================================
 *
 * Reusable skeleton component for loading states.
 * Provides a smooth pulse animation for better perceived performance.
 *
 * @module Skeleton
 */

import React from 'react';

export interface SkeletonProps {
    /** Width of the skeleton (can be tailwind class or px value) */
    width?: string;
    /** Height of the skeleton (can be tailwind class or px value) */
    height?: string;
    /** Border radius class */
    rounded?: string;
    /** Additional CSS classes */
    className?: string;
    /** Animation variant */
    variant?: 'pulse' | 'wave';
}

/**
 * Base Skeleton Component
 *
 * @param props - Skeleton props
 * @returns Skeleton loading indicator
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    width = 'w-full',
    height = 'h-4',
    rounded = 'rounded',
    className = '',
    variant = 'pulse',
}) => {
    const animationClass = variant === 'pulse'
        ? 'animate-pulse'
        : 'animate-shimmer';

    const style = variant === 'wave' ? {
        backgroundSize: '200% 100%',
        backgroundImage: 'linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-surface-hover) 50%, var(--bg-surface) 75%)',
    } : undefined;

    return (
        <div
            className={`
                ${width}
                ${height}
                ${rounded}
                ${animationClass}
                bg-theme-surface
                ${className}
            `}
            style={style}
            role="status"
            aria-label="Loading..."
        />
    );
};

export default Skeleton;
