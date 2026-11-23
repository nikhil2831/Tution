import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { rows, write, transaction } from "@/server/db";
import { HttpError, isEmail, requestOrigin } from "@/server/http";
import { verifyPassword } from "./password.mjs";
import type { User } from "./model";

export const sessionCookie = "tuition_session";
const sessionLifetime = 7 * 24 * 60 * 60;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function currentUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const [user] = await rows<User>(
    `SELECT u.id, u.name, u.role FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()`,
    [digest(token)],
  );
  return user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}

function cookieOptions(request: Request, maxAge: number) {
  return {
    httpOnly: true,
    secure: requestOrigin(request).startsWith("https:"),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function loginEmail(request: Request, value: FormDataEntryValue | null) {
  const identifier = typeof value === "string" ? value.trim().toLowerCase() : "";
  const alias = process.env.TUITION_LOCAL_LOGIN_ID?.trim().toLowerCase();
  if (!alias || identifier !== alias) return identifier;

  const hostname = new URL(requestOrigin(request)).hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "[::1]") return identifier;

  return process.env.TUITION_LOCAL_LOGIN_EMAIL?.trim().toLowerCase() || identifier;
}

export async function signIn(request: Request, form: FormData) {
  const email = loginEmail(request, form.get("identifier") ?? form.get("email"));
  const password = form.get("password");
  if (!isEmail(email) || typeof password !== "string" || !password || password.length > 128) {
    throw new HttpError(400, "Enter a valid email or user ID and password.");
  }

  const identity = digest(email);
  await write(
    `INSERT INTO login_attempts (identity_hash, attempts, reset_at)
     VALUES (?, 1, UTC_TIMESTAMP() + INTERVAL 15 MINUTE)
     ON DUPLICATE KEY UPDATE
       attempts = IF(reset_at <= UTC_TIMESTAMP(), 1, LEAST(attempts + 1, 6)),
       reset_at = IF(reset_at <= UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL 15 MINUTE, reset_at)`,
    [identity],
  );
  const [limit] = await rows<{ attempts: number }>(
    "SELECT attempts FROM login_attempts WHERE identity_hash = ?",
    [identity],
  );
  if (limit?.attempts > 5) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");

  const [user] = await rows<{ id: number; passwordHash: string }>(
    "SELECT id, password_hash AS passwordHash FROM users WHERE email = ?",
    [email],
  );
  if (!(await verifyPassword(password, user?.passwordHash)) || !user) {
    throw new HttpError(401, "The email, user ID, or password is incorrect.");
  }

  const jar = await cookies();
  const previous = jar.get(sessionCookie)?.value;
  const token = randomBytes(32).toString("hex");
  await transaction(async (connection) => {
    if (previous) await write("DELETE FROM sessions WHERE token_hash = ?", [digest(previous)], connection);
    await write("DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP() LIMIT 100", [], connection);
    await write("DELETE FROM login_attempts WHERE reset_at <= UTC_TIMESTAMP() LIMIT 100", [], connection);
    await write("DELETE FROM login_attempts WHERE identity_hash = ?", [identity], connection);
    await write(
      "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL 7 DAY)",
      [digest(token), user.id], connection,
    );
  });
  jar.set(sessionCookie, token, cookieOptions(request, sessionLifetime));
}

export async function signOut(request: Request) {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) await write("DELETE FROM sessions WHERE token_hash = ?", [digest(token)]);
  jar.set(sessionCookie, "", cookieOptions(request, 0));
}
