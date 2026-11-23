# 05 · Study materials

## Implementation

Teacher [MaterialsScreen](../../src/modules/materials/screen.tsx) se PDF upload karta hai. Browser `FormData` text aur file ko multipart parts ke roop mein encode karta hai. [HTTP parser](../../src/server/http.ts) body bytes cap karta hai. [PDF validator](../../src/modules/materials/pdf.ts) PDF extension, 5 MiB limit aur magic bytes check karta hai. Format signature se basic type check hota hai. Full document analysis ke liye separate parser ya scanning service chahiye. [service](../../src/modules/materials/service.ts) metadata aur bytes MySQL `MEDIUMBLOB` mein insert karta hai, aur transaction mein student alerts create karta hai.

List screen [repository](../../src/modules/materials/repository.ts) se title, description, filename aur size leti hai. Download link [file route](../../src/app/api/files/[kind]/[id]/route.ts) par jaata hai. Server session verify karta hai, ownership rules apply karta hai aur response ko attachment, `nosniff` aur `private, no-store` ke saath bhejta hai. Teacher apni uploaded files access karta hai. Student shared study files read karta hai. Filename database ID se separated hai. Duplicate filenames ek dusre ko overwrite nahi karte.

Blob storage simple deployment mein data aur metadata ka atomic commit deta hai. Private object storage large files aur cheaper bytes handle karta hai. Us design mein short-lived signed URLs, bucket permissions aur failed metadata uploads ka cleanup plan chahiye. Public local folder files ko app authorization ke bahar expose kar sakta hai.

## Debugging and practice

Download 401 aaye to session check karo. Teacher ko 404 mile to PDF ki `teacher_id` and caller identity check karo. Upload 413 par total multipart bytes dekho. Server headers, status, aur file row inspect karo. Raw PDF log mat karo.

1. Metadata list mein bytes kyu omit hote hain? **Answer** Listing requests chhoti rehti hain aur file sirf download par fetch hoti hai.
2. Magic bytes kyu? **Answer** Filename aur MIME browser supplied hote hain. Bytes basic format evidence dete hain.
3. Attachment disposition ka role? **Answer** Browser ko content download ke roop mein offer karne ko kehta hai.
4. **Debugging** PDF upload 400 aur extension sahi. **Solution** Size aur `%PDF-` header verify karo. File ko PDF exporter se dobara save karo.
5. **Challenge** Download button mein readable size dikhao. **Solution** `fileSize` ko bytes se KB/MB mein convert karke metadata render karo. File bytes fetch karne ki zarurat nahi.
