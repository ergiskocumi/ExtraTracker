/**
 * 🔔 DECK NOTIFICATIONS - Notifiche per Carte in Scadenza
 * 
 * Sistema di notifiche per ricordare all'utente di studiare
 * quando ci sono carte in scadenza.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Clock } from 'lucide-react';
import { emitToast } from '../../../../shared/components/toast/toastEvents'; ;

interface DeckNotificationsProps {
    deckId: string;
    dueCardsCount: number;
    deckTitle: string;
}

export const DeckNotifications: React.FC<DeckNotificationsProps> = ({
    deckId,
    dueCardsCount,
    deckTitle,
}) => {
    // Inizializza preferenze da localStorage in modo robusto (senza setState in effect)
    const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
        try {
            if (typeof window === 'undefined') return true;

            const toBool = (val: unknown): boolean | null => {
                if (typeof val === 'boolean') return val;
                if (typeof val === 'number') return val !== 0;
                if (typeof val === 'string') {
                    const v = val.trim().toLowerCase();
                    if (['true', '1', 'yes', 'on'].includes(v)) return true;
                    if (['false', '0', 'no', 'off'].includes(v)) return false;
                }
                return null;
            };

            const key = `deck-notifications-${deckId}`;
            const saved = window.localStorage.getItem(key);
            if (saved !== null) {
                let parsed: unknown = saved;
                try { parsed = JSON.parse(saved); } catch { /* plain string */ }
                const value = toBool(parsed);
                if (value !== null) return value;
            }

            const globalRaw = window.localStorage.getItem('global-deck-notifications');
            if (globalRaw !== null) {
                let globalParsed: unknown = globalRaw;
                try { globalParsed = JSON.parse(globalRaw); } catch { /* plain string */ }
                const globalVal = toBool(globalParsed);
                if (globalVal !== null) return globalVal;
            }

            return true;
        } catch {
            return true;
        }
    });
    const lastNotificationTimeRef = useRef<Date | null>(null);

    // Controlla se ci sono carte in scadenza e mostra notifica
    useEffect(() => {
        if (!notificationsEnabled || dueCardsCount === 0) return;

        // Evita notifiche troppo frequenti (max 1 ogni 4 ore)
        const now = new Date();
        const lastNotif = lastNotificationTimeRef.current;
        if (lastNotif) {
            const hoursSinceLastNotif = (now.getTime() - lastNotif.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastNotif < 4) return;
        }

        // Mostra notifica browser se supportata
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`📚 ${deckTitle}`, {
                body: `Hai ${dueCardsCount} ${dueCardsCount === 1 ? 'carta' : 'carte'} da ripassare!`,
                icon: '/vite.svg',
                badge: '/vite.svg',
                tag: `deck-${deckId}`,
                requireInteraction: false,
            });
        }

        // Mostra toast
        if (dueCardsCount > 0) {
            emitToast.info(
                `Hai ${dueCardsCount} ${dueCardsCount === 1 ? 'carta' : 'carte'} da ripassare in "${deckTitle}"`,
                {
                    title: 'Carte in Scadenza',
                    duration: 5000,
                }
            );
        }

        lastNotificationTimeRef.current = now;
    }, [dueCardsCount, deckTitle, deckId, notificationsEnabled]);

    // Richiedi permesso notifiche browser al primo utilizzo
    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                emitToast.success('Notifiche abilitate!');
            } else {
                emitToast.info('Notifiche browser non disponibili. Useremo i toast.');
            }
        }
    };

    const handleToggleNotifications = () => {
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);
        localStorage.setItem(`deck-notifications-${deckId}`, JSON.stringify(newValue));
        
        if (newValue) {
            requestNotificationPermission();
            emitToast.success('Notifiche abilitate per questo mazzo');
        } else {
            emitToast.info('Notifiche disabilitate per questo mazzo');
        }
    };

    // Banner notifica se ci sono carte in scadenza
    if (dueCardsCount === 0) return null;

    return (
        <AnimatePresence>
            {notificationsEnabled && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-4 mb-6 border rounded-2xl border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start flex-1 gap-3">
                            <div className="p-2 border rounded-xl bg-amber-500/20 border-amber-500/30">
                                <Clock className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="mb-1 text-base font-semibold text-white">
                                    Carte in Scadenza
                                </h3>
                                <p className="text-sm text-white/70">
                                    Hai <span className="font-bold text-amber-400">{dueCardsCount}</span>{' '}
                                    {dueCardsCount === 1 ? 'carta' : 'carte'} da ripassare in questo mazzo.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleToggleNotifications}
                                className="p-2 transition-all rounded-lg hover:bg-white/10"
                                title={notificationsEnabled ? 'Disabilita notifiche' : 'Abilita notifiche'}
                            >
                                {notificationsEnabled ? (
                                    <Bell className="w-4 h-4 text-amber-400" />
                                ) : (
                                    <BellOff className="w-4 h-4 text-white/40" />
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

/**
 * Hook per gestire notifiche globali per tutti i deck
 */
// Nota: l'hook globale è stato spostato in useDeckNotifications.ts
