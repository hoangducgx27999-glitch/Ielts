#!/bin/bash

# SCRIPT DEPLOY TỰ ĐỘNG CHO IELTS GAME
# =====================================

echo "🚀 BẮT ĐẦU DEPLOY IELTS GAME"
echo "============================"
echo ""

# Kiểm tra wrangler đã cài chưa
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler chưa được cài đặt!"
    echo "Chạy: npm install -g wrangler"
    exit 1
fi

echo "✅ Wrangler đã được cài đặt"
echo ""

# Đăng nhập (nếu chưa)
echo "🔐 Đăng nhập Cloudflare..."
wrangler whoami || wrangler login

echo ""
echo "📦 BƯỚC 1: Tạo D1 Database"
echo "=========================="
echo "Nhập DATABASE_ID (nếu đã tạo, để trống nếu chưa):"
read existing_db_id

if [ -z "$existing_db_id" ]; then
    echo "Đang tạo database mới..."
    wrangler d1 create ielts-game-db
    echo ""
    echo "⚠️ Copy DATABASE_ID ở trên và dán vào wrangler.toml (line 9)"
    echo "Nhấn Enter khi đã copy xong..."
    read
else
    echo "✅ Sử dụng DATABASE_ID: $existing_db_id"
fi

echo ""
echo "📊 BƯỚC 2: Chạy Schema SQL"
echo "=========================="
echo "Nhập DATABASE_NAME (mặc định: ielts-game-db):"
read db_name
db_name=${db_name:-ielts-game-db}

wrangler d1 execute $db_name --file=schema.sql
echo "✅ Database schema đã được tạo"

echo ""
echo "🗄️ BƯỚC 3: Tạo KV Namespace"
echo "==========================="
echo "Nhập KV_ID (nếu đã tạo, để trống nếu chưa):"
read existing_kv_id

if [ -z "$existing_kv_id" ]; then
    echo "Đang tạo KV namespace mới..."
    wrangler kv:namespace create "PAYMENTS"
    echo ""
    echo "⚠️ Copy KV_ID ở trên và dán vào wrangler.toml (line 14)"
    echo "Nhấn Enter khi đã copy xong..."
    read
else
    echo "✅ Sử dụng KV_ID: $existing_kv_id"
fi

echo ""
echo "🚢 BƯỚC 4: Deploy Worker"
echo "========================"
echo "Bạn đã cập nhật wrangler.toml với DATABASE_ID và KV_ID chưa? (y/n)"
read confirm

if [ "$confirm" != "y" ]; then
    echo "⚠️ Vui lòng cập nhật wrangler.toml trước khi deploy!"
    echo "Line 9:  database_id = \"YOUR_DATABASE_ID\""
    echo "Line 14: id = \"YOUR_KV_ID\""
    exit 1
fi

wrangler deploy

echo ""
echo "✅ DEPLOY THÀNH CÔNG!"
echo "===================="
echo ""
echo "📝 BƯỚC TIẾP THEO:"
echo "1. Copy URL Worker vừa deploy"
echo "2. Paste vào auth.js (line 8)"
echo "3. Upload login.html, game.html, auth.js lên hosting"
echo ""
echo "🎉 Hoàn thành! Chúc bạn thành công!"
