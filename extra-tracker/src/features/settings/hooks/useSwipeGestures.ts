/**
 * 👆 USE SWIPE GESTURES - Hook per gesti swipe su mobile
 * 
 * Gestisce swipe left/right per navigare tra categorie settings
 */

import { useEffect, useRef, useState } from 'react';

interface UseSwipeGesturesOptions {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    threshold?: number; // Distanza minima per considerare uno swipe (px)
    enabled?: boolean;
}

interface SwipeState {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isSwiping: boolean;
}

export const useSwipeGestures = ({
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    enabled = true,
}: UseSwipeGesturesOptions) => {
    const [swipeState, setSwipeState] = useState<SwipeState | null>(null);
    const elementRef = useRef<HTMLElement | null>(null);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const isSwipingRef = useRef(false);

    useEffect(() => {
        if (!enabled || (!onSwipeLeft && !onSwipeRight)) return;

        const element = elementRef.current;
        if (!element) return;

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            startXRef.current = touch.clientX;
            startYRef.current = touch.clientY;
            isSwipingRef.current = true;

            setSwipeState({
                startX: startXRef.current,
                startY: startYRef.current,
                currentX: startXRef.current,
                currentY: startYRef.current,
                isSwiping: true,
            });
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isSwipingRef.current) return;

            const touch = e.touches[0];
            const currentX = touch.clientX;
            const currentY = touch.clientY;

            setSwipeState((prev) =>
                prev
                    ? {
                          ...prev,
                          currentX,
                          currentY,
                      }
                    : null
            );
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!isSwipingRef.current) return;

            const touch = e.changedTouches[0];
            const endX = touch.clientX;
            const endY = touch.clientY;

            const deltaX = endX - startXRef.current;
            const deltaY = endY - startYRef.current;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            // Verifica che sia uno swipe orizzontale (non verticale)
            if (absDeltaX > absDeltaY && absDeltaX > threshold) {
                if (deltaX > 0 && onSwipeRight) {
                    // Swipe right
                    onSwipeRight();
                } else if (deltaX < 0 && onSwipeLeft) {
                    // Swipe left
                    onSwipeLeft();
                }
            }

            isSwipingRef.current = false;
            setSwipeState(null);
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: true });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [enabled, onSwipeLeft, onSwipeRight, threshold, swipeState]);

    return {
        elementRef,
        swipeState,
    };
};
