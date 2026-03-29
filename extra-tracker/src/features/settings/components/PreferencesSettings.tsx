/**
 * ⚙️ PREFERENCES SETTINGS v2 - Design moderno e pulito
 * 
 * Features:
 * - Card organizzate per sezioni
 * - Theme preview moderno
 * - Auto-save per preferenze semplici
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Palette, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { UserPreferences } from '../services/settingsService';
import type { FormStatus } from './types';
import { SettingsCard } from './SettingsCard';
import { SettingsFormField } from './SettingsFormField';
import { cn } from '../../../lib/utils';

interface PreferencesSettingsProps {
  preferences: UserPreferences;
  onSave: (data: Partial<UserPreferences>) => Promise<boolean>;
  status: FormStatus;
}

export const PreferencesSettings = ({ preferences, onSave, status }: PreferencesSettingsProps) => {
  const [formData, setFormData] = useState<UserPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFormData(preferences);
    setHasChanges(false);
  }, [preferences]);

  const autoSave = useCallback(async () => {
    if (hasChanges && !status.loading) {
      await onSave(formData);
      setHasChanges(false);
    }
  }, [formData, hasChanges, onSave, status.loading]);

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    const next = { ...formData, theme };
    setFormData(next);
    setHasChanges(false);
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      setAutoSaveTimer(null);
    }
    await onSave(next);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as never }));
    setHasChanges(true);

    if (['language', 'timeFormat'].includes(name)) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      const timer = setTimeout(() => autoSave(), 2000);
      setAutoSaveTimer(timer);
    }
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [autoSaveTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(formData);
    if (success) setHasChanges(false);
  };

  const languages = [
    { value: 'it', label: '🇮🇹 Italiano' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'es', label: '🇪🇸 Español' },
    { value: 'de', label: '🇩🇪 Deutsch' },
    { value: 'fr', label: '🇫🇷 Français' },
  ];

  const timeFormats = [
    { value: '24h', label: '24 ore (14:30)' },
    { value: '12h', label: '12 ore (2:30 PM)' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Theme Card */}
      <SettingsCard
        title="Tema"
        description="Scegli l'aspetto dell'applicazione"
        icon={Palette}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Light Theme */}
          <ThemePreviewButton
            label="☀️ Light"
            isActive={formData.theme === 'light'}
            onClick={() => handleThemeChange('light')}
            preview="light"
          />
          
          {/* Dark Theme */}
          <ThemePreviewButton
            label="🌙 Dark"
            isActive={formData.theme === 'dark'}
            onClick={() => handleThemeChange('dark')}
            preview="dark"
          />
          
          {/* System Theme */}
          <ThemePreviewButton
            label="💻 System"
            isActive={formData.theme === 'system'}
            onClick={() => handleThemeChange('system')}
            preview="system"
          />
        </div>
      </SettingsCard>

      {/* Localization Card */}
      <SettingsCard
        title="Localizzazione"
        description="Lingua e formato dell'interfaccia"
        icon={Globe}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SettingsFormField
            label="Lingua"
            name="language"
            value={formData.language}
            onChange={handleChange}
            type="select"
            icon={Globe}
            options={languages}
          />
          
          <SettingsFormField
            label="Formato ora"
            name="timeFormat"
            value={formData.timeFormat}
            onChange={handleChange}
            type="select"
            icon={Clock}
            options={timeFormats}
          />
        </div>
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
                <span className="text-sm text-theme-secondary">Modifiche non salvate</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-theme-secondary">Tutto aggiornato</span>
              </>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={status.loading || !hasChanges}
            whileHover={hasChanges ? { scale: 1.02 } : {}}
            whileTap={hasChanges ? { scale: 0.98 } : {}}
            className={cn(
              "px-6 py-2.5 rounded-xl font-semibold text-white transition-all",
              hasChanges && !status.loading
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
    </form>
  );
};

// ============================================
// THEME PREVIEW BUTTON COMPONENT
// ============================================

interface ThemePreviewButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  preview: 'light' | 'dark' | 'system';
}

const ThemePreviewButton = ({ label, isActive, onClick, preview }: ThemePreviewButtonProps) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative rounded-xl border-2 overflow-hidden transition-all",
        "focus:outline-none focus:ring-2 focus:ring-primary-500/50",
        isActive
          ? "border-primary-500 ring-2 ring-primary-500/20"
          : "border-theme-default hover:border-theme-strong"
      )}
    >
      {/* Preview Area */}
      <div className="aspect-[4/3] p-2">
        {preview === 'light' && (
          <div className="w-full h-full rounded-lg bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 p-2 space-y-2">
            <div className="h-2 w-1/3 rounded bg-slate-300" />
            <div className="space-y-1">
              <div className="h-1.5 rounded bg-slate-200" />
              <div className="h-1.5 w-2/3 rounded bg-slate-200" />
            </div>
            <div className="mt-auto pt-2 flex gap-1">
              <div className="h-2 w-8 rounded bg-blue-400" />
              <div className="h-2 w-8 rounded bg-slate-300" />
            </div>
          </div>
        )}
        
        {preview === 'dark' && (
          <div className="w-full h-full rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 p-2 space-y-2">
            <div className="h-2 w-1/3 rounded bg-slate-600" />
            <div className="space-y-1">
              <div className="h-1.5 rounded bg-slate-700" />
              <div className="h-1.5 w-2/3 rounded bg-slate-700" />
            </div>
            <div className="mt-auto pt-2 flex gap-1">
              <div className="h-2 w-8 rounded bg-blue-500" />
              <div className="h-2 w-8 rounded bg-slate-600" />
            </div>
          </div>
        )}
        
        {preview === 'system' && (
          <div className="w-full h-full rounded-lg overflow-hidden border border-theme-default flex">
            <div className="flex-1 bg-slate-50 p-1.5 space-y-1">
              <div className="h-1.5 rounded bg-slate-300" />
              <div className="h-1.5 w-2/3 rounded bg-blue-300" />
            </div>
            <div className="flex-1 bg-slate-800 p-1.5 space-y-1">
              <div className="h-1.5 rounded bg-slate-600" />
              <div className="h-1.5 w-2/3 rounded bg-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Label */}
      <div className={cn(
        "px-3 py-2 text-sm font-medium text-center",
        "bg-theme-subtle border-t border-theme-default",
        isActive && "text-primary-500"
      )}>
        {label}
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
      )}
    </motion.button>
  );
};

export default PreferencesSettings;
