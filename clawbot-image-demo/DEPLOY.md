# 部署指南

## 方案 1: Railway 部署（推荐）

### 前置要求
- Railway 账号: https://railway.app
- GitHub 账号（用于连接仓库）

### 步骤

1. **准备代码**
   ```bash
   # 确保所有更改已提交
   git add .
   git commit -m "Prepare for deployment"
   git push
   ```

2. **连接 Railway**
   - 访问 https://railway.app
   - 点击 "New Project" → "Deploy from GitHub repo"
   - 选择你的仓库

3. **配置环境变量**
   在 Railway dashboard 的 Variables 标签页添加：
   ```
   NODE_ENV=production
   PORT=8080
   OLLAMA_URL=https://your-ollama-api.com  # 或使用云 Ollama 服务
   OLLAMA_MODEL=qwen2.5:1.5b
   ```

4. **构建前端**
   Railway 会自动运行 `server/package.json` 的 build 命令。
   但前端需要单独构建。有两个选择：

   **选项 A: 在 Railway 构建前端**
   - 修改 `railway.json` 的 buildCommand：
     ```json
     "buildCommand": "cd web && npm install && npm run build && cd ../server && npm install && npm run build"
     ```
   - 确保前端 build 输出在 `web/dist`，后端会 serve 它

   **选项 B: 本地构建前端后提交**
   ```bash
   cd web
   npm run build
   git add dist/
   git commit -m "Add frontend build"
   git push
   ```

5. **部署**
   - Railway 会自动检测到 push 并开始部署
   - 等待部署完成，Railway 会给你一个 URL（如 `https://your-app.railway.app`）

6. **设置前端 WebSocket URL**
   - 在部署前，设置环境变量 `VITE_WS_URL`：
   ```
   VITE_WS_URL=wss://your-app.railway.app
   ```
   - 或者在 `web/vite.config.ts` 中配置：
   ```typescript
   export default defineConfig({
     define: {
       'import.meta.env.VITE_WS_URL': JSON.stringify(process.env.VITE_WS_URL || 'ws://localhost:8080')
     }
   })
   ```

---

## 方案 2: Docker + VPS 部署

### 前置要求
- VPS（如 DigitalOcean, Linode, AWS EC2）
- Docker 和 Docker Compose

### 步骤

1. **创建 docker compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     backend:
       build: ./server
       ports:
         - "8080:8080"
       environment:
         - NODE_ENV=production
         - PORT=8080
         - OLLAMA_URL=http://ollama:11434
       volumes:
         - ./server/src/outbox:/app/src/outbox
       depends_on:
         - ollama
   
     ollama:
       image: ollama/ollama:latest
       ports:
         - "11434:11434"
       volumes:
         - ollama_data:/root/.ollama
   
     frontend:
       build: ./web
       ports:
         - "80:80"
       depends_on:
         - backend
   
   volumes:
     ollama_data:
   ```

2. **创建 web/Dockerfile**
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

3. **部署**
   ```bash
   # 在 VPS 上
   git clone <your-repo>
   cd clawbot-image-demo
   docker compose up -d
   ```

---

## 方案 3: Render 部署

### 步骤

1. **后端服务**
   - 在 Render 创建新的 Web Service
   - 连接 GitHub 仓库
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm start`
   - 环境变量：
     - `NODE_ENV=production`
     - `PORT=8080`
     - `OLLAMA_URL=...`

2. **前端静态站点**
   - 在 Render 创建 Static Site
   - Build Command: `cd web && npm install && npm run build`
   - Publish Directory: `web/dist`
   - 环境变量：
     - `VITE_WS_URL=wss://your-backend.onrender.com`

---

## 重要提示

### Ollama 配置

**选项 A: 使用云 Ollama API**
- 使用 OpenRouter, Together.ai 等提供的 Ollama API
- 设置 `OLLAMA_URL=https://api.openrouter.ai/v1`（示例）

**选项 B: 在同一服务器运行 Ollama**
- 在 VPS 上安装 Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
- 拉取模型: `ollama pull qwen2.5:1.5b`
- 设置 `OLLAMA_URL=http://localhost:11434`（如果同机）或 `http://ollama:11434`（如果 Docker）

**选项 C: Railway 插件**
- Railway 有 Ollama 插件，可以直接添加

### 安全注意事项

1. **iMessage 工具**: 云部署时无法访问 macOS Messages，需要：
   - 移除 `imessage.send` 和 `contacts.apple` 工具
   - 或使用 webhook/API 替代

2. **权限**: 确保环境变量不包含敏感信息

3. **HTTPS**: Railway/Render 自动提供 HTTPS，确保 WebSocket 使用 `wss://`

---

## 快速测试

部署后测试：
```bash
# 检查后端
curl https://your-app.railway.app/health

# 检查 WebSocket
wscat -c wss://your-app.railway.app
```
