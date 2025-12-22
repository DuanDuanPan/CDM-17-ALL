#!/bin/bash

# ============================================
# 动态 Graph ID 数据库清理脚本
# ============================================
# 
# 功能：清空除 User 表外的所有数据
# 用途：为动态 Graph ID 功能准备干净的数据库
#
# ⚠️  警告：此操作不可逆！
# ============================================

set -e

echo "============================================"
echo "🗑️  动态 Graph ID 数据库清理脚本"
echo "============================================"
echo ""

# 确认操作
echo "⚠️  此脚本将清空以下表的数据："
echo "    - Notification"
echo "    - Edge"
echo "    - NodeTask, NodeRequirement, NodePBS, NodeData"
echo "    - Node"
echo "    - Graph"
echo "    - Project"
echo ""
echo "✅  User 表将保留"
echo ""

read -p "确定要继续吗？(输入 'yes' 确认): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

echo ""
echo "🔄 正在清理数据..."

# 执行清理SQL
cd "$(dirname "$0")/../packages/database"
npx dotenv -e ../../.env -- prisma db execute --schema=prisma/schema.prisma --stdin << 'SQL'
-- 按照外键依赖顺序清空表
TRUNCATE TABLE "Notification" CASCADE;
TRUNCATE TABLE "Edge" CASCADE;
TRUNCATE TABLE "NodeTask" CASCADE;
TRUNCATE TABLE "NodeRequirement" CASCADE;
TRUNCATE TABLE "NodePBS" CASCADE;
TRUNCATE TABLE "NodeData" CASCADE;
TRUNCATE TABLE "Node" CASCADE;
TRUNCATE TABLE "Graph" CASCADE;
TRUNCATE TABLE "Project" CASCADE;
SQL

echo ""
echo "✅ 数据清理完成！"
echo ""
echo "📝 当前状态："
echo "   - User 表：保留（可含测试用户数据）"
echo "   - Project 表：已清空"
echo "   - Graph 表：已清空"
echo "   - Node/Edge 相关表：已清空"
echo "   - Notification 表：已清空"
echo ""
echo "🚀 下一步："
echo "   1. 重启后端服务: cd apps/api && npm run dev"
echo "   2. 访问前端: http://127.0.0.1:3000?userId=test1"
echo "   3. 系统将自动为用户创建项目和图谱"
echo ""
