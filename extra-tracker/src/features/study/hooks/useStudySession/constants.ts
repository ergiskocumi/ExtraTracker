import type { StudyMode, SessionFocus, SessionLength, SessionDirection, Card } from '../../services/studyService';

export const STUDY_MODES: StudyMode[] = ['flashcard', 'quiz', 'typing', 'mix', 'sprint', 'focus', 'exam'];
export const FOCUS_OPTIONS: SessionFocus[] = ['smart', 'due', 'weak', 'all'];
export const LENGTH_OPTIONS: SessionLength[] = ['short', 'standard', 'deep'];
export const DIRECTION_OPTIONS: SessionDirection[] = ['front', 'back', 'mixed'];

export const LENGTH_TO_LIMIT: Record<SessionLength, number> = {
    short: 10,
    standard: 20,
    deep: 35,
};

export const MODE_LABELS: Record<StudyMode, string> = {
    flashcard: 'Flashcards',
    quiz: 'Quiz',
    typing: 'Typing',
    mix: 'Mix',
    sprint: 'Sprint',
    focus: 'Focus',
    exam: 'Esame',
};

export const hashString = (value: string): number => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

export const buildFallbackCardModes = (cards: Card[], mode: StudyMode): Record<string, StudyMode> | undefined => {
    if (mode !== 'mix' && mode !== 'exam') return undefined;
    const cycle: StudyMode[] = ['quiz', 'typing', 'flashcard'];
    return cards.reduce<Record<string, StudyMode>>((acc, card, index) => {
        acc[card.id] = cycle[index % cycle.length];
        return acc;
    }, {});
};

// Global session tracking
export const globalCompletedSessions = new Set<string>();
