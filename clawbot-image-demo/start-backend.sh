#!/bin/bash
# 启动后端（本地）

cd "$(dirname "$0")/server"

# 加载环境变量
if [ -f ../.env.local ]; then
  export $(cat ../.env.local | grep -v '^#' | xargs)
fi

echo "🚀 启动后端..."
echo "   地址: http://localhost:${PORT:-8080}"
echo "   Ollama: ${OLLAMA_URL:-http://localhost:11434}"
echo ""
echo "按 Ctrl+C 停止"
echo ""

npm run dev
