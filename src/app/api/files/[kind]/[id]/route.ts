import { requireUser } from "@/modules/auth/service";
import { getSubmissionFile } from "@/modules/homework/repository";
import { getMaterialFile } from "@/modules/materials/repository";
import { HttpError, failure, privateHeaders } from "@/server/http";
import { recordId } from "@/server/validation";

export async function GET(_request: Request, context: RouteContext<"/api/files/[kind]/[id]">) {
  try {
    const user = await requireUser();
    const { kind, id } = await context.params;
    const key = recordId(id);
    const file = kind === "material" ? await getMaterialFile(user, key)
      : kind === "submission" ? await getSubmissionFile(user, key)
      : undefined;
    if (!file) throw new HttpError(404, "File not found.");

    return new Response(new Uint8Array(file.contents), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${file.fileName.replace(/[^a-zA-Z0-9._ -]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
