/** Prefix for all new order numbers (SePay transfer content, receipts, QR). */
export const ORDER_NUMBER_PREFIX = 'CF_';

/** Format: CF_{timestamp}-{3-digit-seq} e.g. CF_1780702964927-011 */
export function generateOrderNumber(now = Date.now()): string {
  const timestamp = now.toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${ORDER_NUMBER_PREFIX}${timestamp}-${random}`;
}

export function isCfOrderNumber(value: string): boolean {
  return value.trim().toUpperCase().startsWith(ORDER_NUMBER_PREFIX.toUpperCase());
}
