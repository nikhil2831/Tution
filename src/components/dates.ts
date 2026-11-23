const timeZone = "Asia/Kolkata";

const weekday = new Intl.DateTimeFormat("en-IN", { timeZone, weekday: "short" });
const month = new Intl.DateTimeFormat("en-IN", { timeZone, month: "short" });
const day = new Intl.DateTimeFormat("en-IN", { timeZone, day: "numeric" });
const clock = new Intl.DateTimeFormat("en-IN", { timeZone, hour: "numeric", minute: "2-digit", hour12: true });
const full = new Intl.DateTimeFormat("en-IN", { timeZone, day: "numeric", month: "short", year: "numeric" });

export function clockTime(value: string) { return clock.format(new Date(value)); }
export function calendarDay(value: string) { return day.format(new Date(value)); }
export function calendarMonth(value: string) { return month.format(new Date(value)); }
export function shortDate(value: string) { const date = new Date(value); return weekday.format(date) + ", " + full.format(date); }
export function dateAndTime(value: string) { return shortDate(value) + " · " + clockTime(value) + " IST"; }

export function indiaInput(value: string) {
  return new Date(new Date(value).getTime() + 330 * 60 * 1000).toISOString().slice(0, 16);
}

export function indiaToUtc(value: string) {
  return new Date(value + "+05:30").toISOString();
}
