// funzione utile per convertire un numero in formato valuta Euro italiano
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};