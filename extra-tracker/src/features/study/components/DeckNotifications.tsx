/**
 * 🔔 DECK NOTIFICATIONS - Notifiche per Carte in Scadenza
 * 
 * Sistema di notifiche per ricordare all'utente di studiare
 * quando ci sono carte in scadenza.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiBell,
    FiBellOff,
    FiClock,
} from 'react-icons/fi';
import { emitToast } from '../../../shared/components/toast';

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
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const lastNotificationTimeRef = useRef<Date | null>(null);

    // Carica preferenze notifiche dal localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`deck-notifications-${deckId}`);
        if (saved !== null) {
            setNotificationsEnabled(JSON.parse(saved));
        }
    }, [deckId]);

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
                    className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 mb-6"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                                <FiClock className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-white mb-1">
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
                                className="p-2 rounded-lg hover:bg-white/10 transition-all"
                                title={notificationsEnabled ? 'Disabilita notifiche' : 'Abilita notifiche'}
                            >
                                {notificationsEnabled ? (
                                    <FiBell className="w-4 h-4 text-amber-400" />
                                ) : (
                                    <FiBellOff className="w-4 h-4 text-white/40" />
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
export const useDeckNotifications = () => {
    const [enabled, setEnabled] = useState(() => {
        const saved = localStorage.getItem('global-deck-notifications');
        return saved ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('global-deck-notifications', JSON.stringify(enabled));
    }, [enabled]);

    const requestPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };

    return { enabled, setEnabled, requestPermission };
};
