import { TenantProductPromotion } from '../entities/tenant/tenant-product-promotion.entity';

const TENANT_TZ = 'Asia/Ho_Chi_Minh';

export function getVNTimeParts(now: Date): { dayOfWeek: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TENANT_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    dayOfWeek: dayMap[weekday] ?? new Date(now).getDay(),
    minutes: hour * 60 + minute,
  };
}

export function parseTimeHHmm(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return -1;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

export function isWithinTimeWindow(
  minutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes <= endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes;
  }
  return minutes >= startMinutes || minutes < endMinutes;
}

export function isHappyHourActive(
  promo: TenantProductPromotion,
  now = new Date(),
): boolean {
  if (promo.promotionType !== 'happy_hour') return true;
  if (!promo.timeStart || !promo.timeEnd) return false;

  const start = parseTimeHHmm(promo.timeStart);
  const end = parseTimeHHmm(promo.timeEnd);
  if (start < 0 || end < 0) return false;

  const { dayOfWeek, minutes } = getVNTimeParts(now);
  if (promo.daysOfWeek?.trim()) {
    const allowed = promo.daysOfWeek
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (allowed.length > 0 && !allowed.includes(dayOfWeek)) return false;
  }

  return isWithinTimeWindow(minutes, start, end);
}

export function formatHappyHourWindow(promo: TenantProductPromotion): string {
  const days =
    promo.daysOfWeek?.trim()
      ? promo.daysOfWeek
          .split(',')
          .map((d) => {
            const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            return labels[parseInt(d.trim(), 10)] ?? d;
          })
          .join(', ')
      : 'Mọi ngày';
  return `${days} ${promo.timeStart}–${promo.timeEnd}`;
}
