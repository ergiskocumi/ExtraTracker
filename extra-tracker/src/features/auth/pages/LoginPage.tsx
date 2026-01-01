/**
 * 🔐 LOGIN PAGE
 * 
 * Form di login sicuro con:
 * - Validazione Zod client-side
 * - Feedback errori inline
 * - Protezione contro submit multipli
 * - Password visibility toggle
 * - Redirect alla pagina precedente dopo login
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { loginSchema, type LoginFormData } from '../validators/authValidators';

export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading, error, clearError } = useAuth();

    // Pagina da cui l'utente proveniva (per redirect dopo login)
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        
        // Pulisci errore campo quando l'utente inizia a digitare
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
        if (error) clearError();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        // Validazione client-side
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as string;
                errors[field] = issue.message;
            });
            setFieldErrors(errors);
            return;
        }

        try {
            const response = await login(formData);
            if (response.success) {
                // Redirect alla pagina originale o dashboard
                navigate(from, { replace: true });
            }
        } catch (err) {
            // Errore gestito dal context
            console.error('Login error:', err);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
        >
            {/* Icona e Titolo */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
                    <FiLogIn className="text-white" size={28} />
                </div>
                <h1 className="text-2xl font-bold text-white">Bentornato!</h1>
                <p className="text-white/60 mt-1">Accedi al tuo account</p>
            </div>

                {/* Form Card */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                    {/* Error Banner */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                        >
                            <div className="flex items-center gap-2 text-red-400">
                                <FiAlertCircle size={18} />
                                <p className="text-sm">{error}</p>
                            </div>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-white/70">
                                Email
                            </label>
                            <div className="relative">
                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="nome@esempio.it"
                                    className={`w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.05] border ${
                                        fieldErrors.email 
                                            ? 'border-red-500/50 focus:border-red-500' 
                                            : 'border-white/[0.08] focus:border-primary-500/50'
                                    } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all`}
                                    autoComplete="email"
                                />
                            </div>
                            {fieldErrors.email && (
                                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-white/70">
                                Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full pl-11 pr-12 py-3 rounded-xl bg-white/[0.05] border ${
                                        fieldErrors.password 
                                            ? 'border-red-500/50 focus:border-red-500' 
                                            : 'border-white/[0.08] focus:border-primary-500/50'
                                    } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all`}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Forgot Password Link */}
                        <div className="text-right">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                            >
                                Password dimenticata?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={{ scale: isLoading ? 1 : 1.01 }}
                            whileTap={{ scale: isLoading ? 1 : 0.99 }}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                                isLoading
                                    ? 'bg-primary-500/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/20'
                            } text-white`}
                        >
                            {isLoading ? (
                                <>
                                    <FiLoader className="animate-spin" size={18} />
                                    Accesso in corso...
                                </>
                            ) : (
                                <>
                                    <FiLogIn size={18} />
                                    Accedi
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Register Link */}
                    <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
                        <p className="text-sm text-white/60">
                            Non hai un account?{' '}
                            <Link
                                to="/register"
                                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                            >
                                Registrati
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Privacy Notice */}
                <p className="mt-6 text-center text-xs text-white/40">
                    Accedendo, accetti la nostra{' '}
                    <a href="/privacy" className="underline hover:text-white/60">Privacy Policy</a>
                    {' '}e i{' '}
                    <a href="/terms" className="underline hover:text-white/60">Termini di Servizio</a>
                </p>
        </motion.div>
    );
};
