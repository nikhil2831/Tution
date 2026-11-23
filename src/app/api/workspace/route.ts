import { requireUser } from "@/modules/auth/service";
import { maxFileSize } from "@/modules/materials/pdf";
import { changeWorkspace } from "@/modules/workspace/commands";
import { getWorkspace } from "@/modules/workspace/query";
import { checkOrigin, failure, formData, json } from "@/server/http";

export async function GET() {
  try {
    return json(await getWorkspace(await requireUser()));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    await changeWorkspace(user, await formData(request, maxFileSize + 64 * 1024));
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
