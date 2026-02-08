#!/bin/bash
# 修复端口 8080 占用问题

echo "🔍 查找占用端口 8080 的进程..."
echo ""

# 查找占用 8080 的进程
PID=$(lsof -ti:8080)

if [ -z "$PID" ]; then
  echo "✅ 端口 8080 未被占用"
else
  echo "⚠️  发现进程占用 8080:"
  ps -p $PID -o pid,comm,args
  echo ""
  read -p "是否停止进程 $PID？(y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "正在停止进程 $PID..."
    kill -9 $PID
    sleep 1
    echo "✅ 已停止"
  else
    echo "取消操作"
    exit 1
  fi
fi

echo ""
echo "现在可以运行: ./start-backend.sh"
