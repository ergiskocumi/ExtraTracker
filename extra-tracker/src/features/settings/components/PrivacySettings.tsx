/**
 * 🔒 PRIVACY SETTINGS - Gestione impostazioni privacy
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, Users, Database, CheckCircle2, RotateCcw } from 'lucide-react';
import { SettingsToggle, SettingsSelect } from './fields';
import { SettingsError, SettingsSuccess } from './feedback';
import type { FormStatus } from './types';

interface PrivacySettingsData {
    profileVisibility: 'public' | 'friends' | 'private';
    showActivityStatus: boolean;
    allowDataSharing: boolean;
    allowAnalytics: boolean;
    dataRetentionDays: number;
}

interface PrivacySettingsProps {
    onSave: (data: PrivacySettingsData) => Promise<boolean>;
    status: FormStatus;
}

const defaultPrivacySettings: PrivacySettingsData = {
    profileVisibility: 'private',
    showActivityStatus: true,
    allowDataSharing: false,
    allowAnalytics: true,
    dataRetentionDays: 365,
};

export const PrivacySettings = ({ onSave, status }: PrivacySettingsProps) => {
    const [formData, setFormData] = useState<PrivacySettingsData>(defaultPrivacySettings);
    const [hasChanges, setHasChanges] = useState(false);

    // Carica da localStorage o usa default
    useEffect(() => {
        const stored = localStorage.getItem('privacy_settings');
        if (stored) {
            try {
                setFormData({ ...defaultPrivacySettings, ...JSON.parse(stored) });
            } catch {
                setFormData(defaultPrivacySettings);
            }
        }
    }, []);

    const handleChange = <K extends keyof PrivacySettingsData>(
        field: K,
        value: PrivacySettingsData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSave(formData);
        if (success) {
            localStorage.setItem('privacy_settings', JSON.stringify(formData));
            setHasChanges(false);
        }
    };

    const handleReset = () => {
        const stored = localStorage.getItem('privacy_settings');
        if (stored) {
            try {
                setFormData({ ...defaultPrivacySettings, ...JSON.parse(stored) });
            } catch {
                setFormData(defaultPrivacySettings);
            }
        } else {
            setFormData(defaultPrivacySettings);
        }
        setHasChanges(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Privacy Overview */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-primary-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-1">
                            Il tuo controllo sulla privacy
                        </h4>
                        <p className="text-sm text-white/60 leading-relaxed">
                            Gestisci chi può vedere le tue informazioni e come vengono utilizzati i tuoi dati. 
                            Le tue scelte vengono salvate immediatamente e possono essere modificate in qualsiasi momento.
                        </p>
                    </div>
                </div>
            </div>

            {/* Visibility Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary-400" />
                    Visibilità Profilo
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsSelect
                        label="Visibilità profilo"
                        name="profileVisibility"
                        value={formData.profileVisibility}
                        onChange={(e) => handleChange('profileVisibility', e.target.value as PrivacySettingsData['profileVisibility'])}
                        icon={Users}
                        options={[
                            { value: 'public', label: '🌐 Pubblico - Tutti possono vedere' },
                            { value: 'friends', label: '👥 Solo amici - Solo contatti' },
                            { value: 'private', label: '🔒 Privato - Solo tu' },
                        ]}
                        tooltipTitle="Chi può vedere il tuo profilo"
                        tooltipContent="Questa impostazione determina chi può visualizzare le tue informazioni pubbliche"
                    />
                </div>

                <SettingsToggle
                    label="Mostra stato attività"
                    description="Gli altri utenti possono vedere quando sei online"
                    checked={formData.showActivityStatus}
                    onChange={(checked) => handleChange('showActivityStatus', checked)}
                />
            </div>

            {/* Data Usage Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary-400" />
                    Utilizzo Dati
                </h3>

                <div className="space-y-3">
                    <SettingsToggle
                        label="Condivisione dati con partner"
                        description="Permetti di condividere dati anonimi con partner di fiducia per migliorare i servizi"
                        checked={formData.allowDataSharing}
                        onChange={(checked) => handleChange('allowDataSharing', checked)}
                    />

                    <SettingsToggle
                        label="Analytics e miglioramenti"
                        description="Aiutaci a migliorare l'app inviando dati di utilizzo anonimi"
                        checked={formData.allowAnalytics}
                        onChange={(checked) => handleChange('allowAnalytics', checked)}
                    />
                </div>
            </div>

            {/* Data Retention */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary-400" />
                        <h4 className="font-semibold text-white">Conservazione dati</h4>
                    </div>
                    <p className="text-sm text-white/60">
                        Scegli per quanto tempo conservare i tuoi dati di attività. I dati più vecchi verranno eliminati automaticamente.
                    </p>
                    <SettingsSelect
                        label="Periodo di conservazione"
                        name="dataRetentionDays"
                        value={String(formData.dataRetentionDays)}
                        onChange={(e) => handleChange('dataRetentionDays', Number(e.target.value))}
                        options={[
                            { value: '30', label: '30 giorni' },
                            { value: '90', label: '3 mesi' },
                            { value: '180', label: '6 mesi' },
                            { value: '365', label: '1 anno' },
                            { value: '730', label: '2 anni' },
                            { value: '0', label: 'Per sempre (non consigliato)' },
                        ]}
                    />
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
                        message="Impostazioni privacy aggiornate con successo!"
                        title="Privacy salvata"
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
                            onClick={handleReset}
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
                    disabled={status.loading || !hasChanges}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`btn-primary px-6 py-3 ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        'Salva privacy'
                    )}
                </motion.button>
            </div>
        </form>
    );
};
