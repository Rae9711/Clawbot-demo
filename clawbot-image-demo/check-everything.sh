#!/bin/bash
# 全面检查系统状态

echo "🔍 全面系统诊断"
echo "================"
echo ""

cd "$(dirname "$0")"

# 1. 检查 Node.js
echo "1️⃣  检查 Node.js..."
if command -v node &> /dev/null; then
  echo "   ✅ Node.js: $(node --version)"
else
  echo "   ❌ Node.js 未安装"
  exit 1
fi
echo ""

# 2. 检查依赖
echo "2️⃣  检查依赖..."
if [ ! -d "server/node_modules" ]; then
  echo "   ❌ 后端依赖未安装"
  echo "   运行: cd server && npm install"
else
  echo "   ✅ 后端依赖已安装"
fi

if [ ! -d "web/node_modules" ]; then
  echo "   ❌ 前端依赖未安装"
  echo "   运行: cd web && npm install"
else
  echo "   ✅ 前端依赖已安装"
fi
echo ""

# 3. 检查 Ollama
echo "3️⃣  检查 Ollama..."
if command -v ollama &> /dev/null; then
  if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   ✅ Ollama 正在运行"
    if ollama list 2>/dev/null | grep -q "qwen2.5:1.5b"; then
      echo "   ✅ 模型 qwen2.5:1.5b 已下载"
    else
      echo "   ⚠️  模型 qwen2.5:1.5b 未下载"
      echo "   运行: ollama pull qwen2.5:1.5b"
    fi
  else
    echo "   ❌ Ollama 未运行"
    echo "   启动: ollama serve 或打开 Ollama 应用"
  fi
else
  echo "   ❌ Ollama 未安装"
fi
echo ""

# 4. 检查端口占用
echo "4️⃣  检查端口占用..."
BACKEND_PID=$(lsof -ti:8080)
FRONTEND_PID=$(lsof -ti:5173)

if [ -n "$BACKEND_PID" ]; then
  echo "   ⚠️  端口 8080 被占用 (PID: $BACKEND_PID)"
  ps -p $BACKEND_PID | tail -1 | awk '{print "   进程: " $4}'
else
  echo "   ✅ 端口 8080 可用"
fi

if [ -n "$FRONTEND_PID" ]; then
  echo "   ⚠️  端口 5173 被占用 (PID: $FRONTEND_PID)"
  ps -p $FRONTEND_PID | tail -1 | awk '{print "   进程: " $4}'
else
  echo "   ✅ 端口 5173 可用"
fi
echo ""

# 5. 检查后端服务
echo "5️⃣  检查后端服务..."
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
  echo "   ✅ 后端服务正常"
  HEALTH=$(curl -s http://localhost:8080/health)
  echo "   响应: $HEALTH"
else
  echo "   ❌ 后端服务未运行或无法访问"
  echo "   启动: ./start-backend.sh"
fi
echo ""

# 6. 检查前端服务
echo "6️⃣  检查前端服务..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "   ✅ 前端服务正常"
else
  echo "   ❌ 前端服务未运行或无法访问"
  echo "   启动: ./start-frontend.sh"
fi
echo ""

# 7. 检查环境变量
echo "7️⃣  检查环境变量..."
if [ -f ".env.local" ]; then
  echo "   ✅ .env.local 存在"
  echo "   内容:"
  cat .env.local | grep -v '^#' | grep -v '^$' | sed 's/^/     /'
else
  echo "   ⚠️  .env.local 不存在"
  echo "   创建: cp .env.example .env.local"
fi
echo ""

# 8. 检查权限
echo "8️⃣  检查 macOS 权限..."
if command -v osascript &> /dev/null; then
  # 测试通讯录权限
  if osascript -l JavaScript -e 'Application("Contacts").people()[0].name()' 2>&1 | grep -q "not allowed\|denied"; then
    echo "   ❌ 通讯录权限未授予"
    echo "   设置: 系统设置 > 隐私与安全性 > 通讯录 > 勾选 Terminal"
  else
    echo "   ✅ 通讯录权限已授予"
  fi
  
  # 测试 Messages 权限
  if osascript -e 'tell application "Messages" to get name of every service' 2>&1 | grep -q "not allowed\|denied"; then
    echo "   ❌ Messages 权限未授予"
    echo "   设置: 系统设置 > 隐私与安全性 > 辅助功能 > 勾选 Terminal"
  else
    echo "   ✅ Messages 权限已授予"
  fi
else
  echo "   ⚠️  无法检查权限（非 macOS 或 osascript 不可用）"
fi
echo ""

# 9. 检查 Docker（如果使用）
echo "9️⃣  检查 Docker..."
if command -v docker &> /dev/null; then
  if docker ps &> /dev/null 2>&1; then
    if docker ps | grep -q "clawbot"; then
      echo "   ⚠️  检测到 Docker 容器在运行"
      echo "   如果使用本地运行，请停止: docker compose down"
    else
      echo "   ✅ Docker 未运行相关容器"
    fi
  else
    echo "   ✅ Docker 未运行"
  fi
else
  echo "   ℹ️  Docker 未安装（本地运行不需要）"
fi
echo ""

# 10. 总结
echo "📋 总结"
echo "========"
echo ""

ISSUES=0

[ ! -d "server/node_modules" ] && ISSUES=$((ISSUES+1))
[ ! -d "web/node_modules" ] && ISSUES=$((ISSUES+1))
! curl -s http://localhost:11434/api/tags > /dev/null 2>&1 && ISSUES=$((ISSUES+1))
! curl -s http://localhost:8080/health > /dev/null 2>&1 && ISSUES=$((ISSUES+1))
! curl -s http://localhost:5173 > /dev/null 2>&1 && ISSUES=$((ISSUES+1))

if [ $ISSUES -eq 0 ]; then
  echo "✅ 所有关键组件正常！"
  echo ""
  echo "🌐 访问地址: http://localhost:5173"
else
  echo "⚠️  发现 $ISSUES 个问题，请根据上面的提示修复"
  echo ""
  echo "📝 快速修复步骤："
  echo "   1. 安装依赖: cd server && npm install && cd ../web && npm install"
  echo "   2. 启动 Ollama: ollama serve"
  echo "   3. 启动后端: ./start-backend.sh"
  echo "   4. 启动前端: ./start-frontend.sh"
  echo "   5. 授予权限: 系统设置 > 隐私与安全性"
fi
