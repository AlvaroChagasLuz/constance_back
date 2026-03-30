/**
 * Constance Valuation Engine — Formatting Utilities
 *
 * Consistent number formatting for valuation outputs.
 * Supports BRL and USD with Brazilian locale conventions.
 */

/**
 * Format a number as currency.
 *
 * Negative values are shown in parentheses (accounting convention).
 * e.g., (R$ 1.234.567)
 */
export function formatCurrency(
  value: number,
  currency: string = 'BRL',
  decimals: number = 0
): string {
  const absFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  return value < 0 ? `(${absFormatted})` : absFormatted;
}

/**
 * Format a number in thousands (R$ XXX mil) or millions (R$ XXX M).
 * Useful for large valuation numbers.
 */
export function formatCompact(
  value: number,
  currency: string = 'BRL'
): string {
  const abs = Math.abs(value);
  const sign = value < 0;
  const symbol = currency === 'BRL' ? 'R$' : '$';

  let formatted: string;
  if (abs >= 1_000_000_000) {
    formatted = `${symbol} ${(abs / 1_000_000_000).toFixed(1)} B`;
  } else if (abs >= 1_000_000) {
    formatted = `${symbol} ${(abs / 1_000_000).toFixed(1)} M`;
  } else if (abs >= 1_000) {
    formatted = `${symbol} ${(abs / 1_000).toFixed(0)} mil`;
  } else {
    formatted = `${symbol} ${abs.toFixed(0)}`;
  }

  return sign ? `(${formatted})` : formatted;
}

/**
 * Format a percentage value.
 * e.g., 12.5 → "12,5%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Format a multiple.
 * e.g., 8.5 → "8,5x"
 */
export function formatMultiple(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals).replace('.', ',')}x`;
}

/**
 * Format a number with thousands separator (Brazilian locale).
 * e.g., 1234567.89 → "1.234.567,89"
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
