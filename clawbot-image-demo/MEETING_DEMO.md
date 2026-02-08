# 会议演示操作指南

## ⏱️ 时间规划
- **准备时间**: 15-20 分钟
- **演示时间**: 5-7 分钟

---

## 🚀 最快部署方案（推荐）

### 方案：本地 Docker + ngrok（10分钟搞定）

#### 步骤 1: 检查环境（2分钟）

```bash
# 检查 Docker 是否运行
docker ps
# 如果报错，打开 Docker Desktop 应用

# 检查 ngrok
ngrok --version
# 如果没有，安装: brew install ngrok
# 注册: https://ngrok.com (免费)
# 获取 token: ngrok config add-authtoken 你的token
```

#### 步骤 2: 启动服务（3分钟）

```bash
cd /Users/wanghaorui/worktrees/clawbot-fix/upg/clawbot-image-demo

# 创建 .env（如果还没有）
cat > .env << 'EOF'
BACKEND_PORT=8080
FRONTEND_PORT=80
OLLAMA_PORT=11434
VITE_WS_URL=ws://localhost:8080
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:1.5b
EOF

# 启动所有服务
docker compose up -d

# 等待 10 秒让服务启动
sleep 10

# 检查服务状态
docker compose ps
# 应该看到 3 个服务：backend, ollama, frontend
```

#### 步骤 3: 拉取 Ollama 模型（3-5分钟，首次需要）

```bash
# 查看 Ollama 日志
docker compose logs ollama

# 拉取模型（首次需要几分钟）
docker compose exec ollama ollama pull qwen2.5:1.5b

# 验证模型已下载
docker compose exec ollama ollama list
# 应该看到 qwen2.5:1.5b
```

#### 步骤 4: 暴露到公网（2分钟）

**打开两个新终端窗口**：

**终端 1 - 暴露前端**:
```bash
ngrok http 80
# 复制显示的 URL，比如: https://abc123.ngrok-free.app
```

**终端 2 - 暴露后端**:
```bash
ngrok http 8080
# 复制显示的 URL，比如: https://def456.ngrok-free.app
```

#### 步骤 5: 更新前端配置（1分钟）

```bash
# 编辑 .env，把 VITE_WS_URL 改成后端的 ngrok URL（用 wss://）
# 比如: VITE_WS_URL=wss://def456.ngrok-free.app

# 重启前端以应用新配置
docker compose restart frontend

# 等待 5 秒
sleep 5
```

#### 步骤 6: 测试（2分钟）

1. **访问前端 URL**（终端 1 显示的 ngrok URL）
2. **应该看到界面**
3. **测试发送消息**：
   - 输入："给小虞学弟发个信息说明天吃什么"
   - 点击"生成方案"
   - 等待方案生成（15-30秒）
   - 检查权限
   - 点击"批准并执行"
   - 等待执行完成

如果一切正常，✅ **准备完成！**

---

## 📋 会议演示清单

### 演示前（5分钟检查）

- [ ] 服务正常运行：`docker compose ps` 显示 3 个服务都是 "Up"
- [ ] 前端可访问：浏览器打开 ngrok URL，看到界面
- [ ] 后端健康：`curl http://localhost:8080/health` 返回 `{"status":"ok"}`
- [ ] Ollama 正常：`curl http://localhost:11434/api/tags` 返回模型列表
- [ ] 测试消息发送成功（至少一次完整流程）
- [ ] ngrok 终端保持运行（不要关闭）
- [ ] 准备好演示用的联系人（确保"小虞学弟"在 Apple Contacts 里）

### 演示脚本（5-7分钟）

#### 1. 开场（30秒）
> "这是一个 AI 助手演示项目。它可以理解自然语言指令，自动分解成多个步骤，调用不同的工具来完成复杂任务。"

#### 2. 展示界面（30秒）
> "这是主界面。左侧是输入区域，右侧是执行日志和 AI 回复。顶部有进度条显示当前阶段。"

#### 3. 输入指令（30秒）
> "比如我想给小虞学弟发个消息，说明天吃什么。"
- 在输入框输入："给小虞学弟发个信息说明天吃什么"
- 点击"生成方案"

