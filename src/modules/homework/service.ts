import "server-only";
import type { PoolConnection } from "mysql2/promise";
import type { User } from "@/modules/auth/model";
import { requireRole } from "@/modules/auth/permissions";
import { pdf } from "@/modules/materials/pdf";
import { notifyStudents, notifyUser } from "@/modules/notifications/service";
import { rows, transaction, write } from "@/server/db";
import { HttpError } from "@/server/http";
import { recordId, text, time } from "@/server/validation";
export async function addAssignment(connection: PoolConnection, teacherId: number, form: FormData) {
  const title = text(form, "title", 120);
  const instructions = text(form, "instructions", 3000);
  const due = time(form, "due");
  if (due.getTime() <= Date.now()) throw new HttpError(400, "The deadline must be in the future.");
  await write("INSERT INTO assignments (teacher_id, title, instructions, due_at) VALUES (?, ?, ?, ?)",
    [teacherId, title, instructions, due], connection);
  await notifyStudents(connection, "homework", "New homework · " + title);
}

export async function submit(user: User, form: FormData) {
  requireRole(user, "student");
  const assignmentId = recordId(text(form, "assignment", 10));
  const answer = text(form, "answer", 4000, false);
  const file = await pdf(form, false);
  const removeFile = form.get("removeFile") === "on";

  await transaction(async (connection) => {
    const [assignment] = await rows<{ teacherId: number; title: string; closed: number }>(
      `SELECT a.teacher_id AS teacherId, a.title, a.due_at <= UTC_TIMESTAMP() AS closed
       FROM assignments a WHERE a.id = ? FOR UPDATE`, [assignmentId], connection,
    );
    if (!assignment) throw new HttpError(404, "Homework not found.");
    if (assignment.closed) throw new HttpError(409, "The submission deadline has passed.");
    const [existing] = await rows<{ id: number; reviewedAt: Date | null; fileName: string | null }>(
      `SELECT id, reviewed_at AS reviewedAt, file_name AS fileName
       FROM submissions WHERE assignment_id = ? AND student_id = ? FOR UPDATE`,
      [assignmentId, user.id], connection,
    );
    if (existing?.reviewedAt) throw new HttpError(409, "This submission has already been reviewed.");
    if (!answer && !file && !(existing?.fileName && !removeFile)) {
      throw new HttpError(400, "Write an answer or attach a PDF.");
    }
    if (!existing) {
      await write(
        `INSERT INTO submissions (assignment_id, student_id, answer, file_name, contents, submitted_at)
         VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [assignmentId, user.id, answer, file?.name ?? null, file?.bytes ?? null], connection,
      );
      await notifyUser(connection, assignment.teacherId, "Homework submitted · " + assignment.title);
    } else if (file || removeFile) {
      await write(
        "UPDATE submissions SET answer = ?, file_name = ?, contents = ?, submitted_at = UTC_TIMESTAMP() WHERE id = ?",
        [answer, file?.name ?? null, file?.bytes ?? null, existing.id], connection,
      );
    } else {
      await write("UPDATE submissions SET answer = ?, submitted_at = UTC_TIMESTAMP() WHERE id = ?",
        [answer, existing.id], connection);
    }
  });
}

export async function review(user: User, form: FormData) {
  requireRole(user, "teacher");
  const id = recordId(text(form, "submission", 10));
  const feedback = text(form, "feedback", 1000);
  await transaction(async (connection) => {
    const [submission] = await rows<{ studentId: number; title: string; feedback: string | null }>(
      `SELECT s.student_id AS studentId, a.title, s.feedback
       FROM submissions s JOIN assignments a ON a.id = s.assignment_id
       WHERE s.id = ? AND a.teacher_id = ? FOR UPDATE`,
      [id, user.id], connection,
    );
    if (!submission) throw new HttpError(404, "Submission not found.");
    if (submission.feedback === feedback) return;
    await write("UPDATE submissions SET feedback = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?",
      [feedback, id], connection);
    await notifyUser(connection, submission.studentId, "Homework feedback · " + submission.title);
  });
}
