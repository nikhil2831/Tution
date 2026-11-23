# 02 · Authentication and authorization

**Authentication** se pata chalta hai user kaun hai. **Authorization** se pata chalta hai ki user given action kar sakta hai. Login screen [login.tsx](../../src/modules/auth/login.tsx) browser mein form feedback aur pending state manage karti hai. Session logic [service.ts](../../src/modules/auth/service.ts) par hai, role check [permissions.ts](../../src/modules/auth/permissions.ts) mein hai.

## Technology and execution flow

1. `POST /api/session` origin, multipart size, email aur password lengths check karta hai. Missing ya malformed fields par 400, wrong credentials par 401, aur repeated attempts par 429 milta hai.
2. MySQL `login_attempts` table email ke digest par 15-minute window track karti hai. Existing aur unknown accounts ke liye same error aur scrypt computation use hoti hai.
3. Node ka built-in `crypto.scrypt` random salt ke saath password se memory-intensive hash derive karta hai. [password.mjs](../../src/modules/auth/password.mjs) `timingSafeEqual` se compare karta hai. Argon2id ek alternative hai. Scrypt Node mein available hai, isliye native dependency add karne ki zarurat nahi padi. Plain password storage breach ke time reusable passwords expose karega.
4. Server random session token generate karta hai. Browser cookie mein token rakhta hai, aur MySQL mein sirf SHA-256 digest, owner aur expiry jaati hai. Cookie `HttpOnly`, `SameSite=Lax` aur HTTPS origin par `Secure` hoti hai. Origin check cross-site writes reject karta hai.
5. Har protected request par server active session lookup karta hai. Logout row delete karta hai. JWT bhi signed identity carry kar sakta hai. MySQL session immediate revocation deta hai, ek lookup ke cost par.


## Login screen and local User ID

[Login screen](../../src/modules/auth/login.tsx) uses `next/image`. Image optimizer browser width ke hisaab se image variants serve karta hai. CSS [login module](../../src/modules/auth/login.module.css) photo ka responsive area reserve karta hai, isliye image load hote waqt form jump nahi karta. Desktop par grid viewport height ke hisaab se grow karti hai aur maximum width page ko wide monitors par centered rakhti hai. Mobile breakpoint par form aur photo ek column mein stack hote hain. Password Show/Hide button sirf input ka display type change karta hai. Password verification server par hi hoti hai.

Local demo ke liye `loginEmail` server-side configured User ID ko existing account email mein resolve karta hai. Email aur alias dono same account aur rate-limit counter use karte hain. Agar email se login chale aur User ID se 400 aaye, local origin aur `.env.local` alias settings verify karo. Credentials console ya application source mein mat paste karo.

## Debugging

Agar login photo poori screen cover kare, page source mein login grid aur photo panel ki CSS classes check karo. Next.js ki Tailwind loader rule sirf global CSS entry par apply hoti hai. Isse login CSS Module apni scoped class names export karta hai.

Valid password ke baad bhi 401 aaye to login response aur `Set-Cookie` check karo. Phir browser ki next request mein cookie dekho. HTTPS origin accidentally HTTP par configured ho to cookie persist na ho sakti hai. `APP_ORIGIN` ko actual URL ke saath align karo. MySQL se sirf session existence aur expiry dekho. Password ya raw session cookie log karna avoid karo. Repeated failed login ko locally verify karne ke liye integration tests ka rate-limit case use karo.

## Practice

1. Salt ka role? **Answer** Same password ko different accounts par different stored hashes deta hai.
2. HttpOnly kyu? **Answer** Browser JavaScript session cookie directly read nahi kar sakta.
3. Logout session row kyu delete karta hai? **Answer** Old token ki next server lookup fail ho jaati hai.
4. **Debugging** 429 ke baad correct password reject kyu hua? **Solution** 15-minute window ko expire hone do, ya local test DB mein fixture throttle row clean karo.
5. **Challenge** Session duration 3 days karo. **Solution** Cookie max age aur SQL expiry dono 3 days pe set karo. Ek test mein time advance se verify karo ki expired token 401 deta hai.
