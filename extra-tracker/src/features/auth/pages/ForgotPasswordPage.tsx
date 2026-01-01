/**
 * 🔑 FORGOT PASSWORD PAGE
 * 
 * Pagina per richiedere il reset della password
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiMail, FiSend, FiLoader, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
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
        } catch (err: any) {
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
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center"
                    >
                        <FiCheckCircle className="text-emerald-400" size={32} />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-white mb-2">Controlla la tua Email</h1>
                    <p className="text-white/60 mb-6">
                        Se l'indirizzo <strong className="text-white">{email}</strong> è registrato, 
                        riceverai un link per reimpostare la password.
                    </p>
                    <div className="space-y-4">
                        <p className="text-sm text-white/40">
                            Non hai ricevuto l'email? Controlla la cartella spam o riprova tra qualche minuto.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
                        >
                            <FiArrowLeft size={16} />
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
                    <FiMail className="text-white" size={28} />
                </div>
                <h1 className="text-2xl font-bold text-white">Password Dimenticata?</h1>
                <p className="text-white/60 mt-1">Ti invieremo un link per reimpostarla</p>
            </div>

            {/* Form */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-white/70">
                            Email
                        </label>
                        <div className="relative">
                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nome@esempio.it"
                                required
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
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
                                <FiLoader className="animate-spin" size={18} />
                                Invio in corso...
                            </>
                        ) : (
                            <>
                                <FiSend size={18} />
                                Invia Link di Reset
                            </>
                        )}
                    </motion.button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
                    >
                        <FiArrowLeft size={16} />
                        Torna al Login
                    </Link>
                </div>
            </div>
        </motion.div>
    );
};
