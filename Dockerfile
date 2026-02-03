# 构建阶段
FROM docker.m.daocloud.io/library/node:20-alpine AS builder

WORKDIR /app

# 配置国内镜像源加速
RUN npm config set registry https://registry.npmmirror.com

# 安装 pnpm
RUN npm install -g pnpm

# 配置 pnpm 使用国内镜像
RUN pnpm config set registry https://registry.npmmirror.com

# 复制依赖配置文件
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括开发依赖，用于构建）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 生产阶段
FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

# 配置国内镜像源加速
RUN npm config set registry https://registry.npmmirror.com

# 安装 pnpm
RUN npm install -g pnpm

# 配置 pnpm 使用国内镜像
RUN pnpm config set registry https://registry.npmmirror.com

# 复制依赖配置文件
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist
COPY .env.production .env.production

EXPOSE 8018 1885 8445

ENV NODE_ENV=production

CMD ["node", "dist/main"]