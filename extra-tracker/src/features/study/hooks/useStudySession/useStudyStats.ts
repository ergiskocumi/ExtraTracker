import { useState, useCallback } from 'react';
import type { ReviewRating } from '../../services/studyService';

export interface StudyStats {
    total: number;
    hard: number;
    good: number;
    easy: number;
}

interface UseStudyStatsReturn {
    stats: StudyStats;
    setStats: React.Dispatch<React.SetStateAction<StudyStats>>;
    updateStats: (rating: ReviewRating) => void;
    resetStats: (total: number) => void;
}

export const useStudyStats = (initialTotal: number = 0): UseStudyStatsReturn => {
    const [stats, setStats] = useState<StudyStats>({
        total: initialTotal,
        hard: 0,
        good: 0,
        easy: 0,
    });

    const updateStats = useCallback((rating: ReviewRating) => {
        setStats(prev => ({
            ...prev,
            hard: prev.hard + (rating <= 2 ? 1 : 0),
            good: prev.good + (rating === 3 ? 1 : 0),
            easy: prev.easy + (rating >= 4 ? 1 : 0),
        }));
    }, []);

    const resetStats = useCallback((total: number) => {
        setStats({ total, hard: 0, good: 0, easy: 0 });
    }, []);

    return {
        stats,
        setStats,
        updateStats,
        resetStats,
    };
};
