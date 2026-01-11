/**
 * 👤 PROFILE SETTINGS - Premium Profile Management
 * 
 * Design premium con validazione in tempo reale e feedback visivo
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Building, Briefcase, MapPin, Globe, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import type { UserProfile } from '../services/settingsService';
import type { FormStatus } from './types';
import { SettingsInput, SettingsTextarea } from './fields';
import { useFormValidation } from '../hooks/useFormValidation';
import { commonRules, validationSchemas } from '../utils/validation';
import { SettingsError, SettingsSuccess } from './feedback';

interface ProfileSettingsProps {
    profile: UserProfile;
    accountEmail?: string;
    onSave: (data: Partial<UserProfile>) => Promise<boolean>;
    status: FormStatus;
}

export const ProfileSettings = ({ profile, accountEmail, onSave, status }: ProfileSettingsProps) => {
    const [formData, setFormData] = useState<UserProfile>(profile);
    const [hasChanges, setHasChanges] = useState(false);

    // Sistema di validazione standardizzato
    const validation = useFormValidation<UserProfile>({
        validationRules: {
            website: validationSchemas.optionalUrl,
            phone: validationSchemas.optionalPhone,
            bio: [commonRules.maxLength(500, 'Bio')],
        },
        validateOnChange: true,
    });

    useEffect(() => {
        setFormData(profile);
        setHasChanges(false);
        validation.clearAllErrors();
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasChanges(true);

        // Validazione in tempo reale
        const error = validation.validateField(name as keyof UserProfile, value);
        validation.setError(name as keyof UserProfile, error);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validazione finale
        const errors = validation.validateForm(formData);
        if (Object.keys(errors).length > 0) {
            // Gli errori sono già gestiti dal hook
            return;
        }

        const success = await onSave(formData);
        if (success) {
            setHasChanges(false);
            validation.clearAllErrors();
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
                    const value = formData[field.name as keyof UserProfile] as string || '';
                    const error = validation.errors[field.name];
                    const inputType = field.name === 'phone' ? 'tel' : field.name === 'website' ? 'url' : 'text';

                    return (
                        <motion.div
                            key={field.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <SettingsInput
                                label={field.label}
                                name={field.name}
                                value={value}
                                onChange={handleChange}
                                type={inputType}
                                icon={field.icon}
                                required={field.required}
                                error={error}
                                tooltipTitle={
                                    field.name === 'website' ? 'Formato URL' :
                                    field.name === 'phone' ? 'Formato telefono' :
                                    undefined
                                }
                                tooltipContent={
                                    field.name === 'website' ? 'Inserisci un URL completo che inizi con http:// o https://' :
                                    field.name === 'phone' ? 'Puoi includere spazi, trattini, parentesi e il prefisso internazionale (+39)' :
                                    undefined
                                }
                            />
                        </motion.div>
                    );
                })}
            </div>

            {/* Bio Textarea */}
            <SettingsTextarea
                label="Bio"
                name="bio"
                value={formData.bio || ''}
                onChange={handleChange}
                rows={4}
                maxLength={500}
                placeholder="Raccontaci qualcosa di te..."
                icon={FileText}
            />

            {/* Status Messages */}
            <AnimatePresence>
                {status.error && (
                    <SettingsError
                        message={status.error}
                        title="Errore nel salvataggio"
                    />
                )}
                {status.success && (
                    <SettingsSuccess
                        message="Profilo aggiornato con successo!"
                        title="Profilo salvato"
                    />
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
                    disabled={status.loading || !hasChanges || validation.hasErrors}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`btn-primary px-6 py-3 ${
                        !hasChanges || validation.hasErrors
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
