/**
 * Formats a number to Indian Rupee standard format (en-IN), e.g., ₹1,00,000 or -₹9,202.
 */
export function formatINR(val: number, options?: { hideSymbol?: boolean; showPlus?: boolean }): string {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const formatted = Math.round(absVal).toLocaleString('en-IN');
  const symbol = options?.hideSymbol ? '' : '₹';

  if (isNegative) {
    return `−${symbol}${formatted}`;
  }
  if (options?.showPlus && val > 0) {
    return `+${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}

/**
 * Short form for tiles/charts: ₹24K, ₹3.5L, ₹1.63Cr.
 */
export function formatShortINR(val: number): string {
  const isNegative = val < 0;
  const abs = Math.abs(val);
  const prefix = isNegative ? '−₹' : '₹';

  if (abs >= 10000000) {
    // Crores
    const cr = abs / 10000000;
    const str = cr >= 10 ? cr.toFixed(1) : cr.toFixed(2);
    return `${prefix}${str.replace(/\.00?$|\.0$/, '')}Cr`;
  }
  if (abs >= 100000) {
    // Lakhs
    const lakh = abs / 100000;
    const str = lakh >= 10 ? lakh.toFixed(1) : lakh.toFixed(2);
    return `${prefix}${str.replace(/\.00?$|\.0$/, '')}L`;
  }
  if (abs >= 1000) {
    // Thousands
    const k = abs / 1000;
    const str = k >= 10 ? k.toFixed(0) : k.toFixed(1);
    return `${prefix}${str.replace(/\.0$/, '')}K`;
  }
  return `${prefix}${Math.round(abs)}`;
}

export const formatCompactINR = formatShortINR;

/**
 * Parses YYYY-MM-DD safely into Date object in Asia/Kolkata context.
 */
export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d || 1));
}

/**
 * Formats a Date or YYYY-MM-DD string to "14 Oct 2026" or "Oct 2026".
 */
export function formatDateKolkata(dateInput: string | Date, style: 'full' | 'short' | 'monthYear' | 'dayMonth' = 'full'): string {
  const date = typeof dateInput === 'string' ? parseDateString(dateInput) : dateInput;
  
  if (style === 'monthYear') {
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      year: 'numeric',
    });
  }

  if (style === 'dayMonth') {
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    });
  }

  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format month key "YYYY-MM" to readable "Oct 2026".
 */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    year: 'numeric',
  });
}
