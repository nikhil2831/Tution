import "server-only";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const privateHeaders = { "Cache-Control": "private, no-store" };

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}

export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") {
    return json({ error: "This record already exists." }, 409);
  }
  console.error("Tuition request failed", error instanceof Error && "code" in error ? error.code : error);
  return json({ error: "The workspace is temporarily unavailable. Please try again." }, 503);
}

export function requestOrigin(request: Request) {
  return new URL(process.env.APP_ORIGIN || request.url).origin;
}

export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== requestOrigin(request)) {
    throw new HttpError(403, "This request must come from the tuition website.");
  }
}

export function isEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function formData(request: Request, limit: number) {
  const length = Number(request.headers.get("content-length"));
  if (length > limit) throw new HttpError(413, "The upload is too large.");
  const type = request.headers.get("content-type") || "";
  if (!type.startsWith("multipart/form-data;")) throw new HttpError(415, "Expected form data.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "The form is empty.");

  const chunks: Uint8Array<ArrayBufferLike>[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new HttpError(413, "The upload is too large.");
    }
    chunks.push(value);
  }

  try {
    return await new Response(Buffer.concat(chunks, total), {
      headers: { "Content-Type": type },
    }).formData();
  } catch {
    throw new HttpError(400, "The form could not be read.");
  }
}
