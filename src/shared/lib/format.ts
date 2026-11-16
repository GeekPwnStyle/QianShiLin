import type { DecimalMoneyString } from '@/src/shared/types/common';

/**
 * Parses a decimal money string (e.g., "1280.50") into integer cents to avoid JS float drift.
 */
export function moneyToCents(value: DecimalMoneyString | number): number {
  const str = typeof value === 'number' ? value.toFixed(2) : String(value).trim();
  if (!str) return 0;
  const negative = str.startsWith('-');
  const clean = negative ? str.slice(1) : str;
  const [wholePart = '0', fracPart = ''] = clean.split('.');
  const paddedFrac = (fracPart + '00').slice(0, 2);
  const cents = Number.parseInt(wholePart || '0', 10) * 100 + Number.parseInt(paddedFrac || '0', 10);
  return negative ? -cents : cents;
}

export function centsToMoneyString(cents: number): DecimalMoneyString {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

export function formatCurrency(value: DecimalMoneyString | number, symbol = '¥'): string {
  const cents = moneyToCents(value);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const formattedWhole = whole.toLocaleString('zh-CN');
  return `${negative ? '-' : ''}${symbol}${formattedWhole}.${frac}`;
}

export function maskPhone(phone: string, allowPlaintext = false): string {
  if (!phone) return '-';
  if (allowPlaintext) return phone;
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length < 7) return cleaned;
  return `${cleaned.slice(0, 3)}****${cleaned.slice(-4)}`;
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