#### 4. 展示方案（1分钟）
> "AI 自动生成了一个执行方案，包含 2 个步骤：
> 1. 从 Apple 通讯录查找小虞学弟
> 2. 通过 iMessage 发送消息
> 
> 可以看到，系统识别出需要两个权限：读取联系人和发送消息。用户需要批准这些权限才能执行。"

#### 5. 执行（1分钟）
> "点击'批准并执行'后，系统会：
> - 先查找联系人（从真实的 Apple Contacts）
> - 然后发送 iMessage（真的发送，不是模拟）
> 
> 执行日志实时显示每一步的状态。"

#### 6. 展示结果（30秒）
> "执行完成后，AI 会用中文总结整个过程。可以看到，消息真的发出去了。"

#### 7. 技术亮点（1-2分钟）
> "这个系统的核心特点：
> - **多步骤规划**：AI 自动分解任务
> - **工具注册系统**：支持多种工具（文本生成、图片生成、联系人查找、消息发送）
> - **权限审批**：用户控制权限
> - **变量传递**：步骤间数据自动流转
> - **确定性执行**：执行过程不依赖 LLM，完全可追踪"

#### 8. 架构说明（可选，1分钟）
> "技术栈：
> - 后端：Node.js + WebSocket + Express
> - 前端：React + TypeScript
> - LLM：本地 Ollama（或云 API）
> - 部署：Docker Compose
> 
> 架构设计参考了 OpenClaw 的最佳实践。"

---

## 🎯 演示要点

### 必须展示的
1. ✅ **方案生成** - AI 自动分解任务
2. ✅ **权限审批** - 用户控制
3. ✅ **执行日志** - 透明可追踪
4. ✅ **真实发送** - 不是模拟

### 可以强调的
- 支持多平台（iMessage, SMS, 企业微信等）
- 工具可扩展（注册新工具很简单）
- 变量自动传递（步骤间数据流）
- 错误处理（失败也会记录）

---

## 🚨 应急方案

### 如果演示时出问题

**Plan A: 切换到录屏**
- 提前录好完整流程（用 QuickTime 或 OBS）
- 如果现场出问题，播放录屏

**Plan B: 展示截图**
- 准备关键界面的截图
- 可以快速切换展示

**Plan C: 本地演示**
- 如果网络问题，直接用 `http://localhost`
- 让 partner 在你电脑上看

---

## 📱 分享给 Partner

### 方式 1: 分享 ngrok URL
```
前端: https://abc123.ngrok-free.app
（他们可以直接访问）
```

### 方式 2: 让他们也部署
```
1. git clone <your-repo>
2. docker compose up -d
3. 访问 http://localhost
```

### 方式 3: 部署到 Railway/Render
```
给他们一个固定的 URL（见 DEPLOY_STEPS.md）
```

---

## ✅ 最终检查清单

**演示前 10 分钟**:
- [ ] 所有服务运行正常
- [ ] 测试消息发送成功
- [ ] ngrok URL 已准备好
- [ ] 浏览器已打开并登录
- [ ] 演示脚本已熟悉

**演示中**:
- [ ] 保持 ngrok 终端打开
- [ ] 如果卡住，查看日志：`docker compose logs -f`
- [ ] 准备应急方案（录屏/截图）

**演示后**:
- [ ] 保存 ngrok URL（如果 partner 想测试）
- [ ] 记录问题和反馈

---

## 💡 小贴士

1. **提前测试**：至少提前 1 小时测试一次完整流程
2. **准备联系人**：确保"小虞学弟"在通讯录里，有手机号
3. **网络稳定**：确保网络连接稳定（ngrok 需要网络）
4. **备用方案**：准备录屏，以防万一
5. **简洁演示**：控制在 5-7 分钟，留时间给 Q&A

---

## 🎬 成功演示的关键

- **流畅**：提前测试，确保不卡顿
- **真实**：真的发送消息，不是模拟
- **透明**：展示执行日志，让过程可见
- **互动**：可以现场改指令，展示灵活性

Good luck! 🚀
