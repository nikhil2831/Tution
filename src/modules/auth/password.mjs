import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const dummy = "00000000000000000000000000000000:" + "0".repeat(128);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, options);
  return salt + ":" + key.toString("hex");
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = (stored ?? dummy).split(":");
  const key = await derive(password, salt, 64, options);
  return timingSafeEqual(key, Buffer.from(hash, "hex")) && Boolean(stored);
}
