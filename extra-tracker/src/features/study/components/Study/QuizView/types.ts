/**
 * Types for QuizView component
 */

import type { Card, ReviewRating } from "../../../services/studyService";

export interface QuizReviewDetails {
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
}

export interface QuizViewProps {
  card: Card;
  question: string;
  options: string[];
  correctAnswer: string;
  distractorExplanations?: Record<string, string>;
  isSubmitting: boolean;
  onSubmitReview: (
    rating: ReviewRating,
    details?: QuizReviewDetails,
  ) => Promise<boolean | void>;
  onNext: () => void;
  isTrueFalse?: boolean; // Modalita Vero/Falso
  correctStatement?: string | null; // Per V/F AI: la versione corretta dello statement falso
  explanation?: string; // Spiegazione AI per la risposta (V/F e MCQ)
}

export type QuizResult = "correct" | "wrong" | "dontKnow" | null;
