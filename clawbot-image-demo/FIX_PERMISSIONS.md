# 修复 macOS 权限问题

## 问题

当运行 `contacts.apple` 或 `imessage.send` 工具时，可能会遇到权限错误：
- `无法访问 Apple 通讯录`
- `iMessage 发送失败`

这是因为 macOS 需要明确授权才能访问通讯录和发送消息。

## 解决方案

### 1. 授予通讯录访问权限

**方法 A：通过系统设置（推荐）**

1. 打开 **系统设置** (System Settings)
2. 进入 **隐私与安全性** (Privacy & Security)
3. 选择 **通讯录** (Contacts)
4. 找到并勾选以下应用（根据你的运行方式选择）：
   - **Terminal**（如果直接在终端运行）
   - **iTerm**（如果使用 iTerm）
   - **Docker Desktop**（如果通过 Docker 运行）
   - **Node.js**（如果直接运行 Node.js）

**方法 B：通过终端测试触发权限提示**

在终端运行以下命令，macOS 会弹出权限请求：

```bash
osascript -l JavaScript -e 'Application("Contacts").people()[0].name()'
```

当弹出权限请求时，点击 **"好"** (Allow)。

### 2. 授予辅助功能权限（用于发送 iMessage）

**方法 A：通过系统设置**

1. 打开 **系统设置** (System Settings)
2. 进入 **隐私与安全性** (Privacy & Security)
3. 选择 **辅助功能** (Accessibility)
4. 找到并勾选：
   - **Terminal** / **iTerm** / **Docker Desktop** / **Node.js**

**方法 B：通过终端测试触发权限提示**

在终端运行以下命令：

```bash
osascript -e 'tell application "Messages" to get name of every service'
```

当弹出权限请求时，点击 **"好"** (Allow)。

### 3. 如果使用 Docker

Docker 容器内的进程通过 `osascript` 访问系统资源时，macOS 会检查**宿主机的应用权限**。

**重要**：需要授予 **Docker Desktop** 或运行 Docker 的**终端应用**的权限，而不是容器内的进程。

**检查 Docker 是否在运行**：

```bash
docker ps
```

**测试权限**：

```bash
# 测试通讯录访问
docker compose exec backend osascript -l JavaScript -e 'Application("Contacts").people()[0].name()'

# 测试 Messages 访问
docker compose exec backend osascript -e 'tell application "Messages" to get name of every service'
```

如果权限未授予，macOS 会弹出提示，点击 **"好"**。

### 4. 验证权限

**测试通讯录访问**：

```bash
# 直接在终端
osascript -l JavaScript -e 'Application("Contacts").people()[0].name()'

# 通过 Docker
docker compose exec backend osascript -l JavaScript -e 'Application("Contacts").people()[0].name()'
```

**测试 iMessage 访问**：

```bash
# 直接在终端
osascript -e 'tell application "Messages" to get name of every service'

# 通过 Docker
docker compose exec backend osascript -e 'tell application "Messages" to get name of every service'
```

如果权限正确，应该能看到输出而不是错误。

## 常见问题

### Q: 为什么 Docker 容器需要权限？

A: Docker 容器内的进程通过 `osascript` 访问 macOS 系统资源时，macOS 会检查**宿主机应用**的权限。需要授予运行 Docker 的应用（Docker Desktop 或终端）的权限。

### Q: 我已经授予了权限，但还是失败？

A: 尝试以下步骤：

1. **重启 Docker Desktop**：
   ```bash
   # 停止所有容器
   docker compose down
   
   # 重启 Docker Desktop（通过菜单或）
   # 然后重新启动
   docker compose up -d
   ```

2. **检查权限设置**：
   - 确保在 **系统设置 > 隐私与安全性 > 通讯录** 中勾选了正确的应用
   - 确保在 **系统设置 > 隐私与安全性 > 辅助功能** 中勾选了正确的应用

3. **清除权限缓存**（谨慎操作）：
   ```bash
   # 重置通讯录权限（需要管理员密码）
   tccutil reset Contacts
   
   # 重置辅助功能权限
   tccutil reset Accessibility
   ```
   然后重新授予权限。

### Q: 如何知道哪个应用需要权限？

A: 当运行命令时，macOS 会弹出权限请求对话框，显示需要权限的应用名称。通常是你运行 Docker 的终端应用或 Docker Desktop。

## 快速检查脚本

运行以下脚本检查权限状态：

```bash
cd ~/worktrees/clawbot-fix/clawbot-image-demo
./check-permissions.sh
```

（如果脚本不存在，可以手动运行上面的测试命令）

## 如果仍然失败

如果按照以上步骤操作后仍然失败，请：

1. 检查后端日志：
   ```bash
   docker compose logs backend --tail 50 | grep -i "contact\|permission\|error"
   ```

2. 提供错误信息，包括：
   - 完整的错误消息
   - 运行环境（Docker 还是直接运行）
   - 系统版本（`sw_vers`）
