import "server-only";
import type { PoolConnection } from "mysql2/promise";
import { write } from "@/server/db";
import type { Category } from "./model";

export async function notifyStudents(connection: PoolConnection, category: Category, message: string) {
  await write(
    `INSERT INTO notifications (user_id, category, message, created_at)
     SELECT id, ?, ?, UTC_TIMESTAMP() FROM users WHERE role = 'student'`,
    [category, message], connection,
  );
}

export async function notifyUser(connection: PoolConnection, userId: number, message: string) {
  await write(
    `INSERT INTO notifications (user_id, category, message, created_at)
     VALUES (?, 'homework', ?, UTC_TIMESTAMP())`, [userId, message], connection,
  );
}

export async function markRead(userId: number, id?: number) {
  if (id === undefined) {
    await write("UPDATE notifications SET read_at = UTC_TIMESTAMP() WHERE user_id = ? AND read_at IS NULL", [userId]);
    return;
  }
  await write("UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP()) WHERE id = ? AND user_id = ?", [id, userId]);
}
