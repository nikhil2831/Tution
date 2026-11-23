import "server-only";
import { HttpError } from "./http";

export function text(form: FormData, key: string, max: number, required = true) {
  const value = form.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  if ((required && !trimmed) || trimmed.length > max) {
    throw new HttpError(400, `Check the ${key} field. It accepts up to ${max} characters.`);
  }
  return trimmed;
}

export function recordId(value: string) {
  if (!/^[1-9]\d{0,9}$/.test(value) || Number(value) > 4294967295) {
    throw new HttpError(400, "Choose a valid record.");
  }
  return Number(value);
}

export function time(form: FormData, key: string) {
  const value = text(form, key, 24);
  const date = new Date(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(date.getTime()) || date.toISOString() !== value ||
      date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 9998) {
    throw new HttpError(400, "Choose a valid date and time.");
  }
  return date;
}
