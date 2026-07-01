/**
 * 🔐 LOGIN PAGE - Modern Design
 * Form di login con design tematico per Time Tracking
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Loader, Clock, TrendingUp, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginSchema, type LoginFormData } from '../validators/authValidators';
import { Logo } from '../../../shared/components/Brand/Logo';
import { Button } from '../../../shared/components/ui/button';

// Feature highlight component
const FeatureBadge: React.FC<{ icon: React.ReactNode; text: string; delay: number }> = ({ 
  icon, text, delay 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="login-feature-badge flex items-center gap-2 text-sm text-theme-muted"
  >
    <span className="login-feature-badge-icon p-1.5 rounded-lg bg-theme-surface border border-theme-subtle text-primary-500">
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
        <div className="login-page w-full max-w-md mx-auto">
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
                    <Logo size="2xl" variant="full" className="text-theme-primary" />
                </motion.div>

                <motion.h1
                    className="text-3xl font-bold text-theme-primary mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    Bentornato!
                </motion.h1>

                <motion.p 
                    className="text-theme-secondary text-base"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                >
                    Traccia il tuo tempo, massimizza la produttività
                </motion.p>

                {/* Feature badges */}
                <motion.div
                    className="flex flex-wrap justify-center gap-4 mt-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <FeatureBadge
                        icon={<Clock size={14} />}
                        text="Time tracking"
                        delay={0.25}
                    />
                    <FeatureBadge
                        icon={<TrendingUp size={14} />}
                        text="Report analytics"
                        delay={0.3}
                    />
                    <FeatureBadge
                        icon={<Briefcase size={14} />}
                        text="Gestione progetti"
                        delay={0.35}
                    />
                </motion.div>
            </motion.div>

            {/* Main Card */}
            <motion.div 
                className="relative login-shell"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                {/* Glow effect - gradient from theme vars (index.css) */}
                <div className="login-card-glow absolute -inset-0.5 rounded-2xl blur opacity-30" />
                
                <div className="login-card relative rounded-2xl bg-theme-elevated backdrop-blur-xl border border-theme-default px-4 py-6 sm:p-8 overflow-hidden shadow-theme-md">
                    {/* Subtle gradient overlay - from theme vars */}
                    <div className="login-card-overlay absolute inset-0 pointer-events-none" />
                    
                    {/* Decorative corner accent - from theme vars */}
                    <div className="login-card-corner absolute top-0 right-0 w-32 h-32 rounded-bl-full pointer-events-none" />

                    {/* Error Banner */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                            role="alert"
                            aria-live="assertive"
                        >
                            <div className="flex items-center gap-2 text-red-400">
                                <AlertCircle size={18} aria-hidden="true" />
                                <p className="text-sm">{error}</p>
                            </div>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        {/* Email Field */}
                        <motion.div
                            initial={false}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            <label className="block mb-2 text-sm font-medium text-theme-secondary">
                                Email
                            </label>
                            <div className="relative group">
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                                    focusedField === 'email' ? 'text-primary-500' : 'text-theme-muted'
                                }`}>
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    id="login-email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="nome@esempio.it"
                                    className={`login-input w-full pl-11 pr-4 py-3 rounded-xl bg-theme-base border transition-all duration-200 outline-none
                                        ${fieldErrors.email 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                            : 'border-theme-default focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20 hover:border-theme-strong'
                                        } text-theme-primary placeholder:text-theme-muted`}
                                    autoComplete="email"
                                    aria-invalid={!!fieldErrors.email}
                                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                                />
                            </div>
                            {fieldErrors.email && (
                                <motion.p
                                    id="email-error"
                                    className="mt-2 text-xs text-red-400 flex items-center gap-1"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    role="alert"
                                    aria-live="polite"
                                >
                                    <AlertCircle size={12} aria-hidden="true" />
                                    {fieldErrors.email}
                                </motion.p>
                            )}
                        </motion.div>

                        {/* Password Field */}
                        <motion.div
                            initial={false}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <label className="block mb-2 text-sm font-medium text-theme-secondary">
                                Password
                            </label>
                            <div className="relative group">
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary-500' : 'text-theme-muted'
                                }`}>
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    id="login-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="••••••••"
                                    className={`login-input w-full pl-11 pr-11 py-3 rounded-xl bg-theme-base border transition-all duration-200 outline-none
                                        ${fieldErrors.password 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                            : 'border-theme-default focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20 hover:border-theme-strong'
                                        } text-theme-primary placeholder:text-theme-muted`}
                                    autoComplete="current-password"
                                    aria-invalid={!!fieldErrors.password}
                                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="login-password-toggle absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-theme-muted hover:text-theme-primary transition-colors rounded-lg hover:bg-theme-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <motion.p
                                    id="password-error"
                                    className="mt-2 text-xs text-red-400 flex items-center gap-1"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    role="alert"
                                    aria-live="polite"
                                >
                                    <AlertCircle size={12} aria-hidden="true" />
                                    {fieldErrors.password}
                                </motion.p>
                            )}
                        </motion.div>

                        {/* Forgot Password */}
                        <motion.div
                            className="flex justify-end"
                            initial={false}
                            transition={{ delay: 0.25 }}
                        >
                            <Link
                                to="/forgot-password"
                                className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
                            >
                                Password dimenticata?
                            </Link>
                        </motion.div>

                        {/* Submit Button */}
                        <motion.div
                            initial={false}
                            transition={{ delay: 0.3 }}
                        >
                        <Button
                            type="submit"
                            disabled={isLoading}
                            size="md"
                            variant="primary"
                            fullWidth
                            className="keep-light-text text-base"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="animate-spin" size={18} />
                                    <span>Accesso in corso...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    <span>Accedi</span>
                                </>
                            )}
                        </Button>
                        </motion.div>
                    </form>

                    {/* Divider */}
                    <motion.div
                        className="login-divider relative my-6"
                        initial={false}
                        transition={{ delay: 0.35 }}
                    >
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-theme-default" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 text-xs text-theme-muted bg-theme-elevated">oppure</span>
                        </div>
                    </motion.div>

                    {/* Register Link */}
                    <motion.div
                        className="text-center"
                        initial={false}
                        transition={{ delay: 0.4 }}
                    >
                        <p className="text-sm text-theme-secondary">
                            Non hai un account?{' '}
                            <Link
                                to="/register"
                                className="text-primary-600 hover:text-primary-500 font-semibold transition-colors"
                            >
                                Registrati ora
                            </Link>
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* Footer */}
            <motion.p 
                className="mt-6 text-center text-xs text-theme-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                Accedendo, accetti i{' '}
                <a href="/terms" className="text-theme-secondary hover:text-theme-primary transition-colors">Termini</a>
                {' '}e la{' '}
                <a href="/privacy" className="text-theme-secondary hover:text-theme-primary transition-colors">Privacy</a>
            </motion.p>
        </div>
    );
};
