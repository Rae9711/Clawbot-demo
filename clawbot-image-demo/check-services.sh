#!/bin/bash
# 检查服务状态和端口

echo "🔍 检查服务状态"
echo "=================="
echo ""

# 检查 Docker 容器状态
echo "📦 Docker 容器状态:"
docker compose ps 2>/dev/null || echo "⚠️  无法连接到 Docker，请确保 Docker Desktop 正在运行"
echo ""

# 检查端口监听
echo "🔌 端口监听情况:"
echo "端口 80 (前端):"
lsof -i:80 2>/dev/null | head -2 || echo "  ⚠️  端口 80 未被监听"
echo ""
echo "端口 8080 (后端):"
lsof -i:8080 2>/dev/null | head -2 || echo "  ⚠️  端口 8080 未被监听"
echo ""

# 检查服务健康
echo "🏥 服务健康检查:"
echo "前端 (http://localhost:80):"
curl -s -o /dev/null -w "  状态码: %{http_code}\n" http://localhost:80 2>/dev/null || echo "  ❌ 无法连接"
echo ""
echo "后端 (http://localhost:8080/health):"
curl -s http://localhost:8080/health 2>/dev/null && echo "" || echo "  ❌ 无法连接"
echo ""

# 检查 ngrok
echo "🌐 ngrok 状态:"
if pgrep -x ngrok > /dev/null; then
  echo "  ✅ ngrok 正在运行"
  echo "  访问 http://localhost:4040 查看详情"
else
  echo "  ⚠️  ngrok 未运行"
fi
echo ""

# 检查 .env 配置
echo "⚙️  .env 配置:"
if [ -f .env ]; then
  echo "  VITE_WS_URL=$(grep VITE_WS_URL .env | cut -d'=' -f2)"
else
  echo "  ⚠️  .env 文件不存在"
fi
