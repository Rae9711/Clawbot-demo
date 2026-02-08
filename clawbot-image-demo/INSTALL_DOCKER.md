# 安装 Docker（macOS）

## 方法 1: Homebrew（推荐）

```bash
# 安装 Docker Desktop
brew install --cask docker

# 打开 Docker Desktop 应用
open -a Docker
```

等待 Docker Desktop 启动（菜单栏会出现 Docker 图标）。

## 方法 2: 手动下载

1. 访问: https://www.docker.com/products/docker-desktop
2. 下载 Docker Desktop for Mac（Apple Silicon 或 Intel）
3. 打开下载的 `.dmg` 文件
4. 拖拽 Docker 到 Applications 文件夹
5. 打开 Applications → Docker
6. 等待 Docker 启动

## 验证安装

```bash
# 检查 Docker 版本
docker --version
# 应该显示: Docker version 24.x.x 或更高

# 检查 Docker Compose
docker compose version
# 应该显示: Docker Compose version v2.x.x

# 检查 Docker 是否运行
docker ps
# 如果显示容器列表（或空列表），说明正常
# 如果报错，确保 Docker Desktop 应用已打开
```

## 如果遇到问题

### Docker Desktop 无法启动

1. 检查系统要求：
   - macOS 11 或更高版本
   - 至少 4GB RAM
   - 虚拟化支持（Apple Silicon 或 Intel VT-x）

2. 重启 Docker Desktop：
   ```bash
   killall Docker
   open -a Docker
   ```

### 权限问题

Docker Desktop 首次启动会要求权限：
- 允许 Docker 访问网络
- 允许 Docker 访问文件系统

---

## 安装完成后

继续按照 `START_HERE.md` 的步骤部署。
