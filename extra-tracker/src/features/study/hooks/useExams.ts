import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Exam, ExamOutcome } from '../types/exam';
import type { Deck } from '../services/studyService';
import examService from '../services/examService';
import { studyService } from '../services/studyService';
import { emitToast } from '../../../shared/components/toast';

interface UseExamsOptions {
    decks: Deck[];
    loadDecks: () => Promise<void>;
}

export const useExams = ({ decks, loadDecks }: UseExamsOptions) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadExams = useCallback(async () => {
        try {
            setIsLoading(true);
            const allExams = await examService.getAll();
            setExams(allExams);
        } catch (err) {
            console.error('Errore nel caricamento degli esami:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadExams();
    }, [loadExams]);

    const refreshExams = useCallback(async () => {
        await Promise.all([loadExams(), loadDecks()]);
    }, [loadExams, loadDecks]);

    const activeExams = useMemo(
        () => exams.filter(e => e.status === 'active'),
        [exams],
    );

    const completedExamIds = useMemo(
        () =>
            exams
                .filter(
                    e =>
                        e.status === 'passed' ||
                        e.status === 'failed' ||
                        e.status === 'archived' ||
                        e.status === 'completed',
                )
                .map(e => e.id),
        [exams],
    );

    const handleCompleteExam = useCallback(
        async (examId: string, outcome: ExamOutcome, status: 'passed' | 'failed') => {
            const outcomeForBackend = {
                ...outcome,
                date: outcome.date ? new Date(outcome.date).toISOString() : new Date().toISOString(),
            };

            await examService.update(examId, {
                status,
                outcome: outcomeForBackend,
            });

            await refreshExams();
        },
        [refreshExams],
    );

    const handleResetCards = useCallback(
        async (examId: string, type: 'all' | 'hard-only') => {
            const examDecks = decks.filter(d => d.examId === examId);

            if (examDecks.length === 0) {
                emitToast.warning('Nessun mazzo trovato per questo esame');
                return;
            }

            const result = await studyService.resetExamCards(examId, type);

            emitToast.success(
                type === 'all'
                    ? `Reset completato: ${result.cardsReset} carte resettate in ${result.decksAffected} mazzo/i`
                    : `Reset mirato completato: ${result.cardsReset} carte difficili resettate in ${result.decksAffected} mazzo/i`,
                { title: 'Reset completato', duration: 3000 },
            );

            await loadDecks();
        },
        [decks, loadDecks],
    );

    const handleReactivateExam = useCallback(
        async (examId: string) => {
            await examService.update(examId, { status: 'active', outcome: null });

            emitToast.success('Esame riattivato! Ora puoi continuare a studiare.', {
                title: 'Esame riattivato',
                duration: 3000,
            });

            await refreshExams();
        },
        [refreshExams],
    );

    const handleGenerateAIQuestions = useCallback(
        async (examId: string, topics: string[]) => {
            const examDecks = decks.filter(d => d.examId === examId);

            if (examDecks.length === 0) {
                emitToast.warning('Nessun mazzo trovato per questo esame');
                return;
            }

            const result = await studyService.generateRecoveryQuestions(examId, topics);

            if (result.totalGenerated === 0) {
                emitToast.warning(
                    'Nessuna domanda generata. Potrebbe essere necessario caricare un PDF nei mazzi per fornire contesto all\'AI.',
                );
                return;
            }

            emitToast.success(
                `Generazione completata: ${result.totalGenerated} nuove domande aggiunte in ${result.decksAffected} mazzo/i`,
                { title: 'Domande AI generate', duration: 4000 },
            );

            await loadDecks();
        },
        [decks, loadDecks],
    );

    const getExamStats = useCallback(
        (examId: string) => {
            const examDecks = decks.filter(d => d.examId === examId);
            const totalCards = examDecks.reduce(
                (sum, deck) => sum + (deck.totalCards ?? deck.cards?.length ?? 0),
                0,
            );
            const dueCards = examDecks.reduce((sum, deck) => sum + (deck.dueCount ?? 0), 0);

            let masteredCards = 0;
            examDecks.forEach(deck => {
                masteredCards += deck.cards?.filter(c => c.status === 'mastered').length ?? 0;
            });
            const masteryPercent = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

            return { deckCount: examDecks.length, totalCards, dueCards, masteryPercent };
        },
        [decks],
    );

    return {
        exams,
        setExams,
        activeExams,
        completedExamIds,
        isLoading,
        loadExams,
        refreshExams,
        handleCompleteExam,
        handleResetCards,
        handleReactivateExam,
        handleGenerateAIQuestions,
        getExamStats,
    };
};
