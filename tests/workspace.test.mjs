import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { createConnection } from "mysql2/promise";
import { hashPassword } from "../src/modules/auth/password.mjs";

const origin = new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin;
const password = randomBytes(24).toString("hex");
const tag = "Smoke " + randomBytes(7).toString("hex");
const pdf = Buffer.from("%PDF-1.7\n%%EOF\n");
const attachment = new File([pdf], "worksheet.pdf", { type: "application/pdf" });

function form(fields) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value instanceof File ? value : String(value));
  return body;
}

async function call(path, status, { cookie, method = "GET", fields, requestOrigin = origin } = {}) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (method !== "GET") headers.set("origin", requestOrigin);
  const response = await fetch(origin + path, { method, headers, body: fields ? form(fields) : undefined });
  assert.equal(response.status, status, response.status === status ? path : path + " · " + await response.text());
  return response;
}

async function login(email) {
  const response = await call("/api/session", 200, { method: "POST", fields: { identifier: email, password } });
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  return cookie.split(";")[0];
}

const workspace = async (cookie) => (await call("/api/workspace", 200, { cookie })).json();
const change = (cookie, action, fields, status = 200) =>
  call("/api/workspace", status, { cookie, method: "POST", fields: { action, ...fields } });
const timed = (hours) => new Date(Math.floor(Date.now() / 1000) * 1000 + hours * 3600_000).toISOString();

