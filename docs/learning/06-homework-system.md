# 06 · Homework

## Implementation

[Homework screen](../../src/modules/homework/screen.tsx) teacher ko assignment publish aur feedback form deta hai. Student text answer, PDF ya dono submit kar sakta hai. [service](../../src/modules/homework/service.ts) role, assignment deadline aur existing review check karti hai. Student ID server session se aati hai. `submissions` table ka unique assignment–student pair one-to-many relationships ko combine karke one submission per student enforce karta hai. First save INSERT karta hai. Deadline aur review se pehle agla save usi row ko UPDATE karta hai. PDF ke bina text update existing PDF preserve karta hai.

Submission transaction assignment aur existing row lock karti hai. Do overlapping requests same student ke liye serially resolve hoti hain. Unique constraint final database protection hai. Alternative har retry mein new submission version create karna hai. Usse revision history milti hai aur UI/reporting complexity badhti hai. Review flow teacher ownership verify karne ke baad feedback aur timestamp save karta hai. [repository](../../src/modules/homework/repository.ts) student ke liye `s.student_id` aur teacher ke liye `a.teacher_id` filter lagati hai. Private PDF same rule follow karta hai. Isse ek student ke doosre student ki submission dekhne ka IDOR risk control hota hai.

## Debugging

Double submit reproduce karne ke liye test suite ka concurrent-save case run karo. DB mein assignment/student pair count 1 hona chahiye. Conflict ke time first check karo ki deadline pass hui ya teacher ne review kiya. 409 ka reason response mein milta hai. 404 par teacher ownership relation check karo. Feedback JSX text ke roop mein render hota hai, isliye React usse escape karta hai. Raw HTML render karne par XSS risk add ho sakta hai.

## Practice

1. Unique pair ke dono fields kyu chahiye? **Answer** Student multiple assignments kar sakta hai aur assignment ko multiple students submit kar sakte hain.
2. Deadline browser ki clock se enforce kyu na karein? **Answer** Device time user change kar sakta hai. Server/DB deadline final decision deti hai.
3. Review ke baad writes lock kyu? **Answer** Feedback exactly us answer version se attach rahe jise teacher ne dekha.
4. **Debugging** Text update ke baad PDF missing. **Solution** Request mein `removeFile` aur file part check karo. Normal text update sirf answer aur timestamp update kare.
5. **Challenge** Overview mein reviewed submissions count dikhao. **Solution** `data.submissions.filter(item => item.reviewedAt).length` se existing DTO par count banao.
