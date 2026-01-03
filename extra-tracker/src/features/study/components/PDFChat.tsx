/**
 * 🤖 PDF CHAT (AI Tutor)
 * =====================
 *
 * Chat contestuale con il PDF del mazzo corrente.
 * L'AI risponde basandosi sul testo estratto dal PDF (RAG-lite).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiCpu, FiAlertCircle } from 'react-icons/fi';
import { emitToast } from '../../../shared/components/toast';
import { studyService, type ChatMessage } from '../services/studyService';

interface PDFChatProps {
    deckId: string;
    disabled?: boolean;
}

const LoadingBubble = () => (
    <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <FiCpu className="w-4 h-4 text-white/60" />
        </div>
        <div className="px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-sm text-white/70 animate-pulse">
            L&apos;AI sta scrivendo...
        </div>
    </div>
);

export const PDFChat: React.FC<PDFChatProps> = ({ deckId, disabled = false }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content:
                'Ciao! Sono il tuo AI Tutor. Chiedimi un chiarimento sul PDF (es. “Spiegami il polimorfismo”).',
        },
    ]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSending]);

    const canSend = useMemo(() => {
        if (disabled) return false;
        if (isSending) return false;
        if (!deckId) return false;
        return input.trim().length > 0;
    }, [deckId, disabled, input, isSending]);

    const handleSend = async () => {
        if (!canSend) return;

        const content = input.trim();
        setInput('');
        setError(null);

        const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
        setMessages(nextMessages);
        setIsSending(true);

        try {
            const history = messages
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .slice(-12);

            const reply = await studyService.askTutor(deckId, content, history);
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (err: any) {
            const msg = err?.message || 'Errore nella chat con l’AI';
            setError(msg);
            emitToast.error(msg, { title: 'AI Tutor' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
                {messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    return (
                        <motion.div
                            key={`${m.role}-${idx}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                                    isUser
                                        ? 'bg-blue-500/20 border-blue-500/25 text-white'
                                        : 'bg-white/[0.06] border-white/[0.08] text-white/85'
                                }`}
                            >
                                {m.content}
                            </div>
                        </motion.div>
                    );
                })}

                {isSending && <LoadingBubble />}

                {error && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                            <FiAlertCircle className="w-4 h-4 text-rose-300" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-200">
                            {error}
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/[0.08]">
                <div className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={
                            disabled
                                ? 'Chat non disponibile (manca il PDF o il testo estratto).'
                                : 'Scrivi una domanda... (Invio per inviare, Shift+Invio per andare a capo)'
                        }
                        rows={2}
                        disabled={disabled || isSending}
                        className="flex-1 px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-2xl text-white placeholder-white/30 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none disabled:opacity-50"
                    />
                    <motion.button
                        whileHover={{ scale: canSend ? 1.02 : 1 }}
                        whileTap={{ scale: canSend ? 0.98 : 1 }}
                        onClick={handleSend}
                        disabled={!canSend}
                        className="h-[46px] px-4 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium shadow-lg shadow-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <FiSend className="w-4 h-4" />
                        Invia
                    </motion.button>
                </div>
                <p className="text-xs text-white/40 mt-2">
                    L&apos;AI risponde solo usando il contenuto del PDF. Se l&apos;informazione non è nel testo, te lo dirà.
                </p>
            </div>
        </div>
    );
};

export default PDFChat;
