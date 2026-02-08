#!/bin/bash
# 检查 macOS 权限设置

echo "🔐 检查 macOS 权限设置"
echo "======================"
echo ""

cd "$(dirname "$0")"

# 检查通讯录权限
echo "📇 测试通讯录访问权限..."
echo ""

if command -v osascript &> /dev/null; then
  echo "测试 1: 直接访问通讯录"
  if osascript -l JavaScript -e 'Application("Contacts").people()[0].name()' 2>&1 | grep -q "not allowed\|denied"; then
    echo "  ❌ 通讯录访问被拒绝"
    echo "  💡 请在 系统设置 > 隐私与安全性 > 通讯录 中授予 Terminal/Docker Desktop 权限"
  else
    echo "  ✅ 通讯录访问正常"
  fi
  echo ""
  
  # 如果使用 Docker，也测试 Docker 内的访问
  if docker ps &> /dev/null 2>&1; then
    echo "测试 2: 通过 Docker 访问通讯录"
    if docker compose exec -T backend osascript -l JavaScript -e 'Application("Contacts").people()[0].name()' 2>&1 | grep -q "not allowed\|denied"; then
      echo "  ❌ Docker 容器无法访问通讯录"
      echo "  💡 请在 系统设置 > 隐私与安全性 > 通讯录 中授予 Docker Desktop 权限"
    else
      echo "  ✅ Docker 容器可以访问通讯录"
    fi
    echo ""
  fi
else
  echo "  ⚠️  osascript 未找到（macOS 专用）"
fi

# 检查 Messages 权限
echo "💬 测试 Messages 访问权限..."
echo ""

if command -v osascript &> /dev/null; then
  echo "测试 1: 直接访问 Messages"
  if osascript -e 'tell application "Messages" to get name of every service' 2>&1 | grep -q "not allowed\|denied"; then
    echo "  ❌ Messages 访问被拒绝"
    echo "  💡 请在 系统设置 > 隐私与安全性 > 辅助功能 中授予 Terminal/Docker Desktop 权限"
  else
    echo "  ✅ Messages 访问正常"
  fi
  echo ""
  
  # 如果使用 Docker，也测试 Docker 内的访问
  if docker ps &> /dev/null 2>&1; then
    echo "测试 2: 通过 Docker 访问 Messages"
    if docker compose exec -T backend osascript -e 'tell application "Messages" to get name of every service' 2>&1 | grep -q "not allowed\|denied"; then
      echo "  ❌ Docker 容器无法访问 Messages"
      echo "  💡 请在 系统设置 > 隐私与安全性 > 辅助功能 中授予 Docker Desktop 权限"
    else
      echo "  ✅ Docker 容器可以访问 Messages"
    fi
    echo ""
  fi
fi

echo "📋 权限设置位置："
echo "  1. 系统设置 > 隐私与安全性 > 通讯录"
echo "  2. 系统设置 > 隐私与安全性 > 辅助功能"
echo ""
echo "💡 如果权限被拒绝，请："
echo "  1. 打开系统设置"
echo "  2. 找到对应的权限类别"
echo "  3. 勾选 Terminal/iTerm/Docker Desktop"
echo "  4. 重新运行此脚本验证"
