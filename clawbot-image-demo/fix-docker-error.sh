#!/bin/bash
# 修复 Docker 拉取错误

echo "🔧 修复 Docker 拉取错误"
echo "======================"
echo ""

# 检查磁盘空间
echo "📊 检查磁盘空间..."
df -h | grep -E "Filesystem|/$"

echo ""
echo "💡 解决方案："
echo ""
echo "1. 清理 Docker 缓存和未使用的镜像："
echo "   docker system prune -a --volumes"
echo ""
echo "2. 检查 Docker Desktop 磁盘使用："
echo "   Docker Desktop → Settings → Resources → Advanced"
echo "   查看 Disk image size"
echo ""
echo "3. 增加 Docker 磁盘限制："
echo "   Docker Desktop → Settings → Resources → Advanced"
echo "   增加 Disk image size（建议至少 20GB）"
echo ""
echo "4. 重启 Docker Desktop："
echo "   killall Docker && open -a Docker"
echo ""
echo "5. 重新拉取镜像："
echo "   docker compose pull ollama"
echo "   或"
echo "   docker pull ollama/ollama:latest"
