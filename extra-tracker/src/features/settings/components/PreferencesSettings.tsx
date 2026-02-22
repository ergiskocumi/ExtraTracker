/**
 * ⚙️ PREFERENCES SETTINGS - Premium Preferences Management
 * 
 * Design premium con toggle switches e feedback immediato
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Globe,
    Palette,
    Clock,
    CheckCircle2,
    RotateCcw
} from 'lucide-react';
import type { UserPreferences } from '../services/settingsService';
import type { FormStatus } from './types';
import { SettingsSelect } from './fields';
import { SettingsError, SettingsSuccess } from './feedback';

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

    // Auto-save per preferenze non critiche
    const autoSave = useCallback(async () => {
        if (hasChanges && !status.loading) {
            await onSave(formData);
            setHasChanges(false);
        }
    }, [formData, hasChanges, onSave, status.loading]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value as never }));
        setHasChanges(true);

        // Auto-save dopo 2 secondi di inattività per preferenze non critiche
        const autoSaveFields = ['language', 'theme', 'timeFormat'];
        if (autoSaveFields.includes(name)) {
            if (autoSaveTimer) {
                clearTimeout(autoSaveTimer);
            }
            const timer = setTimeout(() => {
                autoSave();
            }, 2000);
            setAutoSaveTimer(timer);
        }
    };

    useEffect(() => {
        return () => {
            if (autoSaveTimer) {
                clearTimeout(autoSaveTimer);
            }
        };
    }, [autoSaveTimer]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSave(formData);
        if (success) {
            setHasChanges(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Language & Theme Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Globe className="w-5 h-5" style={{ color: 'var(--primary-500)' }} />
                    Localizzazione e Visualizzazione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <SettingsSelect
                        label="Lingua"
                        name="language"
                        value={formData.language}
                        onChange={handleChange}
                        icon={Globe}
                        options={[
                            { value: 'it', label: '🇮🇹 Italiano' },
                            { value: 'en', label: '🇬🇧 English' },
                            { value: 'es', label: '🇪🇸 Español' },
                            { value: 'de', label: '🇩🇪 Deutsch' },
                            { value: 'fr', label: '🇫🇷 Français' },
                        ]}
                        tooltipTitle="Lingua interfaccia"
                        tooltipContent="La lingua selezionata verrà applicata immediatamente a tutta l'interfaccia"
                    />

                    {/* Formato ora – compatto, affiancato a Lingua */}
                    <SettingsSelect
                        label="Formato ora"
                        name="timeFormat"
                        value={formData.timeFormat}
                        onChange={handleChange}
                        icon={Clock}
                        options={[
                            { value: '24h', label: '24 ore (14:30)' },
                            { value: '12h', label: '12 ore (2:30 PM)' },
                        ]}
                    />

                    {/* Tema: due quadrati con mini-preview dashboard (Light / Dark) + System */}
                    <div className="space-y-2.5 md:space-y-2 md:col-span-2">
                        <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Palette className="w-4 h-4" style={{ color: 'var(--primary-500)' }} />
                            Tema
                        </p>
                        <div className="grid grid-cols-3 gap-3 w-full max-w-2xl mx-auto">
                            {/* Light – mini dashboard con header, card, CTA */}
                            <motion.button
                                type="button"
                                onClick={async () => {
                                    const next = { ...formData, theme: 'light' as const };
                                    setFormData(next);
                                    setHasChanges(false);
                                    if (autoSaveTimer) {
                                        clearTimeout(autoSaveTimer);
                                        setAutoSaveTimer(null);
                                    }
                                    await onSave(next);
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full rounded-2xl border-2 overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] ${
                                    formData.theme === 'light'
                                        ? 'border-primary-500 ring-2 ring-primary-500/30'
                                        : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                                }`}
                            >
                                <div className="aspect-[4/3] flex flex-col bg-gradient-to-b from-[#f2f6fc] to-[#e8eef6] p-1.5 gap-1">
                                    {/* Header mini */}
                                    <div className="flex items-center justify-between h-3 px-1">
                                        <div className="h-1.5 rounded-full bg-slate-300/80" style={{ width: '40%' }} />
                                        <div className="h-2 w-2 rounded-full bg-slate-400/80" />
                                    </div>
                                    {/* Card 1 */}
                                    <div className="flex-1 min-h-0 rounded-md bg-white border border-slate-200/80 shadow-sm p-1 flex flex-col gap-0.5">
                                        <div className="h-0.5 rounded bg-slate-100" style={{ width: '70%' }} />
                                        <div className="h-0.5 rounded bg-slate-100" style={{ width: '45%' }} />
                                        <div className="mt-auto flex gap-0.5">
                                            <div className="h-1 rounded bg-slate-200" style={{ width: '28%' }} />
                                            <div className="h-1 rounded bg-primary-200" style={{ width: '38%' }} />
                                        </div>
                                    </div>
                                    {/* CTA pill */}
                                    <div className="h-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-400 flex items-center justify-center">
                                        <div className="h-0.5 w-1/2 rounded-full bg-white/40" />
                                    </div>
                                </div>
                                <p className="text-xs font-medium py-2 px-2 bg-white/90 text-slate-700 border-t border-slate-200/60">☀️ Light</p>
                            </motion.button>
                            {/* Dark – mini dashboard con header, card, CTA */}
                            <motion.button
                                type="button"
                                onClick={async () => {
                                    const next = { ...formData, theme: 'dark' as const };
                                    setFormData(next);
                                    setHasChanges(false);
                                    if (autoSaveTimer) {
                                        clearTimeout(autoSaveTimer);
                                        setAutoSaveTimer(null);
                                    }
                                    await onSave(next);
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full rounded-2xl border-2 overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] ${
                                    formData.theme === 'dark'
                                        ? 'border-primary-500 ring-2 ring-primary-500/30'
                                        : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                                }`}
                            >
                                <div className="aspect-[4/3] flex flex-col bg-gradient-to-b from-[#0a0a1a] to-[#12122a] p-1.5 gap-1">
                                    {/* Header mini */}
                                    <div className="flex items-center justify-between h-3 px-1">
                                        <div className="h-1.5 rounded-full bg-white/15" style={{ width: '40%' }} />
                                        <div className="h-2 w-2 rounded-full bg-white/20" />
                                    </div>
                                    {/* Card 1 */}
                                    <div className="flex-1 min-h-0 rounded-md bg-white/[0.06] border border-white/10 p-1 flex flex-col gap-0.5">
                                        <div className="h-0.5 rounded bg-white/10" style={{ width: '70%' }} />
                                        <div className="h-0.5 rounded bg-white/10" style={{ width: '45%' }} />
                                        <div className="mt-auto flex gap-0.5">
                                            <div className="h-1 rounded bg-white/10" style={{ width: '28%' }} />
                                            <div className="h-1 rounded bg-primary-500/50" style={{ width: '38%' }} />
                                        </div>
                                    </div>
                                    {/* CTA pill */}
                                    <div className="h-2 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 flex items-center justify-center">
                                        <div className="h-0.5 w-1/2 rounded-full bg-white/30" />
                                    </div>
                                </div>
                                <p className="text-xs font-medium py-2 px-2 bg-white/5 text-white/90 border-t border-white/10">🌙 Dark</p>
                            </motion.button>
                            {/* System – Light e Dark fuse orizzontalmente */}
                            <motion.button
                                type="button"
                                onClick={async () => {
                                    const next = { ...formData, theme: 'system' as const };
                                    setFormData(next);
                                    setHasChanges(false);
                                    if (autoSaveTimer) {
                                        clearTimeout(autoSaveTimer);
                                        setAutoSaveTimer(null);
                                    }
                                    await onSave(next);
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full rounded-2xl border-2 overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] ${
                                    formData.theme === 'system'
                                        ? 'border-primary-500 ring-2 ring-primary-500/30'
                                        : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                                }`}
                            >
                                <div className="aspect-[4/3] flex">
                                    {/* Metà Light */}
                                    <div className="flex-1 flex flex-col bg-gradient-to-b from-[#f2f6fc] to-[#e8eef6] p-1 gap-0.5 border-r border-slate-200/60">
                                        <div className="flex items-center justify-between h-2 px-0.5">
                                            <div className="h-1 rounded-full bg-slate-300/80" style={{ width: '45%' }} />
                                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400/80" />
                                        </div>
                                        <div className="flex-1 min-h-0 rounded bg-white border border-slate-200/60 p-0.5">
                                            <div className="h-0.5 rounded bg-slate-100 mb-0.5" style={{ width: '80%' }} />
                                            <div className="h-0.5 rounded bg-primary-200" style={{ width: '50%' }} />
                                        </div>
                                        <div className="h-1 rounded-full bg-primary-200" />
                                    </div>
                                    {/* Metà Dark */}
                                    <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0a0a1a] to-[#12122a] p-1 gap-0.5">
                                        <div className="flex items-center justify-between h-2 px-0.5">
                                            <div className="h-1 rounded-full bg-white/15" style={{ width: '45%' }} />
                                            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                                        </div>
                                        <div className="flex-1 min-h-0 rounded bg-white/[0.06] border border-white/10 p-0.5">
                                            <div className="h-0.5 rounded bg-white/10 mb-0.5" style={{ width: '80%' }} />
                                            <div className="h-0.5 rounded bg-primary-500/50" style={{ width: '50%' }} />
                                        </div>
                                        <div className="h-1 rounded-full bg-primary-500/50" />
                                    </div>
                                </div>
                                <p className="text-xs font-medium py-2 px-2 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]" style={{ color: 'var(--text-primary)' }}>💻 System</p>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>

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
                        message="Preferenze aggiornate con successo!"
                        title="Preferenze salvate"
                    />
                )}
            </AnimatePresence>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {hasChanges ? (
                            <span className="flex items-center gap-2">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: 'var(--warning)' }}
                                />
                                Modifiche non salvate
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                Tutto aggiornato
                            </span>
                        )}
                    </p>
                    {hasChanges && (
                        <motion.button
                            type="button"
                            onClick={() => {
                                setFormData(preferences);
                                setHasChanges(false);
                                if (autoSaveTimer) {
                                    clearTimeout(autoSaveTimer);
                                    setAutoSaveTimer(null);
                                }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </motion.button>
                    )}
                </div>
                <motion.button
                    type="submit"
                    disabled={status.loading || !hasChanges}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`btn-primary px-6 py-3 ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''
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
