import { describe, expect, it } from "vitest";
import { daysSince, todayInTimezone } from "@/lib/format";
import { QUOTES, quoteOfTheDay } from "@/lib/quotes";

describe("dates", () => {
  it("compte les jours dans le fuseau Europe/Paris", () => {
    // 23 h 30 UTC le 13 février = déjà le 14 à Paris
    const now = new Date("2026-02-13T23:30:00Z");
    expect(todayInTimezone(now)).toBe("2026-02-14");
    expect(daysSince("2025-02-14", now)).toBe(365);
    expect(daysSince("2026-02-14", now)).toBe(0);
  });
});

describe("citation du jour", () => {
  it("est stable sur une journée et change le lendemain", () => {
    expect(quoteOfTheDay("2026-10-18")).toBe(quoteOfTheDay("2026-10-18"));
    expect(quoteOfTheDay("2026-10-18")).not.toBe(quoteOfTheDay("2026-10-19"));
    expect(QUOTES).toContain(quoteOfTheDay("1999-01-01"));
  });
});
