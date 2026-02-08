#!/bin/bash
# 本地启动脚本（不使用 Docker）

set -e

echo "🚀 本地启动 Clawbot Demo"
echo "========================"
echo ""

cd "$(dirname "$0")"

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js 未安装"
  echo "请安装 Node.js: https://nodejs.org/"
  exit 1
fi

echo "✅ Node.js: $(node --version)"
echo ""

# 检查依赖
echo "📦 检查依赖..."
echo ""

if [ ! -d "server/node_modules" ]; then
  echo "⚠️  后端依赖未安装，正在安装..."
  cd server
  npm install
  cd ..
fi

if [ ! -d "web/node_modules" ]; then
  echo "⚠️  前端依赖未安装，正在安装..."
  cd web
  npm install
  cd ..
fi

echo "✅ 依赖已安装"
echo ""

# 检查 Ollama
echo "🤖 检查 Ollama..."
echo ""

if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "⚠️  Ollama 未运行"
  echo ""
  echo "请启动 Ollama:"
  echo "  1. 打开 Ollama 应用，或"
  echo "  2. 运行: ollama serve"
  echo ""
  read -p "是否现在启动 Ollama？(y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v ollama &> /dev/null; then
      echo "启动 Ollama..."
      ollama serve &
      sleep 3
    else
      echo "❌ ollama 命令未找到，请手动启动 Ollama 应用"
      exit 1
    fi
  else
    echo "请先启动 Ollama，然后重新运行此脚本"
    exit 1
  fi
fi

echo "✅ Ollama 正在运行"
echo ""

# 检查模型
echo "📚 检查模型..."
if ollama list 2>/dev/null | grep -q "qwen2.5:1.5b"; then
  echo "✅ 模型已下载"
else
  echo "⚠️  模型未下载，正在下载（首次需要几分钟）..."
  ollama pull qwen2.5:1.5b
fi
echo ""

# 创建 .env.local（如果不存在）
if [ ! -f .env.local ]; then
  echo "📝 创建 .env.local..."
  cat > .env.local << 'EOF'
# Backend
PORT=8080
NODE_ENV=development

# Ollama (本地)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b

# Frontend
VITE_WS_URL=ws://localhost:8080
EOF
  echo "✅ 已创建 .env.local"
  echo ""
fi

echo "🌐 启动服务..."
echo ""
echo "⚠️  将在当前终端启动后端，然后提示你在新终端启动前端"
echo ""

# 启动后端（在当前终端，这样可以看到日志）
echo "🚀 启动后端..."
echo "   后端将在 http://localhost:8080 启动"
echo "   按 Ctrl+C 停止后端"
echo ""

cd server

# 加载环境变量并启动
if [ -f ../.env.local ]; then
  export $(cat ../.env.local | grep -v '^#' | xargs)
fi

# 在后台启动后端
npm run dev &
BACKEND_PID=$!
cd ..

sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
  echo "✅ 后端启动成功"
else
  echo "⚠️  后端可能还在启动中..."
fi

echo ""
echo "📋 下一步："
echo "  1. 打开新终端窗口"
echo "  2. 运行: cd ~/worktrees/clawbot-fix/clawbot-image-demo/web"
echo "  3. 运行: npm run dev"
echo "  4. 访问: http://localhost:5173"
echo ""
echo "或者按 Enter 在当前终端继续（后端日志会显示在这里）..."
read

echo ""
echo "🔄 后端正在运行（PID: $BACKEND_PID）"
echo "   按 Ctrl+C 停止后端"
echo ""
echo "💡 提示："
echo "  - 确保已授予 Terminal 访问通讯录和辅助功能的权限"
echo "  - 运行 ./check-permissions.sh 检查权限"
echo ""

# 等待后端进程
wait $BACKEND_PID

echo ""
echo "✅ 服务已启动！"
echo ""
echo "📋 访问地址："
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:${PORT:-8080}"
echo ""
echo "📋 进程 ID："
echo "  后端: $BACKEND_PID"
echo "  前端: $FRONTEND_PID"
echo ""
echo "🛑 停止服务："
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "💡 提示："
echo "  - 确保已授予 Terminal 访问通讯录和辅助功能的权限"
echo "  - 运行 ./check-permissions.sh 检查权限"
echo ""

# 等待用户中断
wait
