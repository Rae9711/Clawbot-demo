#!/bin/bash
# Quick start script for Docker deployment

set -e

echo "🦞 Clawbot Docker 部署脚本"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 创建 .env 文件..."
  cp .env.example .env
  echo "✅ 已创建 .env，请编辑配置后重新运行此脚本"
  exit 0
fi

# Load environment variables
source .env

echo "🔨 构建 Docker 镜像..."
docker compose build

echo ""
echo "🚀 启动服务..."
docker compose up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 5

echo ""
echo "📊 服务状态:"
docker compose ps

echo ""
echo "✅ 部署完成！"
echo ""
echo "🌐 前端: http://localhost:${FRONTEND_PORT:-80}"
echo "🔌 后端: http://localhost:${BACKEND_PORT:-8080}"
echo "🤖 Ollama: http://localhost:${OLLAMA_PORT:-11434}"
echo ""
echo "📝 查看日志: docker compose logs -f"
echo "🛑 停止服务: docker compose down"
echo ""
echo "💡 首次使用需要拉取 Ollama 模型:"
echo "   docker compose exec ollama ollama pull qwen2.5:1.5b"
