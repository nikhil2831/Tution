import "server-only";
import type { User } from "@/modules/auth/model";
import { isoUtc, rows } from "@/server/db";
import type { ClassMeeting } from "./model";

export function listClasses(user: User) {
  const teacher = user.role === "teacher";
  return rows<ClassMeeting>(
    `SELECT id, title, ${isoUtc("starts_at")} AS startsAt,
       ${isoUtc("ends_at")} AS endsAt, location, meeting_url AS meetingUrl
     FROM classes ${teacher ? "WHERE teacher_id = ?" : ""} ORDER BY starts_at, id`,
    teacher ? [user.id] : [],
  );
}
