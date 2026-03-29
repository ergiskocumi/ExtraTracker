import { useState, useEffect, useRef } from 'react';
import type { StudySession } from '../../services/studyService';

interface UseStudyTimerParams {
    session: StudySession | null;
    timeLimitSeconds: number | null;
    isComplete: boolean;
}

interface UseStudyTimerReturn {
    elapsedSeconds: number;
    timeLeft: number | null;
    timerWarning: boolean;
    setElapsedSeconds: React.Dispatch<React.SetStateAction<number>>;
    setTimeLeft: React.Dispatch<React.SetStateAction<number | null>>;
}

export const useStudyTimer = ({
    session,
    timeLimitSeconds,
    isComplete,
}: UseStudyTimerParams): UseStudyTimerReturn => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(timeLimitSeconds);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const timerWarning = timeLeft !== null && timeLeft <= 60;

    useEffect(() => {
        if (!session || isComplete) return;

        timerRef.current = window.setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
            if (timeLimitSeconds) {
                setTimeLeft(prev => {
                    if (prev === null || prev <= 0) return prev;
                    return prev - 1;
                });
            }
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [session, timeLimitSeconds, isComplete]);

    return {
        elapsedSeconds,
        timeLeft,
        timerWarning,
        setElapsedSeconds,
        setTimeLeft,
    };
};
