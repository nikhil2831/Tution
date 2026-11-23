import "server-only";
import { HttpError } from "@/server/http";
import type { User } from "./model";

export function requireRole(user: User, role: User["role"]) {
  if (user.role !== role) throw new HttpError(403, "Your account cannot make this change.");
}
