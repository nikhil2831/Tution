import "server-only";
import type { PoolConnection } from "mysql2/promise";
import { write } from "@/server/db";
import { text } from "@/server/validation";
import { notifyStudents } from "@/modules/notifications/service";
import type { pdf } from "./pdf";
export async function addMaterial(connection: PoolConnection, teacherId: number, form: FormData, file: NonNullable<Awaited<ReturnType<typeof pdf>>>) {
  const title = text(form, "title", 120);
  const description = text(form, "description", 500, false);
  await write(
    `INSERT INTO materials (teacher_id, title, description, file_name, file_size, contents, created_at)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [teacherId, title, description, file.name, file.bytes.length, file.bytes], connection,
  );
  await notifyStudents(connection, "materials", "New study material · " + title);
}
