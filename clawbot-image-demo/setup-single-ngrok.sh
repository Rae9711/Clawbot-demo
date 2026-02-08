#!/bin/bash
# 设置单 ngrok 方案：后端 serve 前端，只用一个 ngrok

set -e

echo "🔧 设置单 ngrok 方案"
echo "===================="
echo ""

cd "$(dirname "$0")"

# 1. 停止所有服务
echo "🛑 停止所有服务..."
docker compose stop frontend 2>/dev/null || true
killall ngrok 2>/dev/null || true
sleep 2

# 2. 重新构建后端（包含前端）
echo ""
echo "🔨 重新构建后端（包含前端）..."
docker compose build backend

# 3. 启动后端和 ollama
echo ""
echo "🚀 启动后端和 Ollama..."
docker compose up -d backend ollama

# 4. 等待服务启动
echo ""
echo "⏳ 等待服务启动（5秒）..."
sleep 5

# 5. 检查后端健康
echo ""
echo "🏥 检查后端健康..."
if curl -s http://localhost:8080/health > /dev/null; then
  echo "✅ 后端运行正常"
else
  echo "⚠️  后端可能还在启动中..."
fi

# 6. 启动 ngrok
echo ""
echo "🌐 启动 ngrok（指向后端 8080）..."
echo ""
echo "⚠️  重要："
echo "   1. ngrok 会在当前终端启动"
echo "   2. 复制显示的 URL（例如: https://xyz789.ngrok-free.app）"
echo "   3. 把这个 URL 发给 partner"
echo "   4. 前端会自动连接到同一个 URL 的 WebSocket"
echo ""
echo "按 Enter 启动 ngrok，或 Ctrl+C 取消..."
read

ngrok http 8080
