#!/bin/bash
# 会议演示快速启动脚本

set -e

echo "🚀 Clawbot 会议演示快速启动"
echo "================================"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker 未安装。请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "❌ Docker 未运行。请打开 Docker Desktop 应用。"
  exit 1
fi

# 检查 ngrok
if ! command -v ngrok &> /dev/null; then
  echo "⚠️  ngrok 未安装。安装中..."
  if command -v brew &> /dev/null; then
    brew install ngrok
  else
    echo "❌ 请手动安装 ngrok: https://ngrok.com/download"
    exit 1
  fi
fi

# 创建 .env（如果不存在）
if [ ! -f .env ]; then
  echo "📝 创建 .env 文件..."
  cat > .env << 'EOF'
BACKEND_PORT=8080
FRONTEND_PORT=80
OLLAMA_PORT=11434
VITE_WS_URL=ws://localhost:8080
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:1.5b
EOF
  echo "✅ .env 已创建"
fi

# 启动 Docker 服务
echo ""
echo "🔨 启动 Docker 服务..."
docker compose up -d

echo ""
echo "⏳ 等待服务启动（10秒）..."
sleep 10

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker compose ps

# 检查健康
echo ""
echo "🏥 健康检查:"
if curl -s http://localhost:8080/health > /dev/null; then
  echo "✅ 后端健康"
else
  echo "⚠️  后端可能还在启动中..."
fi

# 检查 Ollama 模型
echo ""
echo "🤖 检查 Ollama 模型..."
if docker compose exec -T ollama ollama list 2>/dev/null | grep -q "qwen2.5:1.5b"; then
  echo "✅ 模型已下载"
else
  echo "⚠️  模型未下载，正在拉取（首次需要 3-5 分钟）..."
  echo "   这会在后台进行，你可以继续下一步"
  docker compose exec -d ollama ollama pull qwen2.5:1.5b
fi

# 启动 ngrok
echo ""
echo "🌐 启动 ngrok..."
echo ""
echo "⚠️  重要：ngrok 会在新窗口中启动"
echo "   请复制显示的 URL 并更新 .env 中的 VITE_WS_URL"
echo ""

# 检测 ngrok 是否已配置 token
if ! ngrok config check &> /dev/null; then
  echo "⚠️  ngrok 未配置 token"
  echo "   1. 访问 https://ngrok.com 注册（免费）"
  echo "   2. 获取 authtoken"
  echo "   3. 运行: ngrok config add-authtoken 你的token"
  echo ""
  read -p "按回车继续（ngrok 可能无法启动）..."
fi

# 启动 ngrok（前端）
echo "启动前端 ngrok (端口 80)..."
osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && ngrok http 80"' 2>/dev/null || \
  echo "请在终端运行: ngrok http 80"

# 启动 ngrok（后端）
echo "启动后端 ngrok (端口 8080)..."
osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && ngrok http 8080"' 2>/dev/null || \
  echo "请在终端运行: ngrok http 8080"

echo ""
echo "================================"
echo "✅ 启动完成！"
echo ""
echo "📋 下一步："
echo "1. 查看新打开的 ngrok 终端窗口"
echo "2. 复制后端的 ngrok URL（比如 https://def456.ngrok-free.app）"
echo "3. 编辑 .env，把 VITE_WS_URL 改成: wss://你的后端ngrok域名"
echo "4. 运行: docker compose restart frontend"
echo "5. 访问前端的 ngrok URL"
echo ""
echo "📖 详细说明见: MEETING_DEMO.md"
echo ""
