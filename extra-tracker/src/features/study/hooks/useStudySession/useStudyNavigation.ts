import { useState, useCallback, useRef, useEffect } from 'react';
import type { StudySession, StudyMode, Card } from '../../services/studyService';
import { hashString } from './constants';

interface UseStudyNavigationParams {
    session: StudySession | null;
    mode: StudyMode;
    direction: 'front' | 'back' | 'mixed';
    isComplete: boolean;
    onComplete: () => void;
}

interface UseStudyNavigationReturn {
    currentCardIndex: number;
    setCurrentCardIndex: React.Dispatch<React.SetStateAction<number>>;
    isFlipped: boolean;
    setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
    exitDirection: 'left' | 'right' | 'up' | null;
    setExitDirection: React.Dispatch<React.SetStateAction<'left' | 'right' | 'up' | null>>;
    currentCard: Card | null;
    cardMode: StudyMode;
    isFlashcardMode: boolean;
    shouldReverse: boolean;
    displayCard: Card | null;
    goNext: () => void;
    goBack: () => void;
    flip: (isFlashcardMode: boolean, isSubmitting: boolean, isCompleteRef: React.RefObject<boolean>) => void;
    resetNavigation: () => void;
}

export const useStudyNavigation = ({
    session,
    mode,
    direction,
    isComplete,
    onComplete,
}: UseStudyNavigationParams): UseStudyNavigationReturn => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);

    const currentCardIndexRef = useRef(currentCardIndex);
    useEffect(() => {
        currentCardIndexRef.current = currentCardIndex;
    }, [currentCardIndex]);

    const currentCard = session?.cards[currentCardIndex] ?? null;
    
    const cardMode: StudyMode = currentCard
        ? (session?.cardModes?.[currentCard.id] ?? (mode === 'mix' || mode === 'exam' ? 'flashcard' : mode))
        : mode;
    
    const isFlashcardMode = cardMode === 'flashcard';
    
    const shouldReverse = direction === 'back' || (direction === 'mixed' && currentCard 
        ? hashString(currentCard.id) % 2 === 1 
        : false);
    
    const displayCard = currentCard && shouldReverse && isFlashcardMode
        ? { ...currentCard, front: currentCard.back, back: currentCard.front }
        : currentCard;

    const goNext = useCallback(() => {
        if (isComplete || !session) return;

        const nextIndex = currentCardIndex + 1;
        if (nextIndex >= session.cards.length) {
            onComplete();
        } else {
            setCurrentCardIndex(nextIndex);
        }
    }, [currentCardIndex, session, isComplete, onComplete]);

    const goBack = useCallback(() => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
            setIsFlipped(false);
            setExitDirection(null);
        }
    }, [currentCardIndex]);

    const flip = useCallback((isFlashcardModeActive: boolean, isSubmitting: boolean, isCompleteRef: React.RefObject<boolean>) => {
        if (!isFlashcardModeActive || isFlipped || isSubmitting || isCompleteRef.current) return;
        setIsFlipped(true);
    }, [isFlipped]);

    const resetNavigation = useCallback(() => {
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setExitDirection(null);
    }, []);

    return {
        currentCardIndex,
        setCurrentCardIndex,
        isFlipped,
        setIsFlipped,
        exitDirection,
        setExitDirection,
        currentCard,
        cardMode,
        isFlashcardMode,
        shouldReverse,
        displayCard,
        goNext,
        goBack,
        flip,
        resetNavigation,
    };
};