test("tuition portal workflows and permissions", { timeout: 60_000 }, async (t) => {
  assert.ok(process.env.DATABASE_URL, "Set DATABASE_URL and start the app with the same database.");
  const databaseUrl = new URL(process.env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(databaseUrl.hostname), "Use a local test database.");
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname), "Use a local test server.");
  const db = await createConnection({ uri: process.env.DATABASE_URL, timezone: "Z" });
  const ids = [];
  const identities = [];
  t.after(async () => {
    try {
      await db.execute("DELETE FROM notifications WHERE message LIKE ?", ["%· " + tag + "%"]);
      for (const id of ids) {
        await db.execute("DELETE FROM submissions WHERE student_id = ?", [id]);
        await db.execute("DELETE FROM assignments WHERE teacher_id = ?", [id]);
        await db.execute("DELETE FROM materials WHERE teacher_id = ?", [id]);
        await db.execute("DELETE FROM classes WHERE teacher_id = ?", [id]);
        await db.execute("DELETE FROM users WHERE id = ?", [id]);
      }
      for (const identity of identities) await db.execute("DELETE FROM login_attempts WHERE identity_hash = ?", [identity]);
    } finally {
      await db.end();
    }
  });

  const landing = await call("/", 200);
  const html = await landing.text();
  assert.match(html, /Welcome back\./);
  const layoutClass = /<main class="([^"]+)"><section class="/.exec(html)?.[1];
  const photoPanelClass = /<figure class="([^"]+)"><img\b/.exec(html)?.[1];
  assert.ok(layoutClass && photoPanelClass, "Login form and photo must have scoped layout classes.");

  const stylesheets = [...html.matchAll(/<link\b[^>]*href="([^"]+\.css(?:\?[^"]*)?)"/g)];
  const styles = (await Promise.all(stylesheets.map(async ([, href]) => {
    const response = await call(href.replaceAll("&amp;", "&"), 200);
    return response.text();
  }))).join("\n");
  const layoutRule = new RegExp("\\." + RegExp.escape(layoutClass) + "\\s*\\{[^}]*grid-template-columns\\s*:");
  const panelRule = new RegExp("\\." + RegExp.escape(photoPanelClass) + "\\s*\\{[^}]*position\\s*:\\s*relative");
  assert.match(styles, layoutRule, "The login grid styles must be served with the page.");
  assert.match(styles, panelRule, "The classroom image must be positioned within its panel.");
  await call("/api/workspace", 401);
  const hash = await hashPassword(password);
  async function createAccount(role, suffix) {
    const email = tag.replace(" ", "-").toLowerCase() + "-" + suffix + "@example.test";
    const [insert] = await db.execute("INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)",
      [tag + " " + suffix, email, role, hash]);
    ids.push(insert.insertId);
    identities.push(createHash("sha256").update(email).digest("hex"));
    return email;
  }
  const teacherEmail = await createAccount("teacher", "teacher");
  const secondTeacherEmail = await createAccount("teacher", "other-teacher");
  const studentEmail = await createAccount("student", "student");
  const peerEmail = await createAccount("student", "peer");

  await t.test("sign-in returns a private session and limits repeated failures", async () => {
    await call("/api/session", 403, { method: "POST", requestOrigin: "https://example.test", fields: { email: teacherEmail, password } });
    for (let i = 0; i < 5; i++) {
      await call("/api/session", 401, { method: "POST", fields: { email: peerEmail, password: "incorrect-password" } });
    }
    await call("/api/session", 429, { method: "POST", fields: { email: peerEmail, password } });
    await db.execute("DELETE FROM login_attempts WHERE identity_hash = ?", [identities.at(-1)]);
  });

  const teacher = await login(teacherEmail);
  const secondTeacher = await login(secondTeacherEmail);
  const student = await login(studentEmail);
  const peer = await login(peerEmail);
  assert.equal((await workspace(teacher)).user.role, "teacher");
  assert.equal((await workspace(student)).user.role, "student");
  const portal = await call("/", 200, { cookie: teacher });
  assert.match(await portal.text(), /Upcoming classes/);

  await t.test("teachers publish and update classes, with role and ownership checks", async () => {
    const fields = { title: tag + " class", starts: timed(2), ends: timed(3), location: "Online", "meeting link": "https://example.test/class" };
    await change(student, "class-save", fields, 403);
    await change(teacher, "class-save", { ...fields, ends: timed(1) }, 400);
    await change(teacher, "class-save", fields);
    const first = (await workspace(student)).classes.find(({ title }) => title === fields.title);
    assert.equal(first.startsAt, fields.starts.replace(".000Z", "Z"));
    await change(secondTeacher, "class-save", { ...fields, id: first.id }, 404);
    const edited = { ...fields, id: first.id, starts: timed(4), ends: timed(5), location: "Classroom 2" };
    await change(teacher, "class-save", edited);
    await change(teacher, "class-save", edited);
    const latest = await workspace(student);
    assert.equal(latest.classes.find(({ id }) => id === first.id).location, edited.location);
    assert.equal(latest.notifications.filter(({ message }) => message === "Class updated · " + fields.title).length, 1);
  });

  await t.test("publication validates PDF content and download checks the user", async () => {
    const title = tag + " notes";
    await change(teacher, "material-create", { title, file: new File(["wrong"], "fake.pdf", { type: "application/pdf" }) }, 400);
    await change(teacher, "material-create", { title, description: "Practice", file: attachment });
    const material = (await workspace(student)).materials.find((row) => row.title === title);
    assert.ok(material);
    assert.equal(material.fileSize, pdf.length);
    const fileRoute = "/api/files/material/" + material.id;
    await call(fileRoute, 401);
    await call(fileRoute, 404, { cookie: secondTeacher });
    const response = await call(fileRoute, 200, { cookie: student });
    assert.match(response.headers.get("content-disposition"), /attachment/);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
  });

  await t.test("submissions are private, idempotent per student, and locked after review", async () => {
    const title = tag + " assignment";
    await change(teacher, "assignment-create", { title, instructions: "Solve two problems.", due: timed(-1) }, 400);
    await change(teacher, "assignment-create", { title, instructions: "Solve two problems.", due: timed(24) });
    const assignment = (await workspace(student)).assignments.find((row) => row.title === title);
    assert.ok(assignment);
    await change(student, "submission-save", { assignment: assignment.id }, 400);
    await Promise.all(["first draft", "another draft"].map((answer) =>
      change(student, "submission-save", { assignment: assignment.id, answer, file: attachment })));
    const own = (await workspace(student)).submissions.filter((row) => row.assignmentId === assignment.id);
    assert.equal(own.length, 1);
    const [submission] = own;
    const peerData = await workspace(peer);
    assert.ok(!peerData.submissions.some(({ id }) => id === submission.id));
    await call("/api/files/submission/" + submission.id, 404, { cookie: peer });
    await call("/api/files/submission/" + submission.id, 404, { cookie: secondTeacher });
    await call("/api/files/submission/" + submission.id, 200, { cookie: teacher });
    await change(peer, "submission-review", { submission: submission.id, feedback: "Try again." }, 403);
    await change(secondTeacher, "submission-review", { submission: submission.id, feedback: "Try again." }, 404);
    await change(teacher, "submission-review", { submission: submission.id, feedback: "Good work." });
    const reviewed = (await workspace(student)).submissions.find(({ id }) => id === submission.id);
    assert.equal(reviewed.feedback, "Good work.");
    await change(student, "submission-save", { assignment: assignment.id, answer: "Updated" }, 409);
    await db.execute("UPDATE assignments SET due_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id = ?", [assignment.id]);
    await change(peer, "submission-save", { assignment: assignment.id, answer: "Too late" }, 409);
  });

  await t.test("mark read only affects the recipient, and sign-out revokes the token", async () => {
    const latest = await workspace(student);
    const notice = latest.notifications.find(({ message }) => message === "Homework feedback · " + tag + " assignment");
    assert.ok(notice && !notice.readAt);
    await change(peer, "notification-read", { id: notice.id });
    assert.equal((await workspace(student)).notifications.find(({ id }) => id === notice.id).readAt, null);
    await change(student, "notification-read", { id: notice.id });
    assert.ok((await workspace(student)).notifications.find(({ id }) => id === notice.id).readAt);
    await change(student, "notifications-read", {});
    assert.equal((await workspace(student)).unread, 0);
    await call("/api/session", 204, { method: "DELETE", cookie: student });
    await call("/api/workspace", 401, { cookie: student });
  });
});
