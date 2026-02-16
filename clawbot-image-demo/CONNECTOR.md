# Connector 模式（云端控制台 + 每用户本地 Mac 执行）

这个模式用于实现：
- 控制台放在云端（public）
- 每个用户在自己的 Mac 上授权
- Apple 通讯录 / iMessage 由用户自己的账号执行

## 架构

- 云端 `server` 负责：计划、执行编排、渲染、Web UI 通信
- 本地 `connector` 负责：执行 `contacts.apple` 和 `imessage.send`
- 绑定关系：`sessionId -> connectorId`

## 1) 云端 Server 启动

可选安全令牌（推荐）：

```bash
export CONNECTOR_TOKEN="your-shared-token"
cd server
npm run dev
```

## 2) 用户本机启动 Connector

在用户自己的 Mac 上（必须是用户本人账号已登录 Messages）：

```bash
cd server
npm install
CONNECTOR_SERVER_WS="wss://你的云端域名" \
CONNECTOR_ID="alice-mac" \
CONNECTOR_TOKEN="your-shared-token" \
npm run connector
```

如果你在本机联调，可用：

```bash
CONNECTOR_SERVER_WS="ws://127.0.0.1:8080" CONNECTOR_ID="rae-mac" npm run connector
```

## 3) Web 控制台绑定 Connector

在 Web 页面输入并绑定同一个 `Connector ID`（例如 `alice-mac`）。
绑定成功后，Apple 工具会优先转发到该 Connector 执行。

## 4) 权限要求（每个用户自己授权）

- 系统设置 > 隐私与安全性 > 通讯录（允许终端）
- 系统设置 > 隐私与安全性 > 自动化（允许终端控制 Messages）

## 5) 当前最小实现说明

- 远程转发工具：`contacts.apple`, `imessage.send`
- 如果 Connector 不在线，执行阶段会返回明确错误并提示启动本机 Connector
- 非 Apple 工具仍在云端执行
