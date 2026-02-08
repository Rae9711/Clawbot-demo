#!/bin/bash
# 检查 Docker 安装状态

echo "🔍 检查 Docker 安装状态"
echo "======================"
echo ""

# 检查 docker 命令
if command -v docker &> /dev/null; then
  echo "✅ Docker 已安装"
  docker --version
else
  echo "❌ Docker 未安装"
fi

echo ""

# 检查 docker compose
if docker compose version &> /dev/null 2>&1; then
  echo "✅ Docker Compose 可用"
  docker compose version
else
  echo "⚠️  Docker Compose 不可用"
fi

echo ""

# 检查 Docker Desktop 是否运行
if docker ps &> /dev/null 2>&1; then
  echo "✅ Docker 正在运行"
  echo ""
  echo "当前容器:"
  docker ps
else
  echo "⚠️  Docker 未运行或未启动"
  echo ""
  echo "尝试启动 Docker Desktop..."
  if [ -d "/Applications/Docker.app" ]; then
    open -a Docker
    echo "已启动 Docker Desktop，请等待 30-60 秒后再次运行此脚本"
  else
    echo "Docker Desktop 未找到，请先安装"
  fi
fi

echo ""
echo "关于 hub-tool 警告："
echo "这通常是 Homebrew 的警告，不影响 Docker 安装"
echo "如果 Docker 已安装并运行，可以忽略这个警告"
