function shouldRequireMinimumQuizCards({ mode, quizType, hasExplicitSourceCards = false, isTrueFalseAiQuiz = false }) {
    if (mode !== 'quiz' || hasExplicitSourceCards) {
        return false;
    }

    if (quizType === 'true_false') {
        return !isTrueFalseAiQuiz;
    }

    return true;
}

module.exports = {
    shouldRequireMinimumQuizCards,
};
