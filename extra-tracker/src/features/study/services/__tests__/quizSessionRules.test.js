import quizSessionRulesModule from '../../../../../server/services/study/quizSessionRules.js';

const { shouldRequireMinimumQuizCards } = quizSessionRulesModule;

describe('quizSessionRules', () => {
    it('does not require minimum cards for PDF-based true/false quizzes', () => {
        expect(shouldRequireMinimumQuizCards({
            mode: 'quiz',
            quizType: 'true_false',
            hasExplicitSourceCards: false,
            isTrueFalseAiQuiz: true,
        })).toBe(false);
    });

    it('still requires minimum cards for fallback true/false quizzes', () => {
        expect(shouldRequireMinimumQuizCards({
            mode: 'quiz',
            quizType: 'true_false',
            hasExplicitSourceCards: false,
            isTrueFalseAiQuiz: false,
        })).toBe(true);
    });

    it('does not require the global minimum when source cards are explicitly scoped', () => {
        expect(shouldRequireMinimumQuizCards({
            mode: 'quiz',
            quizType: 'multiple_choice',
            hasExplicitSourceCards: true,
            isTrueFalseAiQuiz: false,
        })).toBe(false);
    });
});
