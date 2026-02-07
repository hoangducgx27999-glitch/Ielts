📁 FRONTEND FILES - UPLOAD VÀO HOSTING
========================================

Folder này chỉ chứa 3 files cần upload lên hosting:

✅ index.html       ← Trang đăng nhập (đã đổi tên từ login.html)
✅ game.html        ← Game chính
✅ auth.js          ← Authentication library


🚀 CÁCH UPLOAD:
===============

BƯỚC 1: Cập nhật URL API trong auth.js
---------------------------------------
Mở file: auth.js
Tìm dòng 8:
   API_URL: 'https://ielts-game-api.YOUR_SUBDOMAIN.workers.dev',

Thay YOUR_SUBDOMAIN bằng URL Worker thực tế của bạn
Ví dụ: API_URL: 'https://ielts-game-api.abc123.workers.dev',


BƯỚC 2: Upload 3 files này vào ROOT của hosting
------------------------------------------------

VERCEL:
1. Kéo cả folder "frontend-only" vào Vercel
2. Deploy → Xong!

NETLIFY:
1. Kéo thả folder vào Netlify Drop
2. Deploy → Xong!

GITHUB PAGES:
1. Push 3 files vào repo
2. Enable GitHub Pages → Xong!

CLOUDFLARE PAGES:
1. Upload folder hoặc connect Git
2. Deploy → Xong!


BƯỚC 3: Truy cập website
-------------------------
https://your-site.com/          → Trang login (index.html)
https://your-site.com/game.html → Game


✅ CHECKLIST:
=============
[ ] Đã update API_URL trong auth.js
[ ] Đã upload cả 3 files
[ ] Đã test mở trang chủ
[ ] Đã test đăng ký/đăng nhập


⚠️ LƯU Ý:
==========
- 3 files này PHẢI ở cùng thư mục ROOT
- Phải có Cloudflare Worker đã deploy trước
- API_URL phải đúng với Worker URL
