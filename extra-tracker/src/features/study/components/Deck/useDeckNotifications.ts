import { useEffect, useState } from 'react';

/**
 * Hook per gestire notifiche globali per tutti i deck
 */
export const useDeckNotifications = () => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('global-deck-notifications');
      if (saved == null) return true;
      try {
        return Boolean(JSON.parse(saved));
      } catch {
        const v = saved.trim().toLowerCase();
        if (["true", "1", "yes", "on"].includes(v)) return true;
        if (["false", "0", "no", "off"].includes(v)) return false;
        return true;
      }
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('global-deck-notifications', JSON.stringify(enabled));
    } catch {
      // ignore storage errors
    }
  }, [enabled]);

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return { enabled, setEnabled, requestPermission };
};
