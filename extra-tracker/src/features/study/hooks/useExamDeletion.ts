import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Deck } from '../services/studyService';
import type { Exam } from '../types/exam';

interface UseExamDeletionOptions {
    selectedExam: Exam | null;
    decks: Deck[];
    onDeleteExam: (examId: string) => Promise<void>;
    onDeleted?: () => void;
}

interface ExamDeletionSummary {
    examTitle: string;
    deckCount: number;
    cardCount: number;
}

export const useExamDeletion = ({
    selectedExam,
    decks,
    onDeleteExam,
    onDeleted,
}: UseExamDeletionOptions) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!selectedExam) {
            setIsDeleteModalOpen(false);
            setIsDeleting(false);
        }
    }, [selectedExam]);

    const summary = useMemo<ExamDeletionSummary>(() => {
        if (!selectedExam) {
            return {
                examTitle: 'questo esame',
                deckCount: 0,
                cardCount: 0,
            };
        }

        const examDecks = decks.filter(deck => deck.examId === selectedExam.id);
        const cardCount = examDecks.reduce(
            (total, deck) => total + (deck.totalCards ?? deck.cards?.length ?? 0),
            0,
        );

        return {
            examTitle: selectedExam.title,
            deckCount: examDecks.length,
            cardCount,
        };
    }, [selectedExam, decks]);

    const requestDelete = useCallback(() => {
        if (selectedExam) {
            setIsDeleteModalOpen(true);
        }
    }, [selectedExam]);

    const cancelDelete = useCallback(() => {
        if (!isDeleting) {
            setIsDeleteModalOpen(false);
        }
    }, [isDeleting]);

    const confirmDelete = useCallback(async (): Promise<boolean> => {
        if (!selectedExam) {
            return false;
        }

        setIsDeleting(true);
        try {
            await onDeleteExam(selectedExam.id);
            setIsDeleteModalOpen(false);
            onDeleted?.();
            return true;
        } catch {
            return false;
        } finally {
            setIsDeleting(false);
        }
    }, [selectedExam, onDeleteExam, onDeleted]);

    return {
        isDeleteModalOpen,
        isDeleting,
        summary,
        requestDelete,
        cancelDelete,
        confirmDelete,
    };
};

