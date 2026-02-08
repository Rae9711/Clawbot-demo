# Partner 无法访问 - 修复指南

## 🔍 快速诊断

运行诊断脚本：
```bash
cd ~/worktrees/clawbot-fix/clawbot-image-demo
bash check-access.sh
```

## 🚨 常见问题和解决方案

### 问题 1: ngrok URL 没有正确配置

**症状**: Partner 能打开页面，但 WebSocket 连接失败

**解决**:
```bash
# 1. 获取后端的 ngrok URL（终端 2）
# 比如: https://def456.ngrok-free.app

# 2. 更新 .env
cat >> .env << 'EOF'
VITE_WS_URL=wss://def456.ngrok-free.app
EOF

# 3. 重启前端
docker compose restart frontend

# 4. 等待 5 秒
sleep 5
```

**验证**:
- 打开浏览器开发者工具（F12）
- 查看 Console，应该看到 WebSocket 连接成功
- 如果看到 `ws://localhost:8080`，说明配置没生效

---

### 问题 2: ngrok 没有运行

**症状**: Partner 完全无法打开链接（404 或连接超时）

**解决**:
```bash
# 确保两个 ngrok 都在运行

# 终端 1
ngrok http 80
# 复制显示的 URL（前端）

# 终端 2  
ngrok http 8080
# 复制显示的 URL（后端）
```

**验证**:
- 访问 ngrok 管理界面: http://localhost:4040
- 应该看到两个 tunnel（80 和 8080）

---

### 问题 3: 前端构建时环境变量未设置

**症状**: 即使更新了 .env，WebSocket 还是连 localhost

**原因**: Vite 在构建时注入环境变量，运行时改 .env 无效

**解决**:
```bash
# 1. 确保 .env 中有正确的 VITE_WS_URL
cat .env | grep VITE_WS_URL

# 2. 重新构建前端
docker compose build frontend

# 3. 重启
docker compose restart frontend
```

---

### 问题 4: ngrok 免费版需要点击"Visit Site"

**症状**: Partner 打开链接看到 ngrok 警告页面

**解决**:
- ngrok 免费版会显示警告页面
- 点击 "Visit Site" 按钮即可
- 或者升级到付费版（固定域名，无警告）

---

### 问题 5: 防火墙/网络问题

**症状**: Partner 的网络无法访问 ngrok

**解决**:
- 检查 partner 的网络是否限制访问
- 尝试用手机热点测试
- 或者部署到 Railway/Render（固定 URL）

---

## ✅ 完整修复流程

### 步骤 1: 确保 ngrok 运行

```bash
# 检查 ngrok 进程
ps aux | grep ngrok

# 如果没有，启动两个终端：
# 终端 1: ngrok http 80
# 终端 2: ngrok http 8080
```

### 步骤 2: 获取 ngrok URL

```bash
# 方法 1: 查看 ngrok 终端输出
# 方法 2: 访问管理界面
open http://localhost:4040
```

### 步骤 3: 更新配置

```bash
cd ~/worktrees/clawbot-fix/clawbot-image-demo

# 编辑 .env，确保 VITE_WS_URL 是后端的 ngrok URL（wss://）
nano .env
# 或
open -e .env
```

**重要**: 
- 使用 `wss://`（HTTPS），不是 `ws://`
- 使用**后端**的 ngrok URL，不是前端的

### 步骤 4: 重启前端

```bash
docker compose restart frontend
sleep 5
```

### 步骤 5: 测试

1. **本地测试**:
   ```bash
   open http://localhost
   # 打开浏览器开发者工具，检查 WebSocket 连接
   ```

2. **ngrok URL 测试**:
   - 访问前端的 ngrok URL
   - 检查 Console 是否有错误
   - 测试发送消息

---

## 🎯 最简单的解决方案（如果 ngrok 有问题）

### 选项 A: 使用 Railway（固定 URL）

1. 部署到 Railway（见 `DEPLOY_STEPS.md`）
2. 获得固定 URL
3. 分享给 partner

### 选项 B: 本地演示

如果 partner 在同一个网络：
```bash
# 1. 查找你的本地 IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# 2. 修改 docker-compose.yml，绑定到 0.0.0.0
# 3. Partner 访问: http://你的IP:80
```

### 选项 C: 屏幕共享

- 用 Zoom/Teams 屏幕共享
- 你在本地演示，partner 看你的屏幕

---

## 📞 需要帮助？

运行诊断脚本并告诉我结果：
```bash
bash check-access.sh
```

然后告诉我：
1. ngrok 是否在运行？
2. .env 中的 VITE_WS_URL 是什么？
3. Partner 看到什么错误信息？
