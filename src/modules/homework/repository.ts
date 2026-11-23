import "server-only";
import type { User } from "@/modules/auth/model";
import { isoUtc, rows } from "@/server/db";
import type { Assignment, Submission } from "./model";

export function listAssignments(user: User) {
  const teacher = user.role === "teacher";
  return rows<Assignment>(
    `SELECT id, title, instructions, ${isoUtc("due_at")} AS dueAt
     FROM assignments ${teacher ? "WHERE teacher_id = ?" : ""} ORDER BY due_at, id`,
    teacher ? [user.id] : [],
  );
}

function submissionScope(user: User) {
  return user.role === "teacher" ? "a.teacher_id = ?" : "s.student_id = ?";
}

export function listSubmissions(user: User) {
  return rows<Submission>(
    `SELECT s.id, s.assignment_id AS assignmentId, u.name AS studentName, s.answer,
       s.file_name AS fileName, ${isoUtc("s.submitted_at")} AS submittedAt,
       s.feedback, ${isoUtc("s.reviewed_at")} AS reviewedAt
     FROM submissions s JOIN assignments a ON a.id = s.assignment_id
     JOIN users u ON u.id = s.student_id
     WHERE ${submissionScope(user)} ORDER BY s.submitted_at DESC, s.id DESC`, [user.id],
  );
}

export async function getSubmissionFile(user: User, id: number) {
  const [file] = await rows<{ fileName: string; contents: Buffer }>(
    `SELECT s.file_name AS fileName, s.contents FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id
     WHERE s.id = ? AND s.contents IS NOT NULL AND ${submissionScope(user)}`, [id, user.id],
  );
  return file;
}
