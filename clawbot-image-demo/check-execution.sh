#!/bin/bash
# 检查执行日志

echo "🔍 检查后端执行日志"
echo "=================="
echo ""

cd "$(dirname "$0")"

echo "📋 最近的执行日志（最后 50 行）:"
echo ""
docker compose logs backend --tail 50 | grep -E "\[execute\]|contacts\.apple|imessage\.send" || echo "没有找到相关日志"

echo ""
echo ""
echo "📋 所有后端日志（最后 100 行）:"
echo ""
docker compose logs backend --tail 100
