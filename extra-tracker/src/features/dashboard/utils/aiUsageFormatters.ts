const CURRENCY_FORMATTER = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const INTEGER_FORMATTER = new Intl.NumberFormat('it-IT');
const COMPACT_FORMATTER = new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 });

export const formatInt = (value: number) => INTEGER_FORMATTER.format(value || 0);
export const formatCompact = (value: number) => COMPACT_FORMATTER.format(value || 0);
export const formatEur = (value: number) => CURRENCY_FORMATTER.format(value || 0);

export const formatEurCompact = (value: number) => {
  if (value === 0) return '€0';
  if (value < 0.01) return `€${(value * 100).toFixed(2)}`;
  if (value < 1) return `€${value.toFixed(4)}`;
  return `€${value.toFixed(2)}`;
};

export const formatDateTime = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
