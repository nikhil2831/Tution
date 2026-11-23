import type { User } from "@/modules/auth/model";
import type { Assignment, Submission } from "@/modules/homework/model";
import type { Material } from "@/modules/materials/model";
import type { Notice } from "@/modules/notifications/model";
import type { ClassMeeting } from "@/modules/scheduling/model";

export type Section = "overview" | "schedule" | "materials" | "homework" | "notifications";
export type Workspace = {
  user: User;
  classes: ClassMeeting[];
  materials: Material[];
  assignments: Assignment[];
  submissions: Submission[];
  notifications: Notice[];
  unread: number;
  now: string;
};
