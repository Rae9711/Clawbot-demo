#!/bin/bash
# 启动前端（本地）

cd "$(dirname "$0")/web"

# 加载环境变量
if [ -f ../.env.local ]; then
  export $(cat ../.env.local | grep -v '^#' | xargs)
fi

echo "🚀 启动前端..."
echo "   地址: http://localhost:5173"
echo "   WebSocket: ${VITE_WS_URL:-ws://localhost:8080}"
echo ""
echo "按 Ctrl+C 停止"
echo ""

npm run dev
