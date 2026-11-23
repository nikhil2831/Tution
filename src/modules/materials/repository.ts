import "server-only";
import type { User } from "@/modules/auth/model";
import { isoUtc, rows } from "@/server/db";
import type { Material } from "./model";

export function listMaterials(user: User) {
  const teacher = user.role === "teacher";
  return rows<Material>(
    `SELECT id, title, description, file_name AS fileName, file_size AS fileSize,
       ${isoUtc("created_at")} AS createdAt
     FROM materials ${teacher ? "WHERE teacher_id = ?" : ""} ORDER BY created_at DESC, id DESC`,
    teacher ? [user.id] : [],
  );
}

export async function getMaterialFile(user: User, id: number) {
  const teacher = user.role === "teacher";
  const [file] = await rows<{ fileName: string; contents: Buffer }>(
    `SELECT file_name AS fileName, contents FROM materials WHERE id = ? ${teacher ? "AND teacher_id = ?" : ""}`,
    teacher ? [id, user.id] : [id],
  );
  return file;
}
