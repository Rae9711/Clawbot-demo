# 🎯 会议演示 - 从这里开始

## ⚡ 最快方式（10分钟）

### 0. 安装 Docker（如果还没有）

**如果看到 "docker: command not found"**，先安装 Docker：

```bash
# 方法 1: 用 Homebrew（推荐）
brew install --cask docker
open -a Docker

# 方法 2: 手动下载
# 访问 https://www.docker.com/products/docker-desktop
# 下载并安装 Docker Desktop for Mac
```

**等待 Docker Desktop 启动**（菜单栏会出现 Docker 图标，约 30-60 秒）

**验证安装**:
```bash
docker --version
docker ps  # 应该不报错
```

详细安装说明见 `INSTALL_DOCKER.md`

---

### 1. 启动服务

```bash
cd /Users/wanghaorui/worktrees/clawbot-fix/upg/clawbot-image-demo

# 创建配置文件
cat > .env << 'EOF'
BACKEND_PORT=8080
FRONTEND_PORT=80
OLLAMA_PORT=11434
VITE_WS_URL=ws://localhost:8080
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:1.5b
EOF

# 启动服务（注意：docker compose，不是 docker-compose）
docker compose up -d

# 等待 10 秒
sleep 10

# 拉取模型（首次需要 3-5 分钟）
docker compose exec ollama ollama pull qwen2.5:1.5b
```

### 2. 暴露到公网（ngrok）

**打开两个新终端窗口**：

**终端 1**:
```bash
ngrok http 80
# 复制显示的 URL（比如 https://abc123.ngrok-free.app）
```

**终端 2**:
```bash
ngrok http 8080
# 复制显示的 URL（比如 https://def456.ngrok-free.app）
```

**如果没有 ngrok**:
```bash
# 安装
brew install ngrok

# 注册（免费）: https://ngrok.com
# 获取 token，然后运行:
ngrok config add-authtoken 你的token
```

### 3. 更新前端配置

```bash
# 编辑 .env，把 VITE_WS_URL 改成后端的 ngrok URL（用 wss://）
# 比如: VITE_WS_URL=wss://def456.ngrok-free.app

# 重启前端
docker compose restart frontend
```

### 4. 测试

访问**终端 1**显示的 ngrok URL，应该能看到界面。

---

## 📱 分享给 Partner

把**终端 1**的 ngrok URL 发给他们，他们可以直接访问。

**注意**: ngrok 免费版 URL 会变，但足够演示用。

---

## 🎤 演示脚本（5分钟）

1. **开场**（30秒）
   - "这是一个 AI 助手，可以自动分解任务并执行"

2. **输入指令**（30秒）
   - 输入："给小虞学弟发个信息说明天吃什么"
   - 点击"生成方案"

3. **展示方案**（1分钟）
   - 展示 2 步计划
   - 展示权限审批

4. **执行**（1分钟）
   - 点击"批准并执行"
   - 展示执行日志

5. **结果**（30秒）
   - 展示 AI 回复
   - 强调"真的发送了"

6. **技术亮点**（1-2分钟）
   - 多步骤规划
   - 工具注册系统
   - 权限控制

---

## 🚨 如果出问题

**查看日志**:
```bash
docker compose logs -f backend
```

**重启服务**:
```bash
docker compose restart
```

**检查健康**:
```bash
curl http://localhost:8080/health
```

**Docker 未运行**:
```bash
open -a Docker  # 打开 Docker Desktop
```

---

## 📖 更多信息

- **Docker 安装**: 见 `INSTALL_DOCKER.md`
- **详细部署**: 见 `DEPLOY_STEPS.md`
- **Docker 配置**: 见 `DOCKER.md`
- **完整演示指南**: 见 `MEETING_DEMO.md`

---

## ✅ 演示前检查

- [ ] Docker 已安装并运行（`docker ps` 不报错）
- [ ] 服务已启动（`docker compose ps`）
- [ ] ngrok URL 已准备好
- [ ] 测试发送消息成功
- [ ] 浏览器已打开

**准备好了！Good luck! 🚀**
