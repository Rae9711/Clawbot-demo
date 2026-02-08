# 快速部署到 Railway（5 分钟）

## 步骤

### 1. 准备代码
```bash
# 构建前端（Railway 会自动构建，但本地先测试）
cd web
npm install
npm run build
cd ..
```

### 2. 连接 Railway
1. 访问 https://railway.app
2. 登录（用 GitHub）
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择你的仓库

### 3. 配置环境变量
在 Railway dashboard → Variables 添加：

```
NODE_ENV=production
PORT=8080
OLLAMA_URL=https://api.openrouter.ai/v1  # 或你的 Ollama API
OLLAMA_MODEL=qwen2.5:1.5b
```

**注意**: 如果使用云 Ollama API（如 OpenRouter），需要：
- 注册账号获取 API key
- 设置 `OLLAMA_URL` 和 `OLLAMA_API_KEY`

### 4. 部署
Railway 会自动：
- 检测到 `railway.json`
- 运行构建命令（构建前端 + 后端）
- 启动服务

### 5. 获取 URL
部署完成后，Railway 会给你一个 URL，比如：
```
https://your-app.up.railway.app
```

### 6. 设置前端 WebSocket
如果前端单独部署，需要设置：
```
VITE_WS_URL=wss://your-app.up.railway.app
```

如果前后端一起部署（后端 serve 前端），WebSocket 会自动使用同一域名。

---

## 测试

访问你的 Railway URL，应该能看到应用界面。

---

## 常见问题

**Q: Ollama 连接失败？**
A: 确保 `OLLAMA_URL` 指向可访问的 Ollama 服务。Railway 免费 tier 不支持运行 Ollama，需要：
- 使用云 Ollama API（OpenRouter, Together.ai）
- 或部署到 VPS（用 Docker Compose）

**Q: WebSocket 连接失败？**
A: 确保使用 `wss://`（HTTPS），不是 `ws://`。Railway 自动提供 HTTPS。

**Q: 前端显示空白？**
A: 检查浏览器控制台错误。确保 `VITE_WS_URL` 环境变量正确设置。

---

## 下一步

部署成功后，你可以：
- 分享 URL 给 partner
- 设置自定义域名（Railway Pro）
- 监控日志和性能（Railway dashboard）
