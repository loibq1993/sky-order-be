import {
  DEFAULT_ORDER_NUMBER_PREFIX,
  normalizeOrderNumberPrefix,
} from './order-settings.util';

/** @deprecated dùng DEFAULT_ORDER_NUMBER_PREFIX */
export const ORDER_NUMBER_PREFIX = DEFAULT_ORDER_NUMBER_PREFIX;

/** Format: {prefix}{timestamp}-{3-digit-seq} e.g. CF_1780702964927-011 */
export function generateOrderNumber(
  prefix: string = DEFAULT_ORDER_NUMBER_PREFIX,
  now = Date.now(),
): string {
  const p = normalizeOrderNumberPrefix(prefix);
  const timestamp = now.toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${p}${timestamp}-${random}`;
}

export function orderNumberHasPrefix(value: string, prefix: string): boolean {
  const p = normalizeOrderNumberPrefix(prefix);
  return value.trim().toUpperCase().startsWith(p.toUpperCase());
}

/** @deprecated dùng orderNumberHasPrefix(value, prefix) */
export function isCfOrderNumber(value: string): boolean {
  return orderNumberHasPrefix(value, DEFAULT_ORDER_NUMBER_PREFIX);
}
