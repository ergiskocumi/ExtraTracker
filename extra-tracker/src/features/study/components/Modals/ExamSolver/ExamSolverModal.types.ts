/**
 * 📋 EXAM SOLVER MODAL TYPES - Tutti i tipi e interfacce per ExamSolver
 */

import type React from 'react';

// ============================================
// STATS & RESULTS
// ============================================

export interface ExamSolverStats {
    questionsExtracted: number;
    answersFound: number;
    answersNotFound: number;
    totalFlashcards: number;
    processingTimeMs: number;
}

export interface FlashcardWithId {
    id: string;
    front: string;
    back: string;
    found: boolean;
    confidence: number; // 0-100
    sourceSnippet?: string; // Snippet del testo originale da cui proviene la risposta
    pageNumber?: number; // Numero di pagina nel PDF sorgente (1-based)
}

// ============================================
// STEPS & PROGRESS
// ============================================

export type Step = 'upload' | 'preview' | 'config' | 'progress' | 'review' | 'completed';
export type ProgressStep = 'idle' | 'extracting' | 'analyzing' | 'generating' | 'completed' | 'error';

// ============================================
// MODAL PROPS
// ============================================

export interface ExamSolverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (deckId: string, stats: ExamSolverStats) => void;
    existingDecks?: Array<{ id: string; title: string }>;
    examId?: string; // ID esame per nuovo deck (opzionale)
    preselectedDeckId?: string; // ID deck pre-selezionato (opzionale)
}

// ============================================
// DROPZONE TYPES
// ============================================

export interface DropzoneConfig {
    id: 'questions' | 'source';
    label: string;
    icon: React.ElementType;
    acceptedTypes: string[];
    acceptedExtensions: string[];
    file: File | null;
    onFileSelect: (file: File) => void;
    onFileRemove: () => void;
}

// ============================================
// QUESTIONS PREVIEW TYPES
// ============================================

export interface QuestionsPreviewProps {
    questions: string[];
    selectedIndices: Set<number>;
    onSelectionChange: (indices: Set<number>) => void;
    onBack: () => void;
    onNext: () => void;
    error: string | null;
    isLoading?: boolean;
}

// ============================================
// MANUAL ANSWER EDITOR TYPES
// ============================================

export interface ManualAnswerEditorProps {
    flashcards: FlashcardWithId[];
    deckId: string;
    onSave?: () => void;
}

// ============================================
// SKELETON TYPES
// ============================================

export interface QuestionsSkeletonProps {
    count?: number;
    isLoading: boolean;
    onStreamingComplete?: () => void;
}

export interface StreamingSkeletonProps {
    totalCount: number;
    currentCount: number;
    questions: string[];
    onComplete?: () => void;
}

// ============================================
// STEP INDICATOR TYPES
// ============================================

export interface StepIndicatorProps {
    currentStep: Step;
}

// ============================================
// DECK CONFIG FORM TYPES
// ============================================

export interface DeckConfigFormProps {
    deckMode: 'new' | 'existing';
    setDeckMode: (mode: 'new' | 'existing') => void;
    deckTitle: string;
    setDeckTitle: (title: string) => void;
    selectedDeckId: string;
    setSelectedDeckId: (id: string) => void;
    selectedExamId: string;
    setSelectedExamId: (id: string) => void;
    exams: Array<{ id: string; title: string }>;
    isLoadingExams: boolean;
    existingDecks: Array<{ id: string; title: string }>;
    error: string | null;
    onBack: () => void;
    onGenerate: () => void;
    canGenerate: boolean;
}

// ============================================
// PROGRESS VIEW TYPES
// ============================================

export interface ProgressViewProps {
    progressStep: ProgressStep;
    progressMessage: string;
    progressCurrent: number;
    progressTotal: number;
    currentQuestion: string;
    isProcessing: boolean;
    stats: ExamSolverStats | null;
    generatedFlashcards: FlashcardWithId[];
    createdDeckId: string;
    error: string | null;
    onRetry: () => void;
    onCancel: () => void;
    onClose: () => void;
    onSuccess: (deckId: string, stats: ExamSolverStats) => void;
}

// ============================================
// REVIEW ANSWERS TYPES
// ============================================

export interface ReviewAnswersProps {
    flashcards: FlashcardWithId[];
    deckId: string;
    sourceFileUrl?: string; // URL del PDF sorgente per "Visualizza nel PDF"
    onEdit: (cardId: string, newAnswer: string) => void;
    onRegenerate: (cardId: string, question: string) => Promise<void>;
    onSave: () => void;
    onBack: () => void;
}
