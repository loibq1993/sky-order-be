import { OrderStatus } from './orders.dto';

const CLOSED_STATUSES = new Set<string>([
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
]);

/** Thanh toán đã kết thúc (không còn chờ thu / QR). */
export const CLOSED_PAYMENT_STATUSES = new Set(['paid', 'cancelled']);

/** Trạng thái thanh toán ghi nhận nợ xấu (đóng ca chưa thu, thanh toán thất bại). */
export const BAD_DEBT_PAYMENT_STATUSES = ['cancelled', 'failed'] as const;

/** Đơn còn mở và chưa thanh toán (client + tạo đơn mới). */
export function isUnpaidOpenOrder(
  status: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  const s = (status ?? '').toLowerCase();
  if (!s || CLOSED_STATUSES.has(s)) return false;
  const ps = (paymentStatus ?? 'unpaid').toLowerCase();
  if (CLOSED_PAYMENT_STATUSES.has(ps)) return false;
  return true;
}
