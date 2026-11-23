import "server-only";
import { HttpError } from "@/server/http";

export const maxFileSize = 5 * 1024 * 1024;

export async function pdf(form: FormData, required = true) {
  const file = form.get("file");
  if (!file || (typeof file !== "string" && file.size === 0)) {
    if (!required) return null;
    throw new HttpError(400, "Choose a PDF to upload.");
  }
  if (typeof file === "string" || file.size > maxFileSize || !/\.pdf$/i.test(file.name)) {
    throw new HttpError(400, "Choose a PDF of 5 MB or less.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new HttpError(400, "The attachment could not be recognized as a PDF.");
  }
  const stem = file.name.slice(0, -4).replace(/[^a-zA-Z0-9._ -]/g, "_").trim().slice(0, 140);
  return { name: (stem || "document") + ".pdf", bytes };
}
