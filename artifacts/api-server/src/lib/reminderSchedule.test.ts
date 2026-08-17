import { describe, expect, it } from "vitest";
import {
  formatReminderScheduledAt,
  formatReminderStatus,
  formatReminderWithinHour,
  getInOneHourFrom,
  getTomorrowAtNineAmFrom,
  isTomorrowNineAm,
} from "../../../ios-app/utils/reminderSchedule";

describe("reminderSchedule", () => {
  it("schedules in one hour as now plus 60 minutes", () => {
    const now = new Date("2026-08-17T20:13:00");
    const inOneHour = getInOneHourFrom(now);
    expect(inOneHour.getTime() - now.getTime()).toBe(60 * 60 * 1000);
    expect(inOneHour.getMinutes()).toBe(13);
  });

  it("schedules tomorrow at 9:00 AM local", () => {
    const now = new Date("2026-08-17T20:13:00");
    const tomorrow = getTomorrowAtNineAmFrom(now);
    expect(tomorrow.getDate()).toBe(18);
    expect(tomorrow.getHours()).toBe(9);
    expect(tomorrow.getMinutes()).toBe(0);
    expect(isTomorrowNineAm(tomorrow, now)).toBe(true);
  });

  it("uses countdown within the next hour", () => {
    const now = new Date("2026-08-17T20:00:00");
    const target = new Date("2026-08-17T20:33:00");
    expect(formatReminderWithinHour(target.getTime() - now.getTime())).toBe("in 33 mins");
    expect(formatReminderStatus(target, now)).toBe("in 33 mins");
  });

  it("shows in 1 hour at the one-hour boundary", () => {
    const now = new Date("2026-08-17T20:00:00");
    const target = new Date("2026-08-17T21:00:00");
    expect(formatReminderStatus(target, now)).toBe("in 1 hour");
  });

  it("uses Today/Tomorrow labels when more than an hour away", () => {
    const now = new Date("2026-08-17T20:00:00");
    const laterToday = new Date("2026-08-17T21:01:00");
    const tomorrowMorning = getTomorrowAtNineAmFrom(now);

    expect(formatReminderScheduledAt(laterToday, now)).toBe("Today at 9:01pm");
    expect(formatReminderScheduledAt(tomorrowMorning, now)).toBe("Tomorrow at 9:00am");
    expect(formatReminderStatus(laterToday, now)).toBe("Today at 9:01pm");
    expect(formatReminderStatus(tomorrowMorning, now)).toBe("Tomorrow at 9:00am");
  });
});
