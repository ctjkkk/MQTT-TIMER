FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖配置
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 复制编译后的代码
COPY dist ./dist
COPY .env.production .env.production

EXPOSE 8018 1885 8445

ENV NODE_ENV=production

CMD ["node", "dist/main"]