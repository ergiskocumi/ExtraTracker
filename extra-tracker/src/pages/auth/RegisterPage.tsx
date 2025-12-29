/**
 * 📝 REGISTER PAGE
 * 
 * Form di registrazione sicuro con:
 * - Validazione Zod completa (email, password strength, match)
 * - Consenso GDPR esplicito
 * - Password strength indicator
 * - Feedback errori in tempo reale
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus, 
    FiAlertCircle, FiLoader, FiCheck, FiX 
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { registerSchema, type RegisterFormData } from '../../validators/authValidators';

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

    // Password strength bar color
    const getStrengthColor = () => {
        if (passwordStrength.score === 0) return 'bg-white/10';
        if (passwordStrength.score <= 2) return 'bg-red-500';
        if (passwordStrength.score === 3) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
        >
            {/* Icona e Titolo */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
                    <FiUserPlus className="text-white" size={28} />
                </div>
                <h1 className="text-2xl font-bold text-white">Crea Account</h1>
                <p className="text-white/60 mt-1">Inizia a tracciare il tuo lavoro</p>
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
                                            ? 'border-red-500/50' 
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
                                    onFocus={() => setShowPasswordHints(true)}
                                    placeholder="••••••••"
                                    className={`w-full pl-11 pr-12 py-3 rounded-xl bg-white/[0.05] border ${
                                        fieldErrors.password 
                                            ? 'border-red-500/50' 
                                            : 'border-white/[0.08] focus:border-primary-500/50'
                                    } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all`}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>

                            {/* Password Strength Bar */}
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(passwordStrength.score / 4) * 100}%` }}
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
                                    className="mt-3 p-3 rounded-lg bg-white/[0.03] space-y-1"
                                >
                                    {passwordStrength.requirements.map((req) => (
                                        <div
                                            key={req.id}
                                            className={`flex items-center gap-2 text-xs ${
                                                req.passed ? 'text-emerald-400' : 'text-white/50'
                                            }`}
                                        >
                                            {req.passed ? <FiCheck size={12} /> : <FiX size={12} />}
                                            <span>{req.label}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {fieldErrors.password && (
                                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block mb-2 text-sm font-medium text-white/70">
                                Conferma Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full pl-11 pr-12 py-3 rounded-xl bg-white/[0.05] border ${
                                        fieldErrors.confirmPassword 
                                            ? 'border-red-500/50' 
                                            : formData.confirmPassword && formData.password === formData.confirmPassword
                                                ? 'border-emerald-500/50'
                                                : 'border-white/[0.08] focus:border-primary-500/50'
                                    } text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all`}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                >
                                    {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.confirmPassword}</p>
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
                                    className="mt-0.5 w-5 h-5 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/50 focus:ring-offset-0"
                                />
                                <span className="text-sm text-white/70">
                                    Accetto i{' '}
                                    <a href="/terms" className="text-primary-400 hover:underline">
                                        Termini di Servizio
                                    </a>
                                    {' '}e la{' '}
                                    <a href="/privacy" className="text-primary-400 hover:underline">
                                        Privacy Policy
                                    </a>
                                </span>
                            </label>
                            {fieldErrors.acceptTerms && (
                                <p className="text-xs text-red-400">{fieldErrors.acceptTerms}</p>
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
                    <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
                        <p className="text-sm text-white/60">
                            Hai già un account?{' '}
                            <Link
                                to="/login"
                                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                            >
                                Accedi
                            </Link>
                        </p>
                    </div>
                </div>

                {/* GDPR Notice */}
                <p className="mt-6 text-center text-xs text-white/40 max-w-sm mx-auto">
                    Raccogliamo solo i dati essenziali (email e password hashata). 
                    Nessun tracciamento IP o fingerprinting.
                </p>
        </motion.div>
    );
};
