/**
 * 📝 REGISTER PAGE
 * 
 * Form di registrazione sicuro con:
 * - Validazione Zod completa (email, password strength, match)
 * - Consenso GDPR esplicito
 * - Password strength indicator
 * - Feedback errori in tempo reale
 */

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus, 
    FiAlertCircle, FiLoader, FiCheck, FiX 
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { registerSchema, type RegisterFormData } from '../validators/authValidators';
import { Logo } from '../../../shared/components/Brand/Logo';

// Password requirements per indicator visivo
const PASSWORD_REQUIREMENTS = [
    { id: 'length', label: 'Almeno 8 caratteri', test: (p: string) => p.length >= 8 },
    { id: 'lowercase', label: 'Una lettera minuscola', test: (p: string) => /[a-z]/.test(p) },
    { id: 'uppercase', label: 'Una lettera maiuscola', test: (p: string) => /[A-Z]/.test(p) },
    { id: 'number', label: 'Un numero', test: (p: string) => /\d/.test(p) },
];

export const RegisterPage = () => {
    const navigate = useNavigate();
    const { register, isLoading, error, clearError } = useAuth();

    const [formData, setFormData] = useState<RegisterFormData>({
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [showPasswordHints, setShowPasswordHints] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(
        () => (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    );

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = () => setPrefersReducedMotion(mq.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Calcola stato requisiti password
    const passwordStrength = useMemo(() => {
        const passed = PASSWORD_REQUIREMENTS.filter((req) => req.test(formData.password));
        return {
            requirements: PASSWORD_REQUIREMENTS.map((req) => ({
                ...req,
                passed: req.test(formData.password),
            })),
            score: passed.length,
            isValid: passed.length === PASSWORD_REQUIREMENTS.length,
        };
    }, [formData.password]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        // Pulisci errore campo
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
        const result = registerSchema.safeParse(formData);
        if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as string;
                if (!errors[field]) {
                    errors[field] = issue.message;
                }
            });
            setFieldErrors(errors);
            return;
        }

        try {
            const response = await register({
                email: formData.email,
                password: formData.password,
                acceptTerms: formData.acceptTerms,
            });
            
            if (response.success) {
                navigate('/');
            }
        } catch (err) {
            console.error('Register error:', err);
        }
    };

    // Password strength bar color (theme-aware for contrast)
    const getStrengthColor = () => {
        if (passwordStrength.score === 0) return 'bg-theme-surface';
        if (passwordStrength.score <= 2) return 'bg-red-500';
        if (passwordStrength.score === 3) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto"
        >
            {/* Logo e Titolo */}
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    <Logo size="2xl" variant="full" className="text-theme-primary" />
                </div>
                <h1 className="text-2xl font-bold text-theme-primary">Crea Account</h1>
                <p className="text-theme-secondary mt-1">Inizia a tracciare il tuo lavoro</p>
            </div>

                {/* Form Card */}
                <div className="rounded-2xl bg-theme-elevated backdrop-blur-xl border border-theme-default px-4 py-6 sm:p-6 shadow-theme-md">
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
                                <FiAlertCircle size={18} aria-hidden="true" />
                                <p className="text-sm">{error}</p>
                            </div>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-theme-secondary">
                                Email
                            </label>
                            <div className="relative">
                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted" size={18} aria-hidden="true" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="nome@esempio.it"
                                    className={`w-full pl-11 pr-4 py-3 rounded-xl bg-theme-base border ${
                                        fieldErrors.email 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                            : 'border-theme-default focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20 hover:border-theme-strong'
                                    } text-theme-primary placeholder:text-theme-muted focus:outline-none transition-all`}
                                    autoComplete="email"
                                    aria-invalid={fieldErrors.email ? 'true' : 'false'}
                                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                                />
                            </div>
                            {fieldErrors.email && (
                                <p id="email-error" className="mt-1.5 text-xs text-red-400" role="alert">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-theme-secondary">
                                Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted" size={18} aria-hidden="true" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={() => setShowPasswordHints(true)}
                                    placeholder="••••••••"
                                    className={`w-full pl-11 pr-14 py-3 rounded-xl bg-theme-base border ${
                                        fieldErrors.password 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                            : 'border-theme-default focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20 hover:border-theme-strong'
                                    } text-theme-primary placeholder:text-theme-muted focus:outline-none transition-all`}
                                    autoComplete="new-password"
                                    aria-invalid={fieldErrors.password ? 'true' : 'false'}
                                    aria-describedby={`${fieldErrors.password ? 'password-error ' : ''}password-requirements`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors rounded-lg hover:bg-theme-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5"
                                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>

                            {/* Password Strength Bar */}
                            {formData.password && (
                                <div className="mt-2">
                                    <div
                                        role="status"
                                        aria-live="polite"
                                        aria-atomic="true"
                                        className="sr-only"
                                    >
                                        Requisiti password: {passwordStrength.score} su 4 soddisfatti
                                        {passwordStrength.isValid ? '. Password valida.' : ''}
                                    </div>
                                    <div className="h-1.5 rounded-full bg-theme-surface overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                                            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                                            className={`h-full rounded-full ${getStrengthColor()}`}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Password Requirements */}
                            {showPasswordHints && formData.password && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-3 p-3 rounded-lg bg-theme-surface border border-theme-subtle space-y-1"
                                    id="password-requirements"
                                    role="status"
                                    aria-live="polite"
                                >
                                    {passwordStrength.requirements.map((req) => (
                                        <div
                                            key={req.id}
                                            className={`flex items-center gap-2 text-xs ${
                                                req.passed ? 'text-emerald-500' : 'text-theme-muted'
                                            }`}
                                        >
                                            {req.passed ? <FiCheck size={12} aria-label="Requirement met" /> : <FiX size={12} aria-label="Requirement not met" />}
                                            <span>{req.label}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {fieldErrors.password && (
                                <p id="password-error" className="mt-1.5 text-xs text-red-400" role="alert">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-theme-secondary">
                                Conferma Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted" size={18} aria-hidden="true" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full pl-11 pr-14 py-3 rounded-xl bg-theme-base border ${
                                        fieldErrors.confirmPassword 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                                            : formData.confirmPassword && formData.password === formData.confirmPassword
                                                ? 'border-emerald-500/50 focus:border-emerald-500/60'
                                                : 'border-theme-default focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20 hover:border-theme-strong'
                                    } text-theme-primary placeholder:text-theme-muted focus:outline-none transition-all`}
                                    autoComplete="new-password"
                                    aria-invalid={fieldErrors.confirmPassword ? 'true' : 'false'}
                                    aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors rounded-lg hover:bg-theme-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5"
                                    aria-label={showConfirmPassword ? 'Nascondi conferma password' : 'Mostra conferma password'}
                                    aria-pressed={showConfirmPassword}
                                >
                                    {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                                <p id="confirm-password-error" className="mt-1.5 text-xs text-red-400" role="alert">{fieldErrors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Terms Checkbox */}
                        <div className="space-y-2">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="acceptTerms"
                                    checked={formData.acceptTerms}
                                    onChange={handleChange}
                                    className="mt-0.5 w-5 h-5 rounded border-theme-default bg-theme-base text-primary-500 focus:ring-primary-500/50 focus:ring-offset-0 min-w-[20px] min-h-[20px]"
                                    aria-invalid={fieldErrors.acceptTerms ? 'true' : 'false'}
                                    aria-describedby={fieldErrors.acceptTerms ? 'terms-error' : 'terms-links-note'}
                                />
                                <span className="text-sm text-theme-secondary">
                                    Accetto i{' '}
                                    <a href="/terms" className="text-primary-600 hover:text-primary-500 hover:underline focus:outline-none focus:underline" target="_blank" rel="noopener noreferrer">
                                        Termini di Servizio
                                    </a>
                                    {' '}e la{' '}
                                    <a href="/privacy" className="text-primary-600 hover:text-primary-500 hover:underline focus:outline-none focus:underline" target="_blank" rel="noopener noreferrer">
                                        Privacy Policy
                                    </a>
                                    <span id="terms-links-note" className="sr-only"> (i link si aprono in una nuova scheda)</span>
                                </span>
                            </label>
                            {fieldErrors.acceptTerms && (
                                <p id="terms-error" className="text-xs text-red-400" role="alert">{fieldErrors.acceptTerms}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={{ scale: isLoading ? 1 : 1.01 }}
                            whileTap={{ scale: isLoading ? 1 : 0.99 }}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                                isLoading
                                    ? 'bg-emerald-500/50 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20'
                            } text-white`}
                        >
                            {isLoading ? (
                                <>
                                    <FiLoader className="animate-spin" size={18} />
                                    Registrazione in corso...
                                </>
                            ) : (
                                <>
                                    <FiUserPlus size={18} />
                                    Crea Account
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 pt-6 border-t border-theme-subtle text-center">
                        <p className="text-sm text-theme-secondary">
                            Hai già un account?{' '}
                            <Link
                                to="/login"
                                className="text-primary-600 hover:text-primary-500 font-medium transition-colors focus:outline-none focus:underline"
                            >
                                Accedi
                            </Link>
                        </p>
                    </div>
                </div>

                {/* GDPR Notice */}
                <p className="mt-6 text-center text-xs text-theme-muted max-w-sm mx-auto">
                    Raccogliamo solo i dati essenziali (email e password hashata). 
                    Nessun tracciamento IP o fingerprinting.
                </p>
        </motion.div>
    );
};
