import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { createConnection } from "mysql2/promise";
import { hashPassword } from "../src/modules/auth/password.mjs";

const [command, role, emailArg, name] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();

async function accountPassword() {
  if (process.env.TUITION_ACCOUNT_PASSWORD) return process.env.TUITION_ACCOUNT_PASSWORD;
  if (process.stdin.isTTY) {
    throw new Error("Set TUITION_ACCOUNT_PASSWORD for this process or pipe the password through stdin.");
  }
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  await once(process.stdin, "end");
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.local.");
  if (command !== "migrate" && command !== "account") throw new Error("Use migrate or account.");
  const connection = await createConnection({ uri: process.env.DATABASE_URL, timezone: "Z" });
  try {
    if (command === "migrate") {
      const sql = await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8");
      for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((part) => part.trim()).filter(Boolean)) {
        await connection.query(statement);
      }
      console.log("Initial schema is ready.");
      return;
    }

    if (!["teacher", "student"].includes(role) || !email || email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name?.trim() || name.trim().length > 80) {
      throw new Error('Usage: npm run db:account -- teacher email@example.com "Full Name"');
    }
    const password = await accountPassword();
    if (password.length < 12 || password.length > 128) throw new Error("Choose a password of 12 to 128 characters.");
    await connection.execute("INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)",
      [name.trim(), email, role, await hashPassword(password)]);
    console.log("Account created for " + email + ".");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.code ?? error.message);
  process.exitCode = 1;
});
