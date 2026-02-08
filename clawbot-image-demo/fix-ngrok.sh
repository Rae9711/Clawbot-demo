#!/bin/bash
# 修复 ngrok 冲突：只用一个 ngrok 指向后端

echo "🔧 修复 ngrok 配置"
echo "=================="
echo ""

# 停止所有 ngrok
echo "🛑 停止所有 ngrok 进程..."
killall ngrok 2>/dev/null || true
sleep 2

# 停止前端容器（后端会 serve 前端）
echo "🛑 停止前端容器..."
cd "$(dirname "$0")"
docker compose stop frontend 2>/dev/null || true

echo ""
echo "✅ 已停止前端容器和 ngrok"
echo ""
echo "📋 下一步："
echo "   1. 启动后端 ngrok: ngrok http 8080"
echo "   2. 复制 ngrok URL（例如: https://xyz789.ngrok-free.app）"
echo "   3. 更新 .env: VITE_WS_URL=wss://你的ngrok域名"
echo "   4. 重启前端容器: docker compose restart frontend"
echo "   5. 把 ngrok URL 发给 partner"
echo ""
