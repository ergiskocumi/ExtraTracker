/**
 * 🔔 NOTIFICATIONS SETTINGS - Gestione preferenze notifiche
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Bell, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { SettingsToggle } from './SettingsToggle';
import { SettingsError, SettingsSuccess } from './feedback';
import type { UserNotifications } from '../services/settingsService';
import type { FormStatus } from './types';

interface NotificationsSettingsProps {
    notifications: UserNotifications;
    onSave: (data: Partial<UserNotifications>) => Promise<boolean>;
    status: FormStatus;
}

export const NotificationsSettings = ({ notifications, onSave, status }: NotificationsSettingsProps) => {
    const [formData, setFormData] = useState<UserNotifications>(notifications);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setFormData(notifications);
        setHasChanges(false);
    }, [notifications]);

    const handleToggle = (section: 'email' | 'push', field: string, value: boolean) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
        setHasChanges(true);
    };

    const handleReminderTimeChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            push: {
                ...prev.push,
                reminderTime: value,
            },
        }));
        setHasChanges(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSave(formData);
        if (success) {
            setHasChanges(false);
        }
    };

    const handleReset = () => {
        setFormData(notifications);
        setHasChanges(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email Notifications */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary-400" />
                    Notifiche Email
                </h3>
                <p className="text-sm text-white/60 -mt-2">
                    Ricevi aggiornamenti importanti direttamente nella tua casella di posta.
                </p>

                <div className="space-y-3">
                    <SettingsToggle
                        variant="field"
                        label="Notifiche email attive"
                        description="Attiva/disattiva tutte le notifiche via email"
                        checked={formData.email.enabled}
                        onChange={(checked) => handleToggle('email', 'enabled', checked)}
                    />

                    <AnimatePresence>
                        {formData.email.enabled && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 pl-4 border-l-2 border-primary-500/30 ml-2"
                            >
                                <SettingsToggle
                                    variant="field"
                                    label="Report settimanale"
                                    description="Ricevi un riepilogo settimanale delle tue attività"
                                    checked={formData.email.weeklyReport}
                                    onChange={(checked) => handleToggle('email', 'weeklyReport', checked)}
                                />
                                <SettingsToggle
                                    variant="field"
                                    label="Aggiornamenti progetti"
                                    description="Notifiche quando ci sono cambiamenti nei progetti"
                                    checked={formData.email.projectUpdates}
                                    onChange={(checked) => handleToggle('email', 'projectUpdates', checked)}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Push Notifications */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary-400" />
                    Notifiche Push
                </h3>
                <p className="text-sm text-white/60 -mt-2">
                    Ricevi notifiche in tempo reale sul tuo dispositivo.
                </p>

                <div className="space-y-3">
                    <SettingsToggle
                        variant="field"
                        label="Notifiche push attive"
                        description="Attiva/disattiva tutte le notifiche push"
                        checked={formData.push.enabled}
                        onChange={(checked) => handleToggle('push', 'enabled', checked)}
                    />

                    <AnimatePresence>
                        {formData.push.enabled && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 pl-4 border-l-2 border-primary-500/30 ml-2"
                            >
                                <SettingsToggle
                                    variant="field"
                                    label="Promemoria giornaliero"
                                    description="Ricevi un promemoria ogni giorno all'orario impostato"
                                    checked={formData.push.dailyReminder}
                                    onChange={(checked) => handleToggle('push', 'dailyReminder', checked)}
                                />

                                {formData.push.dailyReminder && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center gap-3 pt-2"
                                    >
                                        <Clock className="w-4 h-4 text-white/50" />
                                        <label className="text-sm text-white/70">Orario promemoria:</label>
                                        <input
                                            type="time"
                                            value={formData.push.reminderTime}
                                            onChange={(e) => handleReminderTimeChange(e.target.value)}
                                            className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.12] text-white text-sm focus:outline-none focus:border-primary-500/50"
                                        />
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                        message="Preferenze notifiche aggiornate con successo!"
                        title="Impostazioni salvate"
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
                        'Salva modifiche'
                    )}
                </motion.button>
            </div>
        </form>
    );
};
