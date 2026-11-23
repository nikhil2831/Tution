import "server-only";
import type { User } from "@/modules/auth/model";
import { listAssignments, listSubmissions } from "@/modules/homework/repository";
import { listMaterials } from "@/modules/materials/repository";
import { listNotices, unreadCount } from "@/modules/notifications/repository";
import { listClasses } from "@/modules/scheduling/repository";
import type { Workspace } from "./model";

export async function getWorkspace(user: User): Promise<Workspace> {
  const [classes, materials, assignments, submissions, notifications, unread] = await Promise.all([
    listClasses(user), listMaterials(user), listAssignments(user), listSubmissions(user),
    listNotices(user.id), unreadCount(user.id),
  ]);
  return { user, classes, materials, assignments, submissions, notifications, unread, now: new Date().toISOString() };
}
