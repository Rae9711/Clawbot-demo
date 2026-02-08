#!/bin/bash
# 诊断执行问题

echo "🔍 诊断执行问题"
echo "================"
echo ""

cd "$(dirname "$0")"

echo "📋 检查后端进程..."
if pgrep -f "node.*server" > /dev/null || pgrep -f "tsx.*server" > /dev/null; then
  echo "✅ 后端正在运行"
else
  echo "❌ 后端未运行"
  echo "   请先启动后端: ./start-backend.sh"
  exit 1
fi

echo ""
echo "📋 检查后端日志（最后 50 行，包含 [execute]）..."
echo ""

# 如果使用 Docker
if docker ps | grep -q "clawbot-image-demo-backend"; then
  echo "检测到 Docker 容器，查看容器日志："
  docker compose logs backend --tail 100 | grep -E "\[execute\]|contacts|imessage|vars\[" | tail -50
else
  echo "本地运行模式，请手动查看后端终端输出"
  echo ""
  echo "在后端终端中查找以下日志："
  echo "  - [execute] Step s1 error check:"
  echo "  - [execute] Saved result to vars[contact]:"
  echo "  - [execute] Step s2 resolving vars, current vars:"
fi

echo ""
echo "💡 如果看到 'hasError: false' 但结果有 error 字段，说明错误检测逻辑有问题"
echo "💡 如果看到 'vars[contact]' 但没有保存，说明 saveAs 有问题"
echo "💡 如果看到 'current vars: []'，说明第一步的结果没有保存"
