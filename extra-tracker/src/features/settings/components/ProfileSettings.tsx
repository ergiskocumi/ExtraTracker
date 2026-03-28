/**
 * 👤 PROFILE SETTINGS v2 - Design moderno e pulito
 * 
 * Features:
 * - Layout a card organizzato
 * - Form fields moderni
 * - Avatar upload integrato
 * - Validazione in tempo reale
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Phone, Building, Briefcase, MapPin, 
  Globe, FileText, Camera, CheckCircle2, AlertCircle 
} from 'lucide-react';
import type { UserProfile } from '../services/settingsService';
import type { FormStatus } from './types';
import { useFormValidation } from '../hooks/useFormValidation';
import { commonRules, validationSchemas } from '../utils/validation';
import { SettingsCard } from './SettingsCard';
import { SettingsFormField } from './SettingsFormField';
import { AvatarUpload } from './AvatarUpload';
import { cn } from '../../../lib/utils';

interface ProfileSettingsProps {
  profile: UserProfile;
  accountEmail?: string;
  onSave: (data: Partial<UserProfile>) => Promise<boolean>;
  status: FormStatus;
  onAvatarUpload?: (file: File) => Promise<string | null>;
  onAvatarDelete?: () => Promise<boolean>;
}

export const ProfileSettings = ({ 
  profile, 
  accountEmail, 
  onSave, 
  status, 
  onAvatarUpload, 
  onAvatarDelete 
}: ProfileSettingsProps) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [hasChanges, setHasChanges] = useState(false);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasChanges(true);
    const error = validation.validateField(name as keyof UserProfile, value);
    validation.setError(name as keyof UserProfile, error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validation.validateForm(formData);
    if (Object.keys(errors).length > 0) return;

    const success = await onSave(formData);
    if (success) {
      setHasChanges(false);
      validation.clearAllErrors();
    }
  };

  const personalFields = [
    { name: 'firstName', label: 'Nome', icon: User, placeholder: 'Il tuo nome' },
    { name: 'lastName', label: 'Cognome', icon: User, placeholder: 'Il tuo cognome' },
    { name: 'displayName', label: 'Nome visualizzato', icon: User, placeholder: 'Come ti vedranno gli altri' },
  ];

  const contactFields = [
    { name: 'phone', label: 'Telefono', icon: Phone, type: 'tel' as const, placeholder: '+39 123 456 7890' },
    { name: 'location', label: 'Località', icon: MapPin, placeholder: 'Città, Paese' },
  ];

  const professionalFields = [
    { name: 'company', label: 'Azienda', icon: Building, placeholder: 'Dove lavori' },
    { name: 'jobTitle', label: 'Ruolo', icon: Briefcase, placeholder: 'La tua posizione' },
    { name: 'website', label: 'Sito web', icon: Globe, type: 'url' as const, placeholder: 'https://tuosito.com' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Card */}
      <SettingsCard
        title="Foto Profilo"
        description="Personalizza la tua immagine visibile agli altri utenti"
        icon={Camera}
      >
        <AvatarUpload
          currentAvatarUrl={profile.avatar}
          displayName={formData.displayName || `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Utente'}
          onUpload={onAvatarUpload}
          onDelete={onAvatarDelete}
        />
      </SettingsCard>

      {/* Email Card - Read Only */}
      {accountEmail && (
        <SettingsCard
          title="Email Account"
          description="L'indirizzo email associato al tuo account"
          icon={Mail}
        >
          <div className="flex items-center gap-4 p-4 bg-theme-subtle/30 rounded-xl border border-theme-default">
            <div className="p-3 rounded-xl bg-primary-500/10 text-primary-500">
              <Mail className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-theme-secondary">Email principale</p>
              <p className="text-lg font-semibold text-theme-primary">{accountEmail}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              Verificata
            </span>
          </div>
        </SettingsCard>
      )}

      {/* Personal Info Card */}
      <SettingsCard
        title="Informazioni Personali"
        description="I tuoi dati base visibili sul profilo"
        icon={User}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {personalFields.map((field) => (
            <SettingsFormField
              key={field.name}
              label={field.label}
              name={field.name}
              value={(formData[field.name as keyof UserProfile] as string) || ''}
              onChange={handleChange}
              icon={field.icon}
              placeholder={field.placeholder}
              error={validation.errors[field.name]}
            />
          ))}
        </div>
      </SettingsCard>

      {/* Contact Info Card */}
      <SettingsCard
        title="Contatti"
        description="Come possono contattarti gli altri utenti"
        icon={Phone}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {contactFields.map((field) => (
            <SettingsFormField
              key={field.name}
              label={field.label}
              name={field.name}
              value={(formData[field.name as keyof UserProfile] as string) || ''}
              onChange={handleChange}
              type={field.type}
              icon={field.icon}
              placeholder={field.placeholder}
              error={validation.errors[field.name]}
              helper={field.name === 'phone' ? 'Formato internazionale consigliato' : undefined}
            />
          ))}
        </div>
      </SettingsCard>

      {/* Professional Info Card */}
      <SettingsCard
        title="Informazioni Professionali"
        description="Dati sul tuo lavoro e presenza online"
        icon={Briefcase}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {professionalFields.map((field) => (
            <SettingsFormField
              key={field.name}
              label={field.label}
              name={field.name}
              value={(formData[field.name as keyof UserProfile] as string) || ''}
              onChange={handleChange}
              type={field.type || 'text'}
              icon={field.icon}
              placeholder={field.placeholder}
              error={validation.errors[field.name]}
              helper={field.name === 'website' ? 'URL completo con https://' : undefined}
            />
          ))}
        </div>
      </SettingsCard>

      {/* Bio Card */}
      <SettingsCard
        title="Bio"
        description="Racconta qualcosa di te (max 500 caratteri)"
        icon={FileText}
      >
        <SettingsFormField
          label=""
          name="bio"
          value={formData.bio || ''}
          onChange={handleChange}
          type="textarea"
          placeholder="Ciao! Sono uno studente appassionato di..."
          rows={4}
          maxLength={500}
        />
      </SettingsCard>

      {/* Status Messages */}
      <AnimatePresence>
        {status.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{status.error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Bar */}
      <div className="sticky bottom-4 z-10">
        <div className={cn(
          "flex items-center justify-between gap-4 p-4 rounded-2xl",
          "bg-theme-surface border shadow-lg",
          hasChanges ? "border-primary-500/30 shadow-primary-500/10" : "border-theme-default"
        )}>
          <div className="flex items-center gap-3">
            {hasChanges ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-2.5 h-2.5 rounded-full bg-amber-500"
                />
                <span className="text-sm text-theme-secondary">
                  Modifiche non salvate
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-theme-secondary">
                  Tutto aggiornato
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                type="button"
                onClick={() => {
                  setFormData(profile);
                  setHasChanges(false);
                  validation.clearAllErrors();
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle transition-colors"
              >
                Annulla
              </button>
            )}
            <motion.button
              type="submit"
              disabled={status.loading || !hasChanges || validation.hasErrors}
              whileHover={hasChanges && !validation.hasErrors ? { scale: 1.02 } : {}}
              whileTap={hasChanges && !validation.hasErrors ? { scale: 0.98 } : {}}
              className={cn(
                "px-6 py-2.5 rounded-xl font-semibold text-white transition-all",
                hasChanges && !validation.hasErrors && !status.loading
                  ? "bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/25"
                  : "bg-theme-subtle text-theme-muted cursor-not-allowed"
              )}
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
        </div>
      </div>
    </form>
  );
};

export default ProfileSettings;
