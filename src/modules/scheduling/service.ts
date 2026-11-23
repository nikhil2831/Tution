import "server-only";
import type { PoolConnection } from "mysql2/promise";
import { rows, write } from "@/server/db";
import { HttpError } from "@/server/http";
import { recordId, text, time } from "@/server/validation";
import { notifyStudents } from "@/modules/notifications/service";
function meetingUrl(form: FormData) {
  const value = text(form, "meeting link", 800, false);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && url.href.length <= 800) return url.href;
  } catch {
    // The validation message below covers invalid and unsupported URLs.
  }
  throw new HttpError(400, "Enter a valid HTTPS meeting link.");
}

export async function saveClass(connection: PoolConnection, teacherId: number, form: FormData) {
  const title = text(form, "title", 120);
  const starts = time(form, "starts");
  const ends = time(form, "ends");
  if (starts >= ends) throw new HttpError(400, "The class must end after it starts.");
  const location = text(form, "location", 240);
  const link = meetingUrl(form);
  const id = text(form, "id", 10, false);
  if (id) {
    const classId = recordId(id);
    const [existing] = await rows("SELECT id FROM classes WHERE id = ? AND teacher_id = ?", [classId, teacherId], connection);
    if (!existing) throw new HttpError(404, "Class not found.");
    const result = await write(
      `UPDATE classes SET title = ?, starts_at = ?, ends_at = ?, location = ?, meeting_url = ?
       WHERE id = ? AND teacher_id = ?
         AND NOT (title = CAST(? AS BINARY) AND starts_at = ? AND ends_at = ? AND location = CAST(? AS BINARY) AND meeting_url <=> ?)`,
      [title, starts, ends, location, link, classId, teacherId, title, starts, ends, location, link], connection,
    );
    if (!result.affectedRows) return;
  } else {
    await write(
      "INSERT INTO classes (teacher_id, title, starts_at, ends_at, location, meeting_url) VALUES (?, ?, ?, ?, ?, ?)",
      [teacherId, title, starts, ends, location, link], connection,
    );
  }
  await notifyStudents(connection, "schedule", (id ? "Class updated · " : "Class scheduled · ") + title);
}
