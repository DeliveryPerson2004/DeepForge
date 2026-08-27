FROM docker/sandbox-templates:shell-docker
LABEL authors="administrator"

# 1. 在 root 权限下更新系统并全局安装 pnpm
USER root
RUN apt-get update && apt-get upgrade -y
RUN npm install -g pnpm

# 2. 切换到 agent 用户并配置绝对路径工作区
USER agent
WORKDIR /home/agent/deep-forge

# 3. 拷贝源码
COPY . .

# 4. 注入环境变量（供 pnpm 与 prisma 构建期使用）
ENV DATABASE_URL="file:./dev.db"

# 5. 安装依赖、执行数据库迁移与生成客户端
RUN pnpm install
RUN pnpm exec prisma migrate deploy
RUN pnpm exec prisma generate

# 6. 容器启动入口
ENTRYPOINT ["pnpm", "run", "dev:backend:main"]