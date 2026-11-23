# 03 · MySQL database design

[schema](../../db/001_initial.sql) initial migration hai. [db.mjs](../../scripts/db.mjs) statements execute karta hai. [db.ts](../../src/server/db.ts) pooled MySQL connections aur transactions provide karta hai. Connection pool existing TCP connections reuse karta hai. `mysql2.execute` SQL aur bound values separate bhejta hai, aur MySQL prepared statement use karta hai. String concatenation user input ke saath SQL injection ka risk laata hai. Prisma schema-generated queries aur migration history offer karta hai. Direct SQL choose kiya kyunki authorization joins aur constraints yahan learning ka part hain. PostgreSQL bhi transactions aur relational integrity deta hai. MySQL local machine par available tha aur existing skill set ke saath fit hai.

| Table | Important columns and relationships |
| --- | --- |
| `users` | `id` is PK. `email` unique identity hai. `role` teacher/student hai. `password_hash` derived password store karta hai. |
| `sessions` | `token_hash` PK, `user_id` FK and `expires_at` expiry. Ek user ke multiple sessions ho sakte hain. User delete par sessions cascade. |
| `login_attempts` | `identity_hash` PK. `attempts` aur `reset_at` retry window record karte hain. Unknown email bhi limit ho sakta hai. |
| `classes` | `id` PK, `teacher_id` FK, title/location aur UTC start/end. DB check end ko start se baad rakhta hai. |
| `materials` | `id` PK, `teacher_id` FK, filename, size aur `contents` PDF bytes. List query metadata leti hai. |
| `assignments` | `id` PK, `teacher_id` FK, instructions aur UTC `due_at`. Ek teacher multiple assignments publish kar sakta hai. |
| `submissions` | `assignment_id` aur `student_id` FKs. Pair unique hai. Optional attachment aur feedback same record par hain. Assignment delete par submissions cascade. |
| `notifications` | `user_id` user FK hai. `read_at` null ho to unread. User delete par notifications cascade. |

Content author aur submission student FKs deletion restrict karte hain jab related records exist karte hain. User name ko content rows mein repeat karne ki jagah ID store karke join karte hain. Session expiry index clean-up help karta hai. `(teacher_id, due_at)` dono query filter aur ordering support karta hai. Notifications fetch up to 50 rows. Full workspace collection small deployment ke liye reads simple rakhti hai. Larger records ke liye cursor pagination aur per-section reads response size bound kar sakte hain.

```sql
SELECT id, title, due_at FROM assignments WHERE teacher_id = 7 ORDER BY due_at
UPDATE notifications SET read_at = UTC_TIMESTAMP() WHERE id = 21 AND user_id = 12
```

App in constant IDs ki jagah `?` placeholders bind karti hai. Inserts services mein, SELECT repos mein, updates role-checked services mein aur session DELETE auth service mein milenge.

## Debugging and practice

Agar `ECONNREFUSED` aaye to MySQL process, host aur port check karo. `ER_ACCESS_DENIED_ERROR` mein DB user ke grants aur password inspect karo. `ER_NO_SUCH_TABLE` mein `npm run db:migrate` aur app ki database name verify karo. `DATABASE_URL` ya password logs mein paste mat karo.

1. PK aur FK ka difference? **Answer** PK row ki identity hai. FK related valid row ka reference enforce karta hai.
2. Composite unique key kya protect karti hai? **Answer** Ek assignment ke liye same student ki duplicate rows.
3. Index ka tradeoff? **Answer** Reads faster ho sakti hain. Disk aur writes ka cost badhta hai.
4. **Debugging** File upload par packet error. **Solution** MySQL `max_allowed_packet`, app upload limit aur actual file size compare karo.
5. **Challenge** Kisi student ka unread count query likho. **Solution** `SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL` use karo, user ID session se lo.
