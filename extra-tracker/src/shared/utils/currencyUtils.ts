/**
 * 💰 CURRENCY UTILS
 * 
 * Formattazione valuta con supporto preferenze utente
 */

// Mappa valuta -> locale
const currencyLocales: Record<string, string> = {
    EUR: 'it-IT',
    USD: 'en-US',
    GBP: 'en-GB',
    CHF: 'de-CH',
};

// Mappa valuta -> simbolo
export const currencySymbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
};

/**
 * Formatta un importo in valuta
 * @param amount - Importo da formattare
 * @param currency - Codice valuta (default: EUR)
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
    const locale = currencyLocales[currency] || 'it-IT';
    
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
    }).format(amount);
};

/**
 * Formatta un importo con solo simbolo (più compatto)
 * @param amount - Importo da formattare  
 * @param currency - Codice valuta (default: EUR)
 */
export const formatCurrencyCompact = (amount: number, currency: string = 'EUR'): string => {
    const symbol = currencySymbols[currency] || '€';
    const formatted = new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
    }).format(amount);
    
    return `${symbol} ${formatted}`;
};

/**
 * Ottieni il simbolo della valuta
 * @param currency - Codice valuta
 */
export const getCurrencySymbol = (currency: string = 'EUR'): string => {
    return currencySymbols[currency] || '€';
};