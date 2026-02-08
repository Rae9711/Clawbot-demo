# Clawbot Image Demo

AI 助手演示项目 - 支持 iMessage、SMS、企业微信等多平台消息发送。

## 快速开始

### Docker 部署（推荐）

```bash
# 1. 克隆仓库
git clone <your-repo>
cd clawbot-image-demo

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 启动
./docker-start.sh

# 或手动启动
docker compose up -d
```

访问 http://localhost 即可使用。

详细部署指南见 [DOCKER.md](./DOCKER.md)

### 本地开发

```bash
# 后端
cd server
npm install
npm run dev  # 运行在 http://localhost:8080

# 前端（新终端）
cd web
npm install
npm run dev  # 运行在 http://localhost:5173
```

## 功能特性

- ✅ 多步骤任务规划（Planner → Executor → Reporter）
- ✅ 工具注册系统（text.generate, image.generate, contacts, messaging）
- ✅ 权限审批流程
- ✅ 变量传递（步骤间数据流）
- ✅ iMessage 集成（macOS）
- ✅ 多平台支持（iMessage, SMS, 企业微信, 钉钉, 飞书）

## 架构

```
用户输入 → Planner (LLM) → 执行计划
                ↓
         工具注册表
                ↓
         Executor (确定性执行)
                ↓
         Reporter (LLM) → 最终回复
```

## 部署选项

- **Docker Compose**: 本地/VPS 部署（见 [DOCKER.md](./DOCKER.md)）
- **Railway**: 云部署（见 [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)）
- **Render**: 云部署（见 [DEPLOY.md](./DEPLOY.md)）

## 文档

- [DOCKER.md](./DOCKER.md) - Docker 部署详细指南
- [DEPLOY.md](./DEPLOY.md) - 云服务部署指南
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Railway 快速部署

## 参考

本项目参考了 [OpenClaw](https://github.com/openclaw/openclaw) 的部署方式。
