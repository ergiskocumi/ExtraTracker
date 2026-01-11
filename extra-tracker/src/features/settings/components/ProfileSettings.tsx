/**
 * 👤 PROFILE SETTINGS - Premium Profile Management
 * 
 * Design premium con validazione in tempo reale e feedback visivo
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Building, Briefcase, MapPin, Globe, FileText, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import type { UserProfile } from '../services/settingsService';
import type { FormStatus } from './types';
import { SettingsTooltip } from './SettingsTooltip';

interface ProfileSettingsProps {
    profile: UserProfile;
    accountEmail?: string;
    onSave: (data: Partial<UserProfile>) => Promise<boolean>;
    status: FormStatus;
}

export const ProfileSettings = ({ profile, accountEmail, onSave, status }: ProfileSettingsProps) => {
    const [formData, setFormData] = useState<UserProfile>(profile);
    const [hasChanges, setHasChanges] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setFormData(profile);
        setHasChanges(false);
        setFieldErrors({});
    }, [profile]);

    const validateField = (name: string, value: string): string | null => {
        switch (name) {
            case 'website':
                if (value && !/^https?:\/\/.+/.test(value)) {
                    return 'URL deve iniziare con http:// o https://';
                }
                break;
            case 'phone':
                if (value && !/^[\d\s\+\-\(\)]+$/.test(value)) {
                    return 'Formato telefono non valido';
                }
                break;
        }
        return null;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasChanges(true);

        // Validazione in tempo reale
        const error = validateField(name, value);
        if (error) {
            setFieldErrors(prev => ({ ...prev, [name]: error }));
        } else {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validazione finale
        const errors: Record<string, string> = {};
        Object.entries(formData).forEach(([key, value]) => {
            if (typeof value === 'string') {
                const error = validateField(key, value);
                if (error) errors[key] = error;
            }
        });

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        const success = await onSave(formData);
        if (success) {
            setHasChanges(false);
        }
    };

    const fields = [
        { name: 'firstName', label: 'Nome', icon: User, required: false },
        { name: 'lastName', label: 'Cognome', icon: User, required: false },
        { name: 'displayName', label: 'Nome visualizzato', icon: User, required: false },
        { name: 'phone', label: 'Telefono', icon: Phone, required: false },
        { name: 'company', label: 'Azienda', icon: Building, required: false },
        { name: 'jobTitle', label: 'Ruolo', icon: Briefcase, required: false },
        { name: 'location', label: 'Località', icon: MapPin, required: false },
        { name: 'website', label: 'Sito web', icon: Globe, required: false },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Account (Read-only) */}
            {accountEmail && (
                <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/20">
                        <Mail className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-white/60">Email account</p>
                        <p className="text-white font-semibold">{accountEmail}</p>
                    </div>
                </div>
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {fields.map((field) => {
                    const Icon = field.icon;
                    const value = formData[field.name as keyof UserProfile] as string || '';
                    const error = fieldErrors[field.name];
                    const hasValue = value.length > 0;

                    return (
                        <motion.div
                            key={field.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2.5 md:space-y-2"
                        >
                            <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
                                <Icon className="w-4 h-4 text-white/50" />
                                {field.label}
                                {field.required && <span className="text-red-400">*</span>}
                                {field.name === 'website' && (
                                    <SettingsTooltip
                                        title="Formato URL"
                                        content="Inserisci un URL completo che inizi con http:// o https://"
                                    />
                                )}
                                {field.name === 'phone' && (
                                    <SettingsTooltip
                                        title="Formato telefono"
                                        content="Puoi includere spazi, trattini, parentesi e il prefisso internazionale (+39)"
                                    />
                                )}
                            </label>
                            <div className="relative">
                                <input
                                    id={`setting-${field.name}`}
                                    name={field.name}
                                    value={value}
                                    onChange={handleChange}
                                    type={field.name === 'phone' ? 'tel' : field.name === 'website' ? 'url' : 'text'}
                                    className={`w-full input ${
                                        error 
                                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' 
                                            : hasValue && !error
                                            ? 'border-emerald-500/30 focus:border-emerald-500/50'
                                            : ''
                                    }`}
                                    placeholder={`Inserisci ${field.label.toLowerCase()}`}
                                    autoComplete={field.name === 'phone' ? 'tel' : field.name === 'website' ? 'url' : 'off'}
                                />
                                <AnimatePresence>
                                    {hasValue && !error && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2"
                                        >
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-xs text-red-400 flex items-center gap-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {error}
                                </motion.p>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Bio Textarea */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
                    <FileText className="w-4 h-4 text-white/50" />
                    Bio
                </label>
                <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleChange}
                    rows={4}
                    maxLength={500}
                    className="w-full input resize-none min-h-[120px] md:min-h-[100px]"
                    placeholder="Raccontaci qualcosa di te..."
                />
                <p className="text-xs text-white/40">
                    {(formData.bio || '').length} / 500 caratteri
                </p>
            </div>

            {/* Status Messages */}
            <AnimatePresence>
                {status.error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-sm text-red-300">{status.error}</p>
                    </motion.div>
                )}
                {status.success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3"
                    >
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <p className="text-sm text-emerald-300">Profilo aggiornato con successo!</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <div className="flex items-center gap-3">
                    <p className="text-sm text-white/50">
                        {hasChanges ? (
                            <span className="flex items-center gap-2">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-2 h-2 rounded-full bg-amber-400"
                                />
                                Modifiche non salvate
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Tutto aggiornato
                            </span>
                        )}
                    </p>
                    {hasChanges && (
                        <motion.button
                            type="button"
                            onClick={() => {
                                setFormData(profile);
                                setHasChanges(false);
                                setFieldErrors({});
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </motion.button>
                    )}
                </div>
                <motion.button
                    type="submit"
                    disabled={status.loading || !hasChanges || Object.keys(fieldErrors).length > 0}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`btn-primary px-6 py-3 ${
                        !hasChanges || Object.keys(fieldErrors).length > 0
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                    }`}
                >
                    {status.loading ? (
                        <span className="flex items-center gap-2">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            />
                            Salvataggio...
                        </span>
                    ) : (
                        'Salva modifiche'
                    )}
                </motion.button>
            </div>
        </form>
    );
};
