/**
 * 📚 EXAM QUESTION ANSWERER
 * =========================
 *
 * Componente per rispondere a domande d'esame usando ESCLUSIVAMENTE il contesto fornito dal PDF.
 * Il tutor accademico risponde solo se trova l'informazione nel materiale caricato.
 */

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiCpu, FiAlertCircle, FiCheckCircle, FiBook } from 'react-icons/fi';
import { emitToast } from '../../../../shared/components/toast';
import { getErrorMessage } from '../../../../utils/errorMessage';
import { studyService, type ExamAnswer } from '../../services/studyService';

interface ExamQuestionAnswererProps {
    deckId: string;
    disabled?: boolean;
    initialQuestion?: string;
}

export const ExamQuestionAnswerer: React.FC<ExamQuestionAnswererProps> = ({
    deckId,
    disabled = false,
    initialQuestion = '',
}) => {
    const [question, setQuestion] = useState(initialQuestion);
    const [answer, setAnswer] = useState<ExamAnswer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSend = !disabled && !isLoading && question.trim().length > 0 && deckId;

    const handleAnswer = useCallback(async () => {
        if (!canSend) return;

        const questionText = question.trim();
        if (!questionText) return;

        setError(null);
        setAnswer(null);
        setIsLoading(true);

        try {
            const result = await studyService.answerExamQuestion(deckId, questionText);
            setAnswer(result);
        } catch (err: unknown) {
            const msg = getErrorMessage(err) || 'Errore nella risposta alla domanda';
            setError(msg);
            emitToast.error(msg, { title: 'Errore Tutor Accademico' });
        } finally {
            setIsLoading(false);
        }
    }, [deckId, question, canSend]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAnswer();
        }
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl border border-white/10 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                        <FiBook className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Tutor Accademico</h3>
                        <p className="text-sm text-white/60">
                            Risponde usando solo il materiale caricato
                        </p>
                    </div>
                </div>
            </div>

            {/* Question Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-white/80 mb-2">
                    Domanda da rispondere:
                </label>
                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        disabled
                            ? 'Carica un PDF per abilitare il tutor accademico'
                            : 'Incolla qui la domanda esatta da rispondere...'
                    }
                    rows={3}
                    disabled={disabled || isLoading}
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none disabled:opacity-50"
                />
                <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-white/40">
                        Invio per inviare, Shift+Invio per andare a capo
                    </p>
                    <motion.button
                        whileHover={{ scale: canSend ? 1.02 : 1 }}
                        whileTap={{ scale: canSend ? 0.98 : 1 }}
                        onClick={handleAnswer}
                        disabled={!canSend}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <FiCpu className="w-4 h-4 animate-spin" />
                                Analizzando...
                            </>
                        ) : (
                            <>
                                <FiSend className="w-4 h-4" />
                                Rispondi
                            </>
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Answer Display */}
            {answer && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 overflow-auto"
                >
                    <div
                        className={`rounded-xl border p-5 ${
                            answer.foundInContext
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-amber-500/10 border-amber-500/30'
                        }`}
                    >
                        <div className="flex items-start gap-3 mb-3">
                            {answer.foundInContext ? (
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                                    <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                                    <FiAlertCircle className="w-4 h-4 text-amber-400" />
                                </div>
                            )}
                            <div className="flex-1">
                                <h4
                                    className={`font-semibold mb-2 ${
                                        answer.foundInContext ? 'text-emerald-300' : 'text-amber-300'
                                    }`}
                                >
                                    {answer.foundInContext
                                        ? 'Risposta trovata nel materiale'
                                        : 'Risposta non trovata nel materiale'}
                                </h4>
                                <div className="text-white/90 whitespace-pre-wrap leading-relaxed">
                                    {answer.answer}
                                </div>
                            </div>
                        </div>

                        {answer.relatedTopics && answer.relatedTopics.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-sm font-medium text-white/70 mb-2">
                                    Argomenti correlati trovati:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {answer.relatedTopics.map((topic, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70"
                                        >
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Error Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3"
                >
                    <FiAlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-rose-300 mb-1">Errore</p>
                        <p className="text-sm text-rose-200/80">{error}</p>
                    </div>
                </motion.div>
            )}

            {/* Info Footer */}
            <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 leading-relaxed">
                    <strong className="text-white/60">Nota:</strong> Il tutor accademico risponde{' '}
                    <strong>esclusivamente</strong> usando il contenuto del PDF caricato. Se
                    l&apos;informazione non è presente nel materiale, te lo comunicherà
                    chiaramente.
                </p>
            </div>
        </div>
    );
};

export default ExamQuestionAnswerer;
