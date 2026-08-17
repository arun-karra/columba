const ONE_HOUR_MS = 60 * 60 * 1000;

/** Exactly one hour from now (not rounded to the next clock hour). */
export function getInOneHourFrom(now = new Date()): Date {
  return new Date(now.getTime() + ONE_HOUR_MS);
}

/** Always 9:00 AM on the next calendar day in local time. */
export function getTomorrowAtNineAmFrom(now = new Date()): Date {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

export function getQuickReminders(now = new Date()) {
  return {
    inOneHour: getInOneHourFrom(now),
    tomorrow: getTomorrowAtNineAmFrom(now),
  };
}

function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

/** Matches the Tomorrow quick-pick preset (9:00 AM next day). */
export function isTomorrowNineAm(remindAt: Date, now = new Date()): boolean {
  const expected = getTomorrowAtNineAmFrom(now);
  return (
    remindAt.getFullYear() === expected.getFullYear() &&
    remindAt.getMonth() === expected.getMonth() &&
    remindAt.getDate() === expected.getDate() &&
    remindAt.getHours() === 9 &&
    remindAt.getMinutes() === 0
  );
}

function formatTimeOfDay(date: Date): string {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const hours12 = hours24 % 12 || 12;
  const ampm = hours24 >= 12 ? 'pm' : 'am';
  const minutePart = minutes === 0 ? '00' : minutes.toString().padStart(2, '0');
  return `${hours12}:${minutePart}${ampm}`;
}

/** Countdown suffix for reminders due within the next hour. */
export function formatReminderWithinHour(msUntil: number): string {
  if (msUntil <= 0) return 'soon';

  const minutes = Math.max(1, Math.round(msUntil / 60_000));
  if (minutes >= 60) return 'in 1 hour';
  if (minutes === 1) return 'in 1 min';
  return `in ${minutes} mins`;
}

/** Calendar label for reminders more than one hour away. */
export function formatReminderScheduledAt(target: Date, now = new Date()): string {
  const time = formatTimeOfDay(target);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameLocalDay(target, now)) return `Today at ${time}`;
  if (isSameLocalDay(target, tomorrow)) return `Tomorrow at ${time}`;

  return target.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Full relative/scheduled fragment used after "Reminds" on note cards. */
export function formatReminderStatus(target: Date, now = new Date()): string {
  const msUntil = target.getTime() - now.getTime();
  if (msUntil <= 0) return 'soon';
  if (msUntil > ONE_HOUR_MS) return formatReminderScheduledAt(target, now);
  return formatReminderWithinHour(msUntil);
}
