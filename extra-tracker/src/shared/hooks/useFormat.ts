/**
 * 🎨 USE FORMAT - Hook per formattazione con preferenze utente
 * 
 * Fornisce funzioni di formattazione basate sulle preferenze:
 * - Valuta
 * - Date
 * - Ore
 */

import { useSettings } from '../../features/settings/context/SettingsContext';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from '../utils/currencyUtils';

export const useFormat = () => {
    const { preferences } = useSettings();
    
    /**
     * Formatta importo in valuta con preferenze utente
     */
    const formatMoney = (amount: number): string => {
        return formatCurrency(amount, preferences.currency);
    };

    /**
     * Formatta importo in modo compatto
     */
    const formatMoneyCompact = (amount: number): string => {
        return formatCurrencyCompact(amount, preferences.currency);
    };

    /**
     * Ottieni simbolo valuta
     */
    const currencySymbol = getCurrencySymbol(preferences.currency);

    /**
     * Formatta data secondo preferenze utente
     */
    const formatDate = (date: Date | string): string => {
        const d = typeof date === 'string' ? new Date(date) : date;
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        switch (preferences.dateFormat) {
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'DD/MM/YYYY':
            default:
                return `${day}/${month}/${year}`;
        }
    };

    /**
     * Formatta data in modo leggibile (es. "29 Dicembre 2025")
     */
    const formatDateLong = (date: Date | string): string => {
        const d = typeof date === 'string' ? new Date(date) : date;
        
        const localeMap: Record<string, string> = {
            it: 'it-IT',
            en: 'en-GB',
            es: 'es-ES',
            de: 'de-DE',
            fr: 'fr-FR',
        };

        return d.toLocaleDateString(localeMap[preferences.language] || 'it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    /**
     * Formatta orario secondo preferenze
     */
    const formatTime = (time: string): string => {
        if (preferences.timeFormat === '12h') {
            const [hours, minutes] = time.split(':').map(Number);
            const period = hours >= 12 ? 'PM' : 'AM';
            const hour12 = hours % 12 || 12;
            return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
        }
        return time;
    };

    /**
     * Formatta ore in modo leggibile
     */
    const formatHours = (hours: number): string => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    /**
     * Calcola guadagno con tariffa predefinita se non specificata
     */
    const calculateEarnings = (hours: number, hourlyRate?: number): number => {
        const rate = hourlyRate ?? preferences.defaultHourlyRate;
        return hours * rate;
    };

    return {
        // Valuta
        formatMoney,
        formatMoneyCompact,
        currencySymbol,
        currency: preferences.currency,
        defaultHourlyRate: preferences.defaultHourlyRate,
        
        // Date
        formatDate,
        formatDateLong,
        dateFormat: preferences.dateFormat,
        
        // Ore
        formatTime,
        formatHours,
        timeFormat: preferences.timeFormat,
        
        // Calcoli
        calculateEarnings,
        
        // Altre preferenze utili
        language: preferences.language,
        weekStartsOn: preferences.weekStartsOn,
        workingDays: preferences.workingDays,
        dailyGoalHours: preferences.dailyGoalHours,
        weeklyGoalHours: preferences.weeklyGoalHours,
        showMotivationalMessages: preferences.showMotivationalMessages,
        theme: preferences.theme,
    };
};
