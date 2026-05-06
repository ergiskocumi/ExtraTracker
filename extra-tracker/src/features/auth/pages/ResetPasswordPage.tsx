/**
 * 🔐 RESET PASSWORD PAGE
 * 
 * Pagina per reimpostare la password con il token ricevuto via email
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader, Check, X } from 'lucide-react';
import { apiClient } from '../../../shared/services/apiClient';

// Requisiti password
const PASSWORD_REQUIREMENTS = [
    { id: 'length', label: 'Almeno 8 caratteri', test: (p: string) => p.length >= 8 },
    { id: 'lowercase', label: 'Una lettera minuscola', test: (p: string) => /[a-z]/.test(p) },
    { id: 'uppercase', label: 'Una lettera maiuscola', test: (p: string) => /[A-Z]/.test(p) },
    { id: 'number', label: 'Un numero', test: (p: string) => /\d/.test(p) },
];

export const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    // Verifica requisiti password
    const passwordChecks = PASSWORD_REQUIREMENTS.map(req => ({
        ...req,
        passed: req.test(password),
    }));
    const isPasswordValid = passwordChecks.every(c => c.passed);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isPasswordValid) {
            setError('La password non soddisfa tutti i requisiti');
            return;
        }

        if (!passwordsMatch) {
            setError('Le password non coincidono');
            return;
        }

        setIsLoading(true);

        try {
            const response = await apiClient.post<null>('/auth/reset-password', {
                token,
                newPassword: password,
            });

            if (response.success) {
                setIsSuccess(true);
            } else {
                setError('Errore durante il reset della password');
            }
        } catch (err: unknown) {
            setError((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Token non valido o scaduto');
        } finally {
            setIsLoading(false);
        }
    };

    // No token
    if (!token) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md mx-auto"
            >
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <XCircle className="text-red-400" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Link Non Valido</h1>
                    <p className="text-white/60 mb-6">
                        Il link di reset non è valido. Richiedi un nuovo reset password.
                    </p>
                    <Link
                        to="/forgot-password"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium"
                    >
                        Richiedi Nuovo Reset
                    </Link>
                </div>
            </motion.div>
        );
    }

    // Success
    if (isSuccess) {
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
                        <CheckCircle className="text-emerald-400" size={32} />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-white mb-2">Password Aggiornata!</h1>
                    <p className="text-white/60 mb-6">
                        La tua password è stata aggiornata con successo. Ora puoi effettuare il login.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium hover:from-primary-600 hover:to-primary-700 transition-all"
                    >
                        Vai al Login
                    </button>
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
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
                    <Lock className="text-white" size={28} />
                </div>
                <h1 className="text-2xl font-bold text-white">Nuova Password</h1>
                <p className="text-white/60 mt-1">Crea una nuova password sicura</p>
            </div>

            {/* Form */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Nuova Password */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-white/70">
                            Nuova Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Password Requirements */}
                        {password.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                            >
                                <div className="grid grid-cols-2 gap-2">
                                    {passwordChecks.map(check => (
                                        <div
                                            key={check.id}
                                            className={`flex items-center gap-2 text-xs ${
                                                check.passed ? 'text-emerald-400' : 'text-white/40'
                                            }`}
                                        >
                                            {check.passed ? <Check size={12} /> : <X size={12} />}
                                            {check.label}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Conferma Password */}
                    <div>
                        <label className="block mb-2 text-sm font-medium text-white/70">
                            Conferma Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full pl-11 pr-12 py-3 rounded-xl bg-white/[0.05] border ${
                                    confirmPassword.length > 0
                                        ? passwordsMatch
                                            ? 'border-emerald-500/50'
                                            : 'border-red-500/50'
                                        : 'border-white/[0.08]'
                                } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && !passwordsMatch && (
                            <p className="mt-1.5 text-xs text-red-400">Le password non coincidono</p>
                        )}
                    </div>

                    {/* Submit */}
                    <motion.button
                        type="submit"
                        disabled={isLoading || !isPasswordValid || !passwordsMatch}
                        whileHover={{ scale: isLoading ? 1 : 1.01 }}
                        whileTap={{ scale: isLoading ? 1 : 0.99 }}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                            isLoading || !isPasswordValid || !passwordsMatch
                                ? 'bg-primary-500/50 cursor-not-allowed'
                                : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/20'
                        } text-white`}
                    >
                        {isLoading ? (
                            <>
                                <Loader className="animate-spin" size={18} />
                                Aggiornamento...
                            </>
                        ) : (
                            <>
                                <Lock size={18} />
                                Imposta Nuova Password
                            </>
                        )}
                    </motion.button>
                </form>
            </div>
        </motion.div>
    );
};
