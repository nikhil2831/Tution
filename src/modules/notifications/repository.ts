import "server-only";
import { isoUtc, rows } from "@/server/db";
import type { Notice } from "./model";

export function listNotices(userId: number) {
  return rows<Notice>(
    `SELECT id, category, message, ${isoUtc("created_at")} AS createdAt,
       ${isoUtc("read_at")} AS readAt FROM notifications
     WHERE user_id = ? ORDER BY read_at IS NOT NULL, created_at DESC, id DESC LIMIT 50`, [userId],
  );
}

export async function unreadCount(userId: number) {
  const [unread] = await rows<{ count: number }>(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL", [userId],
  );
  return Number(unread?.count ?? 0);
}
