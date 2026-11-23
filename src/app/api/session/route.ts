import { signIn, signOut } from "@/modules/auth/service";
import { checkOrigin, failure, formData, json } from "@/server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await signIn(request, await formData(request, 4096));
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    await signOut(request);
    return new Response(null, { status: 204 });
  } catch (error) {
    return failure(error);
  }
}
