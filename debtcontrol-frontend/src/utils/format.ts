const currencySymbols: Record<string, string> = {
  USD: '$',
  MXN: '$',
  COP: '$',
  EUR: '€',
};

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbol = currencySymbols[currency] || '$';
  const formatted = Math.abs(amount).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}