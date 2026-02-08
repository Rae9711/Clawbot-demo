# 会议演示部署步骤（详细版）

## 🎯 目标
在会议前部署好，让 partner 可以通过 URL 访问并测试。

---

## 方案 A: Railway 部署（最简单，推荐）⏱️ 15分钟

### 前置准备
- GitHub 账号
- Railway 账号（免费注册：https://railway.app）

### 步骤 1: 准备代码并推送到 GitHub

```bash
# 1. 确保所有代码已提交
cd /Users/wanghaorui/worktrees/clawbot-fix/upg/clawbot-image-demo
git status

# 2. 如果有未提交的更改
git add .
git commit -m "Add deployment config"
git push

# 如果没有 GitHub 仓库，先创建：
# - 去 https://github.com/new
# - 创建新仓库（比如叫 clawbot-demo）
# - 然后运行：
# git remote add origin https://github.com/你的用户名/clawbot-demo.git
# git push -u origin main
```

### 步骤 2: 在 Railway 创建项目

1. **访问 Railway**: https://railway.app
2. **登录**（用 GitHub）
3. **点击 "New Project"**
4. **选择 "Deploy from GitHub repo"**
5. **选择你的仓库**（clawbot-demo）
6. Railway 会自动开始部署（但会失败，因为需要配置）

### 步骤 3: 配置环境变量

在 Railway dashboard 的项目页面：

1. **点击项目** → **Variables** 标签页
2. **添加以下环境变量**：

```
NODE_ENV=production
PORT=8080
OLLAMA_URL=https://api.openrouter.ai/api/v1
OLLAMA_MODEL=qwen2.5:1.5b
```

**重要**: 如果你要用 OpenRouter（推荐，免费试用）：
- 去 https://openrouter.ai 注册
- 获取 API Key
- 添加环境变量：`OPENROUTER_API_KEY=你的key`

### 步骤 4: 修改代码以支持 OpenRouter

Railway 不能运行 Ollama，需要用云 API。需要修改 `server/src/agent/ollama.ts`：

```typescript
// 在文件开头添加
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// 修改 OLLAMA_URL 的默认值
const OLLAMA_URL = process.env.OLLAMA_URL ?? 
  (OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : "http://127.0.0.1:11434");
```

然后修改 `textComplete` 函数，如果是 OpenRouter，需要添加 Authorization header。

**或者更简单**：先用本地 Docker 测试，会议时用 ngrok 暴露。

---

## 方案 B: 本地 Docker + ngrok（最快，推荐用于演示）⏱️ 10分钟

### 步骤 1: 安装 Docker

```bash
# macOS
brew install --cask docker
# 打开 Docker Desktop 应用

# 检查安装
docker --version
docker compose --version
```

### 步骤 2: 安装 ngrok

```bash
# macOS
brew install ngrok

# 或从 https://ngrok.com/download 下载
# 注册账号获取 authtoken（免费）
ngrok config add-authtoken 你的token
```

### 步骤 3: 启动 Docker 服务

```bash
cd /Users/wanghaorui/worktrees/clawbot-fix/upg/clawbot-image-demo

# 创建 .env 文件
cat > .env << EOF
BACKEND_PORT=8080
FRONTEND_PORT=80
OLLAMA_PORT=11434
VITE_WS_URL=ws://localhost:8080
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:1.5b
EOF

# 启动服务
docker compose up -d

# 查看日志（等待 Ollama 启动）
docker compose logs -f ollama
# 看到 "Ollama is running" 后按 Ctrl+C

# 拉取模型（首次需要几分钟）
docker compose exec ollama ollama pull qwen2.5:1.5b
```

### 步骤 4: 暴露到公网（ngrok）

**终端 1 - 暴露前端**:
```bash
ngrok http 80
# 会显示一个 URL，比如: https://abc123.ngrok.io
# 复制这个 URL
```

**终端 2 - 暴露后端**:
```bash
ngrok http 8080
# 会显示另一个 URL，比如: https://def456.ngrok.io
```

### 步骤 5: 更新前端 WebSocket URL

```bash
# 编辑 .env，把 VITE_WS_URL 改成后端的 ngrok URL（用 wss://）
# 比如: VITE_WS_URL=wss://def456.ngrok.io

# 重启前端
docker compose restart frontend
```

### 步骤 6: 测试

1. 访问前端的 ngrok URL（如 `https://abc123.ngrok.io`）
2. 应该能看到界面
3. 测试发送消息

