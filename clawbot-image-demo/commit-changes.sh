#!/bin/bash
# 提交所有更改到 GitHub（带详细注释）

set -e

cd "$(dirname "$0")"

echo "📝 准备提交更改到 GitHub"
echo "========================"
echo ""

# 检查是否有未提交的更改
if [ -z "$(git status --porcelain)" ]; then
  echo "✅ 没有需要提交的更改"
  exit 0
fi

# 1. 添加核心执行逻辑改进
echo "1️⃣  提交核心执行逻辑改进..."
git add server/src/agent/execute.ts
git commit -m "fix(execute): 改进错误检测和变量解析逻辑

- 简化错误检测：found === false 或 error 存在即标记为错误
- 改进变量解析：先检查 found === false，再检查字段是否存在
- 添加详细调试日志：error check, vars saving, vars resolving
- 修复变量解析顺序问题，确保失败的工具结果正确显示错误信息
- 改进错误信息：显示可用字段列表，帮助调试"

# 2. 添加工具注册和执行存储
echo "2️⃣  提交工具注册和执行存储..."
git add server/src/agent/executeStore.ts
git commit -m "feat(executeStore): 添加执行结果存储结构

- 定义 StepResult 和 ExecutionSummary 类型
- 更新 RunRecord 存储 executionSummary 和 toolResults
- 支持结构化执行收据，便于 Reporter 使用"

# 3. 添加 Ollama 集成改进
echo "3️⃣  提交 Ollama 集成改进..."
git add server/src/agent/ollama.ts
git commit -m "feat(ollama): 改进 LLM 调用和错误处理

- 添加 fetchWithRetry 支持超时和指数退避
- 支持 OpenRouter/Together API（云部署）
- 角色化配置：planner, reporter, styler, tool 使用不同模型和温度
- 更新系统提示为中文，明确输出格式要求
- 优化模型选择：planner/reporter/styler 使用 1.5b 模型提升性能"

# 4. 添加计划生成改进
echo "4️⃣  提交计划生成改进..."
git add server/src/agent/plan.ts
git commit -m "feat(plan): 改进计划生成和验证

- 添加 normalizePlanDraft 处理 1.5b 模型的多样化 JSON 输出
- 自动推断 saveAs：为产生数据的工具自动设置 saveAs
- 清理 saveAs 值：移除 {{vars.}} 包装和字段访问
- 过滤不需要的 file.save 步骤（如果用户未明确要求）
- 更新 planner 指令：添加平台特定示例（iMessage, SMS）
- 改进工具目录过滤：根据平台过滤可用工具"

# 5. 添加渲染逻辑
echo "5️⃣  提交渲染逻辑..."
git add server/src/agent/render.ts
git commit -m "feat(render): 实现两阶段渲染（Reporter + Styler）

- Reporter：中性、事实性，生成最终答案
- Styler：可选，根据 persona 重写风格
- 分离内容和风格，避免事实漂移"

# 6. 添加 Persona 系统
echo "6️⃣  提交 Persona 系统..."
git add server/src/agent/persona.ts
git commit -m "feat(persona): 实现 StyleCard 定义系统

- 替换硬编码模板为 StyleCard 定义
- 支持不同风格：专业、友好、直接、极客"

# 7. 添加工具注册系统
echo "7️⃣  提交工具注册系统..."
git add server/src/agent/tools/
git commit -m "feat(tools): 实现完整的工具注册系统

- registry.ts: 工具注册和权限管理
- contacts.apple: 读取真实 macOS 通讯录（JXA）
- contacts.lookup: Mock 联系人数据库
- imessage.send: 发送真实 iMessage（AppleScript）
- sms.send: 发送 SMS（写入 outbox）
- text.generate: 文本生成（Ollama）
- image.generate: 图片生成（Ollama）
- platform.send: 平台消息发送（写入 outbox）
- file.save: 文件保存
- 所有工具支持权限声明和参数验证"

# 8. 添加服务器主文件改进
echo "8️⃣  提交服务器主文件改进..."
git add server/src/index.ts
git commit -m "feat(server): 改进服务器配置和错误处理

- 导入工具注册：启动时注册所有工具
- 传递 platform 参数到 planner
- 添加静态文件服务（生产环境）
- 添加 /health 端点
- 改进错误处理：renderFinal 失败时优雅降级
- 支持环境变量 PORT（默认 8080）"

# 9. 添加 Sandbox 改进
echo "9️⃣  提交 Sandbox 改进..."
git add server/src/sandbox/sandboxRunner.ts
git commit -m "fix(sandbox): 修复 TypeScript 类型错误

- 修复 timer 变量可能未定义的错误
- 明确声明 timer 类型为 NodeJS.Timeout | undefined"

# 10. 添加前端核心组件
echo "🔟 提交前端核心组件..."
git add web/src/App.tsx web/src/api/ws.ts web/src/components/
git commit -m "feat(frontend): 实现完整的 AI CHINA 前端界面

