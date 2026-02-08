# Docker 部署指南

参考 OpenClaw 的部署方式，提供完整的 Docker 部署方案。

## 快速开始

### 1. 本地测试

```bash
# 构建并启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

访问 http://localhost 即可使用。

### 2. 环境变量配置

复制 `.env.example` 到 `.env` 并修改：

```bash
cp .env.example .env
```

**重要配置：**

- `VITE_WS_URL`: 前端 WebSocket URL
  - 本地: `ws://localhost:8080`
  - 生产: `wss://your-backend-domain.com`
- `OLLAMA_URL`: Ollama API 地址
  - Docker 内: `http://ollama:11434`
  - 云 API: `https://api.openrouter.ai/v1`

### 3. 构建镜像

```bash
# 构建所有镜像
docker compose build

# 或单独构建
docker build -f server/Dockerfile -t clawbot-backend .
docker build -f web/Dockerfile -t clawbot-frontend .
```

## 部署到云服务

### Render.com

1. 连接 GitHub 仓库
2. 创建两个 Web Services：
   - **Backend**: 使用 `render.yaml` 中的 `clawbot-backend` 配置
   - **Frontend**: 使用 `clawbot-frontend` 配置
3. 设置环境变量（见 `render.yaml`）
4. 部署

### Railway

Railway 会自动检测 `docker compose.yml`，但建议：

1. 创建 **New Project** → **Deploy from GitHub**
2. 选择仓库
3. 添加环境变量（见 `.env.example`）
4. Railway 会自动构建和部署

### Fly.io

```bash
# 安装 flyctl
curl -L https://fly.io/install.sh | sh

# 初始化
fly launch

# 部署
fly deploy
```

### VPS (DigitalOcean, Linode, etc.)

```bash
# 在 VPS 上
git clone <your-repo>
cd clawbot-image-demo

# 设置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 启动
docker compose up -d

# 设置 Nginx 反向代理（可选）
# 见下面的 Nginx 配置
```

## Nginx 反向代理（VPS）

创建 `/etc/nginx/sites-available/clawbot`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用并重启：

```bash
sudo ln -s /etc/nginx/sites-available/clawbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Ollama 配置

### 选项 A: Docker 内运行 Ollama（推荐用于 VPS）

`docker compose.yml` 已配置 Ollama 服务，会自动拉取 `qwen2.5:1.5b`。

首次启动可能需要几分钟下载模型。

### 选项 B: 使用云 Ollama API

如果部署到 Railway/Render（不支持运行 Ollama），使用云 API：

1. **OpenRouter** (推荐)
   - 注册: https://openrouter.ai
   - 设置 `OLLAMA_URL=https://openrouter.ai/api/v1`
   - 设置 `OPENROUTER_API_KEY=your-key`

2. **Together.ai**
   - 注册: https://together.ai
   - 设置 `OLLAMA_URL=https://api.together.xyz/v1`

3. **自建 Ollama 服务器**
   - 在另一台 VPS 运行 Ollama
   - 设置 `OLLAMA_URL=http://your-ollama-server:11434`

## 健康检查

```bash
# 检查后端
curl http://localhost:8080/health

# 检查 Ollama
curl http://localhost:11434/api/tags

# 检查容器状态
docker compose ps
```

## 故障排查

### 容器无法启动

```bash
# 查看日志
docker compose logs backend
docker compose logs ollama
docker compose logs frontend

# 重启服务
docker compose restart backend
```

### WebSocket 连接失败

1. 检查 `VITE_WS_URL` 是否正确
2. 生产环境必须用 `wss://`（HTTPS）
3. 检查防火墙/安全组是否开放 WebSocket 端口

### Ollama 超时

1. 检查 `OLLAMA_URL` 是否可访问
2. 如果使用 Docker 内 Ollama，确保 `ollama` 服务已启动
3. 首次拉取模型需要时间，查看 `docker compose logs ollama`

## 生产环境建议

1. **使用环境变量文件**: 不要提交 `.env` 到 Git
2. **HTTPS**: 使用 Let's Encrypt 或云服务提供的 HTTPS
3. **监控**: 设置健康检查告警
4. **备份**: 定期备份 `ollama_data` volume（如果本地运行）
5. **资源限制**: 在 `docker compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

## 参考

- OpenClaw Docker 配置: https://github.com/openclaw/openclaw
- Docker Compose 文档: https://docs.docker.com/compose/
- Render 文档: https://render.com/docs
- Railway 文档: https://docs.railway.app
