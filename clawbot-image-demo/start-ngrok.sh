#!/bin/bash
# 启动 ngrok 隧道

echo "🌐 启动 ngrok 隧道"
echo "=================="
echo ""

# 检查 ngrok 是否已安装
if ! command -v ngrok &> /dev/null; then
  echo "❌ ngrok 未安装"
  echo "安装: brew install ngrok"
  exit 1
fi

# 停止现有的 ngrok 进程
echo "🛑 停止现有 ngrok 进程..."
killall ngrok 2>/dev/null || true
sleep 2

echo ""
echo "⚠️  重要：需要在两个终端窗口分别运行以下命令"
echo ""
echo "📋 终端 1 - 前端 ngrok (端口 80):"
echo "   ngrok http 80"
echo ""
echo "📋 终端 2 - 后端 ngrok (端口 8080):"
echo "   ngrok http 8080"
echo ""
echo "💡 启动后："
echo "   1. 复制后端 ngrok URL（例如: https://xyz789.ngrok-free.app）"
echo "   2. 更新 .env 文件中的 VITE_WS_URL=wss://后端ngrok域名"
echo "   3. 运行: docker compose restart frontend"
echo "   4. 把前端 ngrok URL 发给 partner"
echo ""

# 询问是否自动启动
read -p "是否自动启动前端 ngrok？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🚀 启动前端 ngrok (端口 80)..."
  echo "   按 Ctrl+C 停止"
  ngrok http 80
fi