- App.tsx: 主应用逻辑，支持设置屏幕和主屏幕
- 阶段指示器：planning, executing, rendering
- 权限审批：显示所需权限，用户批准后执行
- WebSocket 自动重连
- 平台选择：iMessage, SMS, 平台
- ws.ts: WebSocket 客户端，支持自动重连和消息队列
- ProposedPlan: 显示计划步骤、权限、依赖关系
- ExecutionLog: 时间线样式的执行日志
- FinalAnswer: AI 回复显示，支持风格切换"

# 11. 添加前端配置
echo "1️⃣1️⃣ 提交前端配置..."
git add web/vite.config.ts web/index.html
git commit -m "feat(frontend): 配置前端构建和部署

- vite.config.ts: 支持 VITE_WS_URL 环境变量
- index.html: 更新页面标题和样式
- 支持生产环境 WebSocket URL 配置"

# 12. 添加 Docker 配置
echo "1️⃣2️⃣ 提交 Docker 配置..."
git add docker-compose.yml server/Dockerfile web/Dockerfile
git commit -m "feat(docker): 添加 Docker 部署配置

- docker-compose.yml: 后端、前端、Ollama 服务编排
- server/Dockerfile: Node.js 22, 包含前端构建，非 root 用户
- web/Dockerfile: Nginx 服务前端静态文件，SPA 路由支持
- 健康检查、命名卷、依赖管理"

# 13. 添加部署文档
echo "1️⃣3️⃣ 提交部署文档..."
git add DEPLOY.md DEPLOY_STEPS.md DOCKER.md QUICK_DEPLOY.md railway.json render.yaml
git commit -m "docs(deploy): 添加详细的部署文档

- DEPLOY.md: Railway 和 Render 部署指南
- DEPLOY_STEPS.md: 分步部署说明
- DOCKER.md: Docker 部署详细指南
- QUICK_DEPLOY.md: Railway 快速部署
- railway.json: Railway 配置
- render.yaml: Render 配置"

# 14. 添加本地运行文档
echo "1️⃣4️⃣ 提交本地运行文档..."
git add RUN_LOCAL.md START_HERE.md
git commit -m "docs(local): 添加本地运行指南

- RUN_LOCAL.md: 本地运行详细说明（不使用 Docker）
- START_HERE.md: 快速开始指南
- 说明如何访问 macOS 系统权限"

# 15. 添加故障排除文档
echo "1️⃣5️⃣ 提交故障排除文档..."
git add TROUBLESHOOTING.md FIX_PERMISSIONS.md FIX_ACCESS.md INSTALL_DOCKER.md MEETING_DEMO.md
git commit -m "docs(troubleshooting): 添加故障排除和演示指南

- TROUBLESHOOTING.md: 全面故障排除指南
- FIX_PERMISSIONS.md: macOS 权限设置指南
- FIX_ACCESS.md: Partner 访问问题解决
- INSTALL_DOCKER.md: Docker 安装指南
- MEETING_DEMO.md: 会议演示脚本和准备"

# 16. 添加工具脚本
echo "1️⃣6️⃣ 提交工具脚本..."
git add *.sh check-*.sh fix-*.sh start-*.sh setup-*.sh install-*.sh debug-*.sh
git commit -m "feat(scripts): 添加开发和部署辅助脚本

- check-everything.sh: 全面系统诊断
- check-permissions.sh: 权限检查
- check-services.sh: 服务状态检查
- check-execution.sh: 执行日志检查
- fix-port-8080.sh: 端口占用修复
- start-backend.sh: 启动后端（本地）
- start-frontend.sh: 启动前端（本地）
- start-local.sh: 本地启动助手
- setup-single-ngrok.sh: 单 ngrok 设置
- 其他辅助脚本"

# 17. 添加配置和忽略文件
echo "1️⃣7️⃣ 提交配置和忽略文件..."
git add .gitignore .env.example server/src/outbox/.gitkeep
git commit -m "chore(config): 添加配置和忽略文件

- .gitignore: 忽略 node_modules, dist, .env, .DS_Store
- .env.example: 环境变量模板
- server/src/outbox/.gitkeep: 确保 outbox 目录存在"

# 18. 添加 README
echo "1️⃣8️⃣ 提交 README..."
git add README.md
git commit -m "docs(readme): 添加项目 README

- 项目介绍和架构说明
- 快速开始指南
- 功能特性说明"

echo ""
echo "✅ 所有更改已提交！"
echo ""
echo "📋 提交摘要："
git log --oneline -18
echo ""
echo "🚀 推送到 GitHub："
echo "   git push origin clawbot-fix"
echo ""
read -p "是否现在推送到 GitHub？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git push origin clawbot-fix
  echo ""
  echo "✅ 已推送到 GitHub！"
else
  echo ""
  echo "💡 稍后可以运行: git push origin clawbot-fix"
fi
