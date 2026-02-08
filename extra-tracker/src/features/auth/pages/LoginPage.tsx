/**
 * 🔐 LOGIN PAGE - Modern Design
 * Form di login con design tematico per Time Tracking
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn, FiAlertCircle, FiLoader, FiClock, FiTrendingUp, FiBriefcase } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { loginSchema, type LoginFormData } from '../validators/authValidators';
import { Logo } from '../../../shared/components/Brand/Logo';

// Feature highlight component
const FeatureBadge: React.FC<{ icon: React.ReactNode; text: string; delay: number }> = ({ 
  icon, text, delay 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="flex items-center gap-2 text-sm text-white/50"
  >
    <span className="p-1.5 rounded-lg bg-white/5 text-primary-400">
      {icon}
    </span>
    <span>{text}</span>
  </motion.div>
);

export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading, error, clearError } = useAuth();

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        
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
                navigate(from, { replace: true });
            }
        } catch (err) {
            console.error('Login error:', err);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Logo & Header */}
            <motion.div 
                className="text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="flex justify-center mb-6"
                >
                    <Logo size="2xl" variant="full" className="text-white" />
                </motion.div>

                <motion.h1 
                    className="text-3xl font-bold text-white mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Bentornato!
                </motion.h1>

                <motion.p 
                    className="text-white/50 text-base"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Traccia il tuo tempo, massimizza la produttività
                </motion.p>

                {/* Feature badges */}
                <motion.div 
                    className="flex flex-wrap justify-center gap-4 mt-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <FeatureBadge 
                        icon={<FiClock size={14} />} 
                        text="Time tracking" 
                        delay={0.5} 
                    />
                    <FeatureBadge 
                        icon={<FiTrendingUp size={14} />} 
                        text="Report analytics" 
                        delay={0.6} 
                    />
                    <FeatureBadge 
                        icon={<FiBriefcase size={14} />} 
                        text="Gestione progetti" 
                        delay={0.7} 
                    />
                </motion.div>
            </motion.div>

            {/* Main Card */}
            <motion.div 
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500/30 via-violet-500/30 to-primary-500/30 rounded-2xl blur opacity-30" />
                
                <div className="relative rounded-2xl bg-dark-400/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 overflow-hidden">
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-violet-500/5 pointer-events-none" />
                    
                    {/* Decorative corner accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-bl-full pointer-events-none" />

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

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        {/* Email Field */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <label className="block mb-2 text-sm font-medium text-white/80">
                                Email
                            </label>
                            <div className="relative group">
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                                    focusedField === 'email' ? 'text-primary-400' : 'text-white/40'
                                }`}>
                                    <FiMail size={18} />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="nome@esempio.it"
                                    className={`w-full pl-11 pr-4 py-3 rounded-xl bg-dark-300/50 border transition-all duration-200 outline-none
                                        ${fieldErrors.email 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                            : 'border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 hover:border-white/20'
                                        } text-white placeholder-white/30`}
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

                        {/* Password Field */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label className="block mb-2 text-sm font-medium text-white/80">
                                Password
                            </label>
                            <div className="relative group">
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary-400' : 'text-white/40'
                                }`}>
                                    <FiLock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="••••••••"
                                    className={`w-full pl-11 pr-11 py-3 rounded-xl bg-dark-300/50 border transition-all duration-200 outline-none
                                        ${fieldErrors.password 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                            : 'border-white/10 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 hover:border-white/20'
                                        } text-white placeholder-white/30`}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
                                >
                                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                </button>
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

                        {/* Forgot Password */}
                        <motion.div 
                            className="flex justify-end"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Link
                                to="/forgot-password"
                                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                            >
                                Password dimenticata?
                            </Link>
                        </motion.div>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            whileHover={isLoading ? {} : { scale: 1.01 }}
                            whileTap={isLoading ? {} : { scale: 0.99 }}
                            className={`relative w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-base transition-all overflow-hidden
                                ${isLoading
                                    ? 'bg-primary-500/50 cursor-not-allowed text-white/70'
                                    : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <FiLoader className="animate-spin" size={18} />
                                    <span>Accesso in corso...</span>
                                </>
                            ) : (
                                <>
                                    <FiLogIn size={18} />
                                    <span>Accedi</span>
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <motion.div 
                        className="relative my-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 text-xs text-white/40 bg-dark-400/80">oppure</span>
                        </div>
                    </motion.div>

                    {/* Register Link */}
                    <motion.div 
                        className="text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                    >
                        <p className="text-sm text-white/60">
                            Non hai un account?{' '}
                            <Link
                                to="/register"
                                className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                            >
                                Registrati ora
                            </Link>
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* Footer */}
            <motion.p 
                className="mt-6 text-center text-xs text-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
            >
                Accedendo, accetti i{' '}
                <a href="/terms" className="text-white/60 hover:text-white/80 transition-colors">Termini</a>
                {' '}e la{' '}
                <a href="/privacy" className="text-white/60 hover:text-white/80 transition-colors">Privacy</a>
            </motion.p>
        </div>
    );
};
