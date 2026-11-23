import "server-only";
import type { User } from "@/modules/auth/model";
import { requireRole } from "@/modules/auth/permissions";
import { addAssignment, review, submit } from "@/modules/homework/service";
import { pdf } from "@/modules/materials/pdf";
import { addMaterial } from "@/modules/materials/service";
import { markRead } from "@/modules/notifications/service";
import { saveClass } from "@/modules/scheduling/service";
import { transaction } from "@/server/db";
import { HttpError } from "@/server/http";
import { recordId, text } from "@/server/validation";

export async function changeWorkspace(user: User, form: FormData) {
  switch (text(form, "action", 32)) {
    case "notification-read":
      return markRead(user.id, recordId(text(form, "id", 10)));
    case "notifications-read":
      return markRead(user.id);
    case "submission-save":
      return submit(user, form);
    case "submission-review":
      return review(user, form);
    case "class-save":
      requireRole(user, "teacher");
      return transaction((connection) => saveClass(connection, user.id, form));
    case "assignment-create":
      requireRole(user, "teacher");
      return transaction((connection) => addAssignment(connection, user.id, form));
    case "material-create": {
      requireRole(user, "teacher");
      const file = await pdf(form);
      if (!file) throw new HttpError(400, "Choose a PDF to upload.");
      return transaction((connection) => addMaterial(connection, user.id, form, file));
    }
    default:
      throw new HttpError(400, "Choose a supported action.");
  }
}