---

## 方案 C: Render.com 部署（免费，稳定）⏱️ 20分钟

### 步骤 1: 准备代码（同方案 A 步骤 1）

### 步骤 2: 在 Render 创建服务

1. **访问**: https://render.com
2. **注册/登录**（用 GitHub）
3. **点击 "New +" → "Web Service"**
4. **连接 GitHub 仓库**
5. **配置**:
   - **Name**: `clawbot-backend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `server/Dockerfile`
   - **Docker Context**: `.` (项目根目录)
   - **Health Check Path**: `/health`

### 步骤 3: 设置环境变量

在 Render dashboard → Environment:

```
NODE_ENV=production
PORT=8080
OLLAMA_URL=https://api.openrouter.ai/api/v1
OLLAMA_MODEL=qwen2.5:1.5b
OPENROUTER_API_KEY=你的key
```

### 步骤 4: 创建前端服务

1. **New + → Static Site**
2. **连接同一个 GitHub 仓库**
3. **配置**:
   - **Build Command**: `cd web && npm install && npm run build`
   - **Publish Directory**: `web/dist`
   - **Environment Variables**:
     ```
     VITE_WS_URL=wss://clawbot-backend.onrender.com
     ```

### 步骤 5: 等待部署完成

Render 会给两个 URL：
- Backend: `https://clawbot-backend.onrender.com`
- Frontend: `https://clawbot-frontend.onrender.com`

访问前端 URL 即可。

---

## 🎤 会议演示准备清单

### 演示前检查

- [ ] 服务已启动并可访问
- [ ] 测试发送一条消息（确保功能正常）
- [ ] 准备好演示用的联系人（比如"查理"）
- [ ] 浏览器已打开并登录
- [ ] 准备好演示脚本（见下）

### 演示脚本建议

1. **开场**（30秒）
   - "这是一个 AI 助手演示，可以帮我完成多步骤任务"

2. **演示流程**（2-3分钟）
   - 输入："给小虞学弟发个信息说明天吃什么"
   - 展示：方案生成（3步：查找联系人 → 发送消息）
   - 展示：权限审批（读取联系人、发送消息）
   - 点击"批准并执行"
   - 展示：执行日志（实时）
   - 展示：AI 回复（中文总结）

3. **亮点强调**（1分钟）
   - "可以看到，AI 自动分解了任务"
   - "每一步都有明确的工具调用"
   - "权限需要用户审批"
   - "执行过程完全透明"

4. **技术说明**（可选，1分钟）
   - "后端用 Node.js + WebSocket"
   - "前端 React"
   - "LLM 用本地 Ollama（或云 API）"
   - "支持 iMessage、SMS、企业微信等"

### 备用方案

如果演示时出问题：
- 准备一个**录屏视频**（提前录好完整流程）
- 准备**截图**展示各个界面
- 准备**本地版本**（如果网络问题）

---

## 🚨 常见问题

### Q: Railway/Render 部署失败？
A: 检查：
1. 环境变量是否正确
2. 构建日志中的错误信息
3. 确保 `railway.json` 或 `render.yaml` 存在

### Q: ngrok URL 每次都不一样？
A: 免费版确实会变。解决方案：
1. 付费 ngrok（固定域名）
2. 用 Railway/Render（固定 URL）
3. 会议前提前启动，URL 不变

### Q: Ollama 连接失败？
A: 
- 如果用 Docker：检查 `docker compose logs ollama`
- 如果用云 API：检查 API Key 和 URL

### Q: WebSocket 连接失败？
A:
- 确保用 `wss://`（HTTPS），不是 `ws://`
- 检查防火墙/安全组
- 检查 ngrok 是否正常运行

---

## ⚡ 最快方案（推荐用于紧急演示）

**5分钟快速启动**:

```bash
# 1. 确保 Docker 运行
open -a Docker

# 2. 启动服务
cd clawbot-image-demo
docker compose up -d

# 3. 等待 30 秒，然后测试
curl http://localhost:8080/health

# 4. 启动 ngrok（新终端）
ngrok http 80

# 5. 复制 ngrok URL，分享给 partner
```

**注意**: ngrok 免费版 URL 会变，但足够演示用。

---

## 📞 需要帮助？

如果遇到问题：
1. 查看日志：`docker compose logs -f`
2. 检查健康：`curl http://localhost:8080/health`
3. 重启服务：`docker compose restart`
