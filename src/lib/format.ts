import { cache } from "react";
import { APP_TIMEZONE } from "@/lib/env";

const LOCALE = "fr-FR";

/** "samedi 14 février 2026" — accepte "2026-02-14" ou un timestamp ISO */
export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: isDateOnly(value) ? "UTC" : APP_TIMEZONE,
  }).format(toDate(value));
}

/** "14 févr. 2026" */
export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: isDateOnly(value) ? "UTC" : APP_TIMEZONE,
  }).format(toDate(value));
}

/** "sam. 14 févr. à 19:30" */
export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(new Date(value));
}

export function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(amount);
}

/** Nombre de jours pleins entre une date (AAAA-MM-JJ) et aujourd'hui, dans le fuseau de l'app */
export function daysSince(dateOnly: string, now = new Date()) {
  const today = todayInTimezone(now);
  const start = Date.UTC(...splitDate(dateOnly));
  const end = Date.UTC(...splitDate(today));
  return Math.floor((end - start) / 86_400_000);
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau de l'app */
export function todayInTimezone(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(now);
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${new Intl.NumberFormat(LOCALE).format(n)} ${Math.abs(n) > 1 ? pluralForm : singular}`;
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDate(value: string) {
  return isDateOnly(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
}

function splitDate(value: string): [number, number, number] {
  const [y, m, d] = value.split("-").map(Number);
  return [y, m - 1, d];
}

/** Instant de la requête en cours (identique pour tout le rendu) */
export const requestTime = cache(() => Date.now());
