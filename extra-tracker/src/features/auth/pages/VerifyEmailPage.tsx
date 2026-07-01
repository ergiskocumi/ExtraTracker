/**
 * ✉️ VERIFY EMAIL PAGE
 * 
 * Pagina per verificare l'indirizzo email tramite token
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react';
import { apiClient } from '../../../shared/services/apiClient';

type VerificationStatus = 'loading' | 'success' | 'error' | 'no-token';

export const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<VerificationStatus>('loading');
    const [message, setMessage] = useState('');

    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('no-token');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await apiClient.post<null>('/auth/verify-email', { token });
                if (response.success) {
                    setStatus('success');
                    setMessage(response.message || 'Email verificata con successo!');
                } else {
                    setStatus('error');
                    setMessage('Token non valido o scaduto.');
                }
            } catch (err: unknown) {
                setStatus('error');
                setMessage((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Errore durante la verifica.');
            }
        };

        verifyEmail();
    }, [token]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto"
        >
            <div className="rounded-2xl bg-theme-card border border-theme-default p-8 text-center">
                {/* Loading State */}
                {status === 'loading' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                            <Loader className="text-primary-400 animate-spin" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-theme-primary mb-2">Verifica in corso...</h1>
                        <p className="text-theme-secondary">Stiamo verificando il tuo indirizzo email</p>
                    </>
                )}

                {/* Success State */}
                {status === 'success' && (
                    <>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center"
                        >
                            <CheckCircle className="text-emerald-400" size={32} />
                        </motion.div>
                        <h1 className="text-2xl font-bold text-theme-primary mb-2">Email Verificata!</h1>
                        <p className="text-theme-secondary mb-6">{message}</p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium hover:from-primary-600 hover:to-primary-700 transition-all"
                        >
                            Vai alla Dashboard
                        </Link>
                    </>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center"
                        >
                            <XCircle className="text-red-400" size={32} />
                        </motion.div>
                        <h1 className="text-2xl font-bold text-theme-primary mb-2">Verifica Fallita</h1>
                        <p className="text-theme-secondary mb-6">{message}</p>
                        <div className="flex flex-col gap-3">
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium"
                            >
                                Vai al Login
                            </Link>
                            <p className="text-sm text-theme-muted">
                                Hai bisogno di un nuovo link? Accedi e richiedi una nuova email di verifica.
                            </p>
                        </div>
                    </>
                )}

                {/* No Token State */}
                {status === 'no-token' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Mail className="text-amber-400" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-theme-primary mb-2">Token Mancante</h1>
                        <p className="text-theme-secondary mb-6">
                            Il link di verifica non è valido. Controlla di aver copiato l'intero link dall'email.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium"
                        >
                            Vai al Login
                        </Link>
                    </>
                )}
            </div>
        </motion.div>
    );
};
