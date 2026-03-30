/**
 * Format a number in compact notation (e.g. 1.2M, 500K).
 */
export function formatCompact(value: number, currency = 'BRL'): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const prefix = currency === 'BRL' ? 'R$ ' : currency === 'USD' ? '$ ' : `${currency} `;

  if (abs >= 1e9) return `${sign}${prefix}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${prefix}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${prefix}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${prefix}${abs.toFixed(0)}`;
}

/**
 * Format a number as percentage (e.g. 12.50%).
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format a number as a multiple (e.g. 8.0x).
 */
export function formatMultiple(value: number): string {
  return `${value.toFixed(1)}x`;
}

/**
 * Format a number with thousands separators.
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
