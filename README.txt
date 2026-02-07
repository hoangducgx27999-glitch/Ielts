🚀 HƯỚNG DẪN DEPLOY ĐƠN GIẢN
============================

📦 THƯ MỤC NÀY GỒM:
-------------------
✅ wrangler.toml       - Config Cloudflare Worker
✅ worker.js           - API Backend
✅ schema.sql          - Database schema  
✅ auth.js             - Client authentication library
✅ login.html          - Trang đăng nhập (ĐÃ SỬA LỖI)
✅ game.html           - Game chính


🎯 BƯỚC 1: CÀI ĐẶT & SETUP CLOUDFLARE
======================================

1. Cài Wrangler CLI:
   npm install -g wrangler

2. Đăng nhập Cloudflare:
   wrangler login


🎯 BƯỚC 2: TẠO DATABASE VÀ KV
==============================

1. Tạo D1 Database:
   wrangler d1 create ielts-game-db
   
   → Copy DATABASE_ID từ output (dạng: abc123-def456...)

2. Chạy schema SQL:
   wrangler d1 execute ielts-game-db --file=schema.sql

3. Tạo KV Namespace:
   wrangler kv:namespace create "PAYMENTS"
   
   → Copy KV_ID từ output


🎯 BƯỚC 3: CẬP NHẬT CONFIG
==========================

Mở file wrangler.toml và điền:

Line 9:  database_id = "PASTE_DATABASE_ID_Ở_ĐÂY"
Line 14: id = "PASTE_KV_ID_Ở_ĐÂY"


🎯 BƯỚC 4: DEPLOY WORKER
=========================

wrangler deploy

→ Lưu lại URL Worker (ví dụ: https://ielts-game-api.abc123.workers.dev)


🎯 BƯỚC 5: CẬP NHẬT URL API
============================

Mở file auth.js:

Line 8: API_URL: 'PASTE_WORKER_URL_Ở_ĐÂY'

Ví dụ:
API_URL: 'https://ielts-game-api.abc123.workers.dev'


🎯 BƯỚC 6: UPLOAD LÊN HOSTING
==============================

Upload 3 files này lên hosting (Vercel/Netlify/GitHub Pages):
✅ login.html
✅ game.html  
✅ auth.js


✨ XONG! Vậy là deploy thành công rồi!


🧪 KIỂM TRA:
============

1. Mở trang login
2. Đăng ký tài khoản mới
3. Đăng nhập
4. Chơi game


📊 XEM DATABASE:
================

wrangler d1 execute ielts-game-db --command="SELECT * FROM users"


🔍 XEM LOGS:
============

wrangler tail


⚠️ LƯU Ý:
==========

• Đổi thông tin ngân hàng trong worker.js (line 305-310)
• FREE users: 100 câu hỏi
• VIP users: Không giới hạn + mở khóa themes


📞 NẾU GẶP LỖI:
===============

1. Check Browser Console (F12)
2. Check Worker Logs: wrangler tail
3. Kiểm tra URL API trong auth.js đã đúng chưa
