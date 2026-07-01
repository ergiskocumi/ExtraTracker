/**
 * 🔑 FORGOT PASSWORD PAGE
 * 
 * Pagina per richiedere il reset della password
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, Send, Loader, CheckCircle, ArrowLeft } from 'lucide-react';
import { apiClient } from '../../../shared/services/apiClient';

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await apiClient.post<null>('/auth/forgot-password', { email });
            setIsSubmitted(true);
        } catch (err: unknown) {
            // Non mostrare se l'email esiste o meno per sicurezza
            setIsSubmitted(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Mostra conferma dopo invio
    if (isSubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md mx-auto"
            >
                <div className="rounded-2xl bg-theme-card border border-theme-default p-8 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center"
                    >
                        <CheckCircle className="text-emerald-400" size={32} />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-theme-primary mb-2">Controlla la tua Email</h1>
                    <p className="text-theme-secondary mb-6">
                        Se l'indirizzo <strong className="text-theme-primary">{email}</strong> è registrato,
                        riceverai un link per reimpostare la password.
                    </p>
                    <div className="space-y-4">
                        <p className="text-sm text-theme-muted">
                            Non hai ricevuto l'email? Controlla la cartella spam o riprova tra qualche minuto.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Torna al Login
                        </Link>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto"
        >
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4">
                    <Mail className="text-white" size={28} />
                </div>
                <h1 className="text-2xl font-bold text-theme-primary">Password Dimenticata?</h1>
                <p className="text-theme-secondary mt-1">Ti invieremo un link per reimpostarla</p>
            </div>

            {/* Form */}
            <div className="rounded-2xl bg-theme-card border border-theme-default p-6">
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-theme-secondary">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nome@esempio.it"
                                required
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-theme-surface border border-theme-default text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={isLoading || !email}
                        whileHover={{ scale: isLoading ? 1 : 1.01 }}
                        whileTap={{ scale: isLoading ? 1 : 0.99 }}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                            isLoading || !email
                                ? 'bg-primary-500/50 cursor-not-allowed'
                                : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/20'
                        } text-white`}
                    >
                        {isLoading ? (
                            <>
                                <Loader className="animate-spin" size={18} />
                                Invio in corso...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Invia Link di Reset
                            </>
                        )}
                    </motion.button>
                </form>

                <div className="mt-6 pt-6 border-t border-theme-default text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Torna al Login
                    </Link>
                </div>
            </div>
        </motion.div>
    );
};
