const VN_TZ = 'Asia/Ho_Chi_Minh';

/** YYYY-MM-DD in Vietnam timezone. */
export function getVietnamTodayDateString(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ }).format(now);
}

/** Start of calendar day in Vietnam (UTC+7). */
export function vietnamDayStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+07:00`);
}

/** Start of the day after `isoDate` in Vietnam — use as exclusive upper bound. */
export function vietnamDayEndExclusive(isoDate: string): Date {
  const start = vietnamDayStart(isoDate);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function isValidIsoDate(value?: string): boolean {
  if (!value?.trim()) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/** Milliseconds until next run at hour:minute in Vietnam (default 00:05). */
export function msUntilNextVnSchedule(
  hour = 0,
  minute = 5,
  now = new Date(),
): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = fmt.format(now);
  let target = new Date(`${today}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`);
  if (target.getTime() <= now.getTime()) {
    target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
  }
  return Math.max(1000, target.getTime() - now.getTime());
}
