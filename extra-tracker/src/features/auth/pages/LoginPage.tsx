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
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md"
        >
            {/* Icona e Titolo */}
            <motion.div 
                className="text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
            >
                <motion.div 
                    className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center shadow-glow mb-6 relative overflow-hidden"
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                >
                    {/* Glow effect interno */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                    <FiLogIn className="text-white relative z-10" size={32} />
                    {/* Pulse effect */}
                    <motion.div
                        className="absolute inset-0 rounded-2xl bg-primary-400/30"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </motion.div>
                <motion.h1 
                    className="text-3xl font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Bentornato!
                </motion.h1>
                <motion.p 
                    className="text-white/60 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Accedi al tuo account per continuare
                </motion.p>
            </motion.div>

                {/* Form Card */}
                <motion.div 
                    className="relative rounded-3xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-8 shadow-2xl overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    whileHover={{ borderColor: 'rgba(124, 58, 237, 0.3)' }}
                >
                    {/* Glow effect sul bordo */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    {/* Pattern decorativo sottile */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                        backgroundSize: '24px 24px',
                    }} />
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

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        {/* Email */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <label className="block mb-2.5 text-sm font-semibold text-white/80">
                                Email
                            </label>
                            <div className="relative group">
                                <motion.div
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary-400 transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                >
                                    <FiMail size={20} />
                                </motion.div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="nome@esempio.it"
                                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/[0.06] border backdrop-blur-sm ${
                                        fieldErrors.email 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                            : 'border-white/[0.1] focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/30'
                                    } text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.08] transition-all duration-200`}
                                    autoComplete="email"
                                />
                            </div>
                            {fieldErrors.email && (
                                <motion.p 
                                    className="mt-2 text-xs text-red-400 flex items-center gap-1"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <FiAlertCircle size={12} />
                                    {fieldErrors.email}
                                </motion.p>
                            )}
                        </motion.div>

                        {/* Password */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label className="block mb-2.5 text-sm font-semibold text-white/80">
                                Password
                            </label>
                            <div className="relative group">
                                <motion.div
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary-400 transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                >
                                    <FiLock size={20} />
                                </motion.div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/[0.06] border backdrop-blur-sm ${
                                        fieldErrors.password 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                            : 'border-white/[0.1] focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/30'
                                    } text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.08] transition-all duration-200`}
                                    autoComplete="current-password"
                                />
                                <motion.button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/5"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </motion.button>
                            </div>
                            {fieldErrors.password && (
                                <motion.p 
                                    className="mt-2 text-xs text-red-400 flex items-center gap-1"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <FiAlertCircle size={12} />
                                    {fieldErrors.password}
                                </motion.p>
                            )}
                        </motion.div>

                        {/* Forgot Password Link */}
                        <motion.div 
                            className="text-right"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Link
                                to="/forgot-password"
                                className="text-sm text-primary-400 hover:text-primary-300 transition-colors inline-flex items-center gap-1 group"
                            >
                                Password dimenticata?
                                <motion.span
                                    className="inline-block"
                                    whileHover={{ x: 2 }}
                                >
                                    →
                                </motion.span>
                            </Link>
                        </motion.div>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={isLoading ? {} : { scale: 1.02, y: -2 }}
                            whileTap={isLoading ? {} : { scale: 0.98 }}
                            className={`relative w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-base transition-all overflow-hidden group ${
                                isLoading
                                    ? 'bg-primary-500/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 hover:from-primary-600 hover:via-primary-700 hover:to-primary-800 shadow-glow hover:shadow-glow-lg'
                            } text-white`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            {/* Shimmer effect */}
                            {!isLoading && (
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full"
                                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                                />
                            )}
                            {isLoading ? (
                                <>
                                    <FiLoader className="animate-spin" size={20} />
                                    <span>Accesso in corso...</span>
                                </>
                            ) : (
                                <>
                                    <FiLogIn size={20} />
                                    <span>Accedi</span>
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Register Link */}
                    <motion.div 
                        className="mt-8 pt-6 border-t border-white/[0.08] text-center relative z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        <p className="text-sm text-white/60">
                            Non hai un account?{' '}
                            <Link
                                to="/register"
                                className="text-primary-400 hover:text-primary-300 font-semibold transition-colors inline-flex items-center gap-1 group"
                            >
                                Registrati
                                <motion.span
                                    className="inline-block"
                                    whileHover={{ x: 2 }}
                                >
                                    →
                                </motion.span>
                            </Link>
                        </p>
                    </motion.div>
                </motion.div>

                {/* Privacy Notice */}
                <motion.p 
                    className="mt-6 text-center text-xs text-white/40 leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    Accedendo, accetti la nostra{' '}
                    <a href="/privacy" className="underline hover:text-white/60 transition-colors">Privacy Policy</a>
                    {' '}e i{' '}
                    <a href="/terms" className="underline hover:text-white/60 transition-colors">Termini di Servizio</a>
                </motion.p>
        </motion.div>
    );
};
