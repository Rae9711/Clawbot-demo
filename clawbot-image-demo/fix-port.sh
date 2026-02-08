#!/bin/bash
# 修复端口占用问题

echo "🔍 查找占用 8080 端口的进程..."
echo ""

# 查找占用 8080 的进程
PID=$(lsof -ti:8080)

if [ -z "$PID" ]; then
  echo "✅ 端口 8080 未被占用"
else
  echo "⚠️  发现进程占用 8080:"
  ps -p $PID
  echo ""
  echo "正在停止进程 $PID..."
  kill -9 $PID
  echo "✅ 已停止"
fi

echo ""
echo "检查其他可能占用的端口..."
lsof -ti:80 && echo "⚠️  端口 80 被占用" || echo "✅ 端口 80 可用"
lsof -ti:11434 && echo "⚠️  端口 11434 被占用" || echo "✅ 端口 11434 可用"

echo ""
echo "现在可以运行: docker compose up -d"
