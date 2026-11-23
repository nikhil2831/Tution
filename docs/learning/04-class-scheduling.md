# 04 · Class scheduling

## Implementation

Teachers `ScheduleScreen` se class publish ya edit karte hain. Students same view mein class timing, location aur optional meeting link dekhte hain. [screen](../../src/modules/scheduling/screen.tsx) form ka `datetime-local` input IST leta hai. [dates.ts](../../src/components/dates.ts) `Intl.DateTimeFormat` se display zone set karta hai aur form time ko UTC mein convert karta hai. Browser locale par leave karna global deployment ke liye convenient ho sakta hai. Is workspace mein fixed IST se different device time zones par same class time dikhta hai.

`MutationForm` POST karta hai. `changeWorkspace` teacher role check karta hai. [service](../../src/modules/scheduling/service.ts) start/end order validate karta hai, HTTPS meeting URL accept karta hai aur edits mein teacher ID match karta hai. Missing record par 404 aata hai. Class write aur student notifications same MySQL transaction mein commit hote hain. [repository](../../src/modules/scheduling/repository.ts) UTC ISO strings read karti hai. Teacher ko apni classes aur student ko published classes milti hain. `classes.id` PK hai aur `teacher_id` users FK hai. Teacher + start time index ownership query ki ordering help karta hai.

## Debugging

Teacher timing change kare aur student ko old time dikhe to pehle teacher ka POST aur student ka Refresh GET check karo. GET mein new UTC value aur screen par expected IST compare karo. `2026-12-02T10:30:00Z` IST mein 4:00 pm hai. Save aur notification transaction mein hain, aur UI manually refresh ho sakti hai. Database mein local time dobara convert karne se offset double lagega.

## Practice

1. UTC storage kyu? **Answer** Same instant ko DB aur server time zone se independent interpret karne ke liye.
2. Browser validation sufficient hai? **Answer** Server crafted requests bhi receive karta hai, isliye server end-after-start check zaroori hai.
3. Edit mein teacher ID kyu? **Answer** Class ID identify karta hai. Teacher ID modification permission prove karti hai.
4. **Debugging** Link request 400 deti hai. **Solution** Link field ka parsed protocol verify karo. HTTPS URL use karo.
5. **Challenge** Overview mein only next class dikhao. **Solution** Sorted upcoming list ka `slice(0, 1)` use karo aur existing empty state keep karo.
