# 本地运行指南（不使用 Docker）

本地运行可以访问 macOS 系统权限（通讯录、iMessage），而 Docker 容器无法访问这些权限。

## 前置要求

1. **Node.js** (v18+)
2. **Ollama** 在本地运行（端口 11434）
3. **npm** 或 **yarn**

## 快速开始

### 1. 安装依赖

```bash
cd ~/worktrees/clawbot-fix/clawbot-image-demo

# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../web
npm install
```

### 2. 确保 Ollama 在运行

```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 如果没有运行，启动 Ollama
# macOS: 打开 Ollama 应用，或运行:
ollama serve

# 确保模型已下载
ollama pull qwen2.5:1.5b
```

### 3. 配置环境变量

创建 `.env.local` 文件（或使用现有的 `.env`）：

```bash
cd ~/worktrees/clawbot-fix/clawbot-image-demo

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
```

### 4. 启动服务

**终端 1 - 启动后端**：

```bash
cd ~/worktrees/clawbot-fix/clawbot-image-demo/server
npm run dev
```

后端会在 `http://localhost:8080` 启动。

**终端 2 - 启动前端**：

```bash
cd ~/worktrees/clawbot-fix/clawbot-image-demo/web
npm run dev
```

前端会在 `http://localhost:5173` 启动。

### 5. 访问应用

打开浏览器访问：`http://localhost:5173`

## 使用启动脚本（推荐）

我们提供了一个便捷的启动脚本：

```bash
cd ~/worktrees/clawbot-fix/clawbot-image-demo
./start-local.sh
```

这个脚本会：
1. 检查依赖是否安装
2. 检查 Ollama 是否运行
3. 启动后端和前端
4. 显示访问地址

## 授予系统权限

本地运行时，需要授予 **Terminal** 或 **iTerm** 的权限：

### 1. 通讯录权限

1. 打开 **系统设置** > **隐私与安全性** > **通讯录**
2. 勾选 **Terminal**（或你使用的终端应用）

### 2. 辅助功能权限（用于 iMessage）

1. 打开 **系统设置** > **隐私与安全性** > **辅助功能**
2. 勾选 **Terminal**（或你使用的终端应用）

### 3. 测试权限

运行权限检查脚本：

```bash
./check-permissions.sh
```

## 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端端口 | `8080` |
| `OLLAMA_URL` | Ollama API 地址 | `http://localhost:11434` |
| `OLLAMA_MODEL` | 使用的模型 | `qwen2.5:1.5b` |
| `VITE_WS_URL` | 前端 WebSocket URL | `ws://localhost:8080` |
| `NODE_ENV` | 环境模式 | `development` |

## 故障排除

### 问题 1: 端口被占用

```bash
# 检查端口占用
lsof -i:8080  # 后端
lsof -i:5173  # 前端
lsof -i:11434 # Ollama

# 停止占用端口的进程
kill -9 <PID>
```

### 问题 2: Ollama 未运行

```bash
# 检查 Ollama
curl http://localhost:11434/api/tags

# 如果失败，启动 Ollama
ollama serve

# 或打开 Ollama 应用
open -a Ollama
```

### 问题 3: 权限被拒绝

运行权限检查：

```bash
./check-permissions.sh
```

然后按照提示授予权限。

### 问题 4: 依赖安装失败

```bash
# 清除缓存重新安装
cd server
rm -rf node_modules package-lock.json
npm install

cd ../web
rm -rf node_modules package-lock.json
npm install
```

## 开发模式 vs 生产模式

- **开发模式** (`npm run dev`): 热重载，自动重启
- **生产模式** (`npm run build && npm start`): 需要先构建

## 停止服务

按 `Ctrl+C` 停止各个终端中的服务。

## 与 Docker 的区别

| 特性 | 本地运行 | Docker |
|------|---------|--------|
| 系统权限 | ✅ 可以访问 | ❌ 无法访问 |
| 设置复杂度 | 中等 | 简单 |
| 隔离性 | 低 | 高 |
| 性能 | 高 | 中等 |

对于需要访问 macOS 系统功能（通讯录、iMessage）的场景，**必须使用本地运行**。
