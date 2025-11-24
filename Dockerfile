# 构建阶段 - 编译TypeScript代码
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制依赖配置文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm 包管理器
RUN npm install -g pnpm

# 安装所有依赖（包含devDependencies，用于构建）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 执行构建命令
RUN pnpm run build

# 生产阶段 - 运行应用
FROM node:20-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装 pnpm 包管理器
RUN npm install -g pnpm

# 复制依赖配置文件
COPY package.json pnpm-lock.yaml ./

# 仅安装生产环境依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 复制生产环境配置文件
COPY .env.production .env.production

# 暴露端口
# HTTP API 端口
EXPOSE 8018
# MQTT 服务端口
EXPOSE 1884
# MQTT PSK 加密端口
EXPOSE 8445

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["node", "dist/main"]
