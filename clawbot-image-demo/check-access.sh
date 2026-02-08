#!/bin/bash
# 检查为什么 partner 无法访问

echo "🔍 诊断访问问题"
echo "================"
echo ""

# 1. 检查容器状态
echo "1. 检查容器状态:"
docker compose ps
echo ""

# 2. 检查本地访问
echo "2. 检查本地访问:"
echo "   前端: http://localhost"
curl -s http://localhost > /dev/null && echo "   ✅ 前端可访问" || echo "   ❌ 前端不可访问"
echo "   后端: http://localhost:8080/health"
curl -s http://localhost:8080/health && echo "   ✅ 后端可访问" || echo "   ❌ 后端不可访问"
echo ""

# 3. 检查 ngrok
echo "3. 检查 ngrok:"
if command -v ngrok &> /dev/null; then
  echo "   ✅ ngrok 已安装"
  # 检查是否有 ngrok 进程
  if pgrep -f "ngrok http" > /dev/null; then
    echo "   ✅ ngrok 正在运行"
    echo "   📋 检查 ngrok 状态:"
    curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -2 || echo "   ⚠️  无法获取 ngrok URL（可能 ngrok 未运行）"
  else
    echo "   ❌ ngrok 未运行"
    echo "   💡 运行: ngrok http 80 (前端) 和 ngrok http 8080 (后端)"
  fi
else
  echo "   ❌ ngrok 未安装"
fi
echo ""

# 4. 检查环境变量
echo "4. 检查环境变量:"
if [ -f .env ]; then
  echo "   ✅ .env 文件存在"
  echo "   VITE_WS_URL=$(grep VITE_WS_URL .env | cut -d'=' -f2)"
else
  echo "   ❌ .env 文件不存在"
fi
echo ""

# 5. 检查前端构建配置
echo "5. 检查前端 WebSocket URL:"
echo "   前端代码中的默认值: ws://localhost:8080"
echo "   如果 partner 访问 ngrok URL，需要改成 wss://ngrok后端域名"
echo ""

# 6. 常见问题
echo "6. 常见问题排查:"
echo ""
echo "   ❓ ngrok URL 是否正确？"
echo "      - 前端 ngrok URL: https://xxx.ngrok-free.app"
echo "      - 后端 ngrok URL: https://yyy.ngrok-free.app"
echo ""
echo "   ❓ .env 中的 VITE_WS_URL 是否更新？"
echo "      - 应该改成: wss://yyy.ngrok-free.app (后端的 ngrok URL)"
echo "      - 注意: 用 wss:// (HTTPS)，不是 ws://"
echo ""
echo "   ❓ 前端是否重启？"
echo "      - 修改 .env 后需要: docker compose restart frontend"
echo ""
echo "   ❓ ngrok 是否在运行？"
echo "      - 检查两个终端窗口是否都有 ngrok 进程"
echo ""
