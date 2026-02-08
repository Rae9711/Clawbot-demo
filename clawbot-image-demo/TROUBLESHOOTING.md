# 故障排除指南

## 快速诊断

运行全面诊断脚本：

```bash
./check-everything.sh
```

这会检查所有关键组件并给出修复建议。

## 常见问题

### 1. 端口被占用

**症状**: `Error: listen EADDRINUSE: address already in use :::8080`

**解决**:
```bash
# 使用脚本
./fix-port-8080.sh

# 或手动
lsof -ti:8080 | xargs kill -9
```

### 2. 后端无法访问通讯录

**症状**: `[missing: contact.handle]` 或 `无法访问 Apple 通讯录`

**原因**: macOS 权限未授予

**解决**:
1. 打开 **系统设置** > **隐私与安全性** > **通讯录**
2. 勾选 **Terminal**（或你使用的终端应用）
3. 重新运行任务

**验证**:
```bash
./check-permissions.sh
```

### 3. 后端无法发送 iMessage

**症状**: `iMessage 发送失败: Command failed`

**原因**: macOS 辅助功能权限未授予

**解决**:
1. 打开 **系统设置** > **隐私与安全性** > **辅助功能**
2. 勾选 **Terminal**（或你使用的终端应用）
3. 重新运行任务

### 4. Ollama 未运行

**症状**: `fetch failed` 或连接超时

**解决**:
```bash
# 检查 Ollama
curl http://localhost:11434/api/tags

# 启动 Ollama
ollama serve

# 或打开 Ollama 应用
open -a Ollama

# 确保模型已下载
ollama pull qwen2.5:1.5b
```

### 5. 变量解析失败

**症状**: `[missing: contact.handle]` 即使第一步执行了

**原因**: 
- 第一步返回了错误结果（`found: false`）
- 但错误检测逻辑没有正确识别

**解决**:
1. 检查后端日志，查找 `[execute] Step s1 error check:`
2. 确认 `hasError` 是否为 `true`
3. 如果为 `false`，检查结果格式是否正确

**查看日志**:
```bash
# 在后端终端中查看，或
# 如果使用 Docker
docker compose logs backend --tail 100 | grep -E "\[execute\]|error check"
```

### 6. 依赖未安装

**症状**: `Cannot find module` 或 `command not found: npm`

**解决**:
```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../web
npm install
```

### 7. 环境变量未设置

**症状**: 使用默认值（如 `qwen2.5:7b` 而不是 `qwen2.5:1.5b`）

**解决**:
```bash
# 创建 .env.local
cat > .env.local << 'EOF'
PORT=8080
NODE_ENV=development
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b
VITE_WS_URL=ws://localhost:8080
EOF

# 重启服务
```

## 完整启动流程

### 步骤 1: 检查环境

```bash
./check-everything.sh
```

### 步骤 2: 修复发现的问题

根据诊断结果修复问题。

### 步骤 3: 启动服务

**终端 1 - 后端**:
```bash
./start-backend.sh
```

**终端 2 - 前端**:
```bash
./start-frontend.sh
```

### 步骤 4: 测试

1. 访问 `http://localhost:5173`
2. 输入任务："给查理发一个消息说这个demo好了"
3. 检查执行日志

### 步骤 5: 如果失败

1. **查看后端日志**（在运行后端的终端）
2. **查找错误信息**:
   - `[execute] Step s1 error check:` - 查看错误检测
   - `[execute] Saved result to vars[contact]:` - 查看变量保存
   - `[execute] Step s2 resolving vars:` - 查看变量解析

3. **检查权限**:
   ```bash
   ./check-permissions.sh
   ```

## 调试技巧

### 启用详细日志

后端已经包含详细的调试日志：
- `[execute] Step X error check:` - 错误检测
- `[execute] Saved result to vars[X]:` - 变量保存
- `[execute] Step X resolving vars:` - 变量解析

### 检查变量值

在后端日志中查找：
```
[execute] Step s2 resolving vars, current vars: [ 'contact' ]
[execute] Step s2 resolved args: {"handle":"[error: contact.handle - ...]","recipientName":"查理",...}
```

### 检查工具结果

在后端日志中查找：
```
[execute] Saved result to vars[contact]: {"found":false,"name":"查理","error":"无法访问 Apple 通讯录: ..."}
```

## 如果仍然无法解决

1. **收集信息**:
   - 运行 `./check-everything.sh` 的输出
   - 后端终端的完整日志
   - 前端浏览器的 Console 日志（F12）

2. **检查代码版本**:
   ```bash
   git log --oneline -5
   ```

3. **重新安装依赖**:
   ```bash
   cd server && rm -rf node_modules package-lock.json && npm install
   cd ../web && rm -rf node_modules package-lock.json && npm install
   ```

4. **重启所有服务**:
   - 停止所有进程
   - 重新启动 Ollama
   - 重新启动后端和前端
