FROM node:24.20.0-bookworm-slim

# 接收构建参数
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy

RUN npm install -g pnpm@11.24.0

WORKDIR /app

COPY . .

RUN pnpm install

RUN cp ./.env.example ./.env

RUN pnpm exec prisma migrate deploy

RUN pnpm exec prisma generate

ENTRYPOINT ["pnpm", "run", "start"]