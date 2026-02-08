#!/bin/bash
# Docker 安装脚本（macOS）

echo "🐳 Docker 安装助手"
echo "=================="
echo ""

# 检查是否已安装
if command -v docker &> /dev/null; then
  echo "✅ Docker 已安装"
  docker --version
  echo ""
  echo "检查 Docker 是否运行..."
  if docker ps &> /dev/null; then
    echo "✅ Docker 正在运行"
    exit 0
  else
    echo "⚠️  Docker 未运行，正在启动..."
    open -a Docker
    echo "请等待 Docker Desktop 启动（约 30 秒）"
    exit 0
  fi
fi

# 检查 Homebrew
if command -v brew &> /dev/null; then
  echo "📦 使用 Homebrew 安装..."
  echo ""
  echo "正在安装 Docker Desktop..."
  brew install --cask docker
  
  echo ""
  echo "✅ 安装完成！"
  echo ""
  echo "🚀 正在启动 Docker Desktop..."
  open -a Docker
  
  echo ""
  echo "⏳ 请等待 Docker Desktop 启动（约 30-60 秒）"
  echo "   菜单栏会出现 Docker 图标"
  echo ""
  echo "启动后，运行以下命令验证："
  echo "  docker --version"
  echo "  docker ps"
  
else
  echo "⚠️  Homebrew 未安装"
  echo ""
  echo "请选择安装方式："
  echo ""
  echo "选项 1: 安装 Homebrew（推荐）"
  echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  echo ""
  echo "选项 2: 手动下载 Docker Desktop"
  echo "  1. 访问: https://www.docker.com/products/docker-desktop"
  echo "  2. 下载 Docker Desktop for Mac"
  echo "  3. 打开 .dmg 文件并安装"
  echo "  4. 打开 Applications → Docker"
  echo ""
  echo "安装完成后，运行此脚本再次检查。"
fi
