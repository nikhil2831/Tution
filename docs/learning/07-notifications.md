# 07 · In-app notifications

## Implementation

Scheduling, materials aur homework writes [notifications service](../../src/modules/notifications/service.ts) call karte hain. `notifyStudents` ek SQL `INSERT … SELECT` mein current student accounts ko per-user rows deti hai. Student submission teacher ko alert bhejti hai. Feedback sirf submitting student ko jaata hai. Feature write aur event same transaction mein commit hote hain. `notifications.id` PK hai aur `user_id` users table ki FK hai. Read status `read_at` mein hai. `(user_id, read_at)` index recipient aur unread filters support karta hai. Recipient delete hone par database notices cascade karta hai.

[repository](../../src/modules/notifications/repository.ts) current user ki 50 recent notices aur unread count query karti hai. [screen](../../src/modules/notifications/screen.tsx) mark read aur mark all read forms provide karti hai. `markRead` update ko session user ID se scope karti hai. Browser explicit Refresh ya save ke baad latest snapshot fetch karta hai. Polling periodic requests bhejta hai. Push or WebSockets faster delivery de sakte hain, saath mein connection lifecycle aur background delivery setup add hota hai. Current scope ke liye in-app inbox aur manual refresh sufficient hain.

## Debugging

Student ko class alert missing ho to student ke user ID se notification row check karo. Phir teacher action ka response aur server logs dekho. Class save rollback hui to notice bhi rollback hogi. User account class publish ke baad create hua ho to historical notice generate nahi hoti. Class schedule phir bhi shared view mein available hai. Wrong recipient test se access check repeat karo.

## Practice

1. Per-user row kyu? **Answer** Har recipient ka read timestamp independently store hota hai.
2. Transaction mein notification kyu? **Answer** Failed publish ki notification commit nahi honi chahiye.
3. Mark all read mein user ID kyu? **Answer** Query update ko current user ki rows tak limit karne ke liye.
4. **Debugging** Badge update nahi hua. **Solution** GET response mein `unread` aur SQL null `read_at` count compare karo.
5. **Challenge** Inbox mein unread-only view add karo. **Solution** UI filter ke liye `notifications.filter(item => !item.readAt)` use karo. Total badge API ke `unread` se rakho, kyunki list bounded hai.
