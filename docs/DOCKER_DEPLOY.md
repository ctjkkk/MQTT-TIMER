# Docker 部署指南

## 文件说明

### 1. Dockerfile
这是构建Docker镜像的配置文件，定义了如何将你的应用打包成可运行的容器镜像。

**关键特性：**
- 使用多阶段构建，减小最终镜像体积
- 第一阶段：安装所有依赖并构建TypeScript代码
- 第二阶段：只包含生产依赖和编译后的代码
- 暴露三个端口：8018(HTTP API)、8333(MQTT)、8445(MQTT PSK)

### 2. docker-compose.yml
用于编排和管理Docker容器的工具，简化了部署流程。

### 3. .dockerignore
定义哪些文件不应该被复制到Docker镜像中，优化构建速度。

## 部署步骤

### 方式一：使用 docker-compose（推荐）

1. **上传文件到服务器**
   ```bash
   # 在本地将项目打包
   tar -czf timer-mqtt.tar.gz .

   # 上传到服务器
   scp timer-mqtt.tar.gz user@your-server:/path/to/deploy/

   # 在服务器上解压
   ssh user@your-server
   cd /path/to/deploy/
   tar -xzf timer-mqtt.tar.gz
   ```

2. **构建并启动容器**
   ```bash
   # 确保已安装 docker 和 docker-compose
   docker-compose up -d
   ```

3. **查看日志**
   ```bash
   docker-compose logs -f
   ```

4. **停止容器**
   ```bash
   docker-compose down
   ```

### 方式二：使用 Docker 命令

1. **构建镜像**
   ```bash
   docker build -t timer-mqtt:latest .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name timer-mqtt \
     -p 8018:8018 \
     -p 8333:8333 \
     -p 8445:8445 \
     -v $(pwd)/logs:/app/logs \
     --restart unless-stopped \
     timer-mqtt:latest
   ```

3. **查看日志**
   ```bash
   docker logs -f timer-mqtt
   ```

4. **停止并删除容器**
   ```bash
   docker stop timer-mqtt
   docker rm timer-mqtt
   ```

## 常用命令

```bash
# 查看运行中的容器
docker ps

# 进入容器内部
docker exec -it timer-mqtt sh

# 重启容器
docker-compose restart

# 查看容器资源使用情况
docker stats timer-mqtt

# 更新应用（重新构建并启动）
docker-compose down
docker-compose up -d --build
```

## 注意事项

1. **环境变量**：确保 `.env.production` 文件配置正确
2. **MongoDB连接**：确认服务器可以访问MongoDB（mongodb+srv://...）
3. **防火墙**：开放端口 8018、8333、8445
4. **日志**：日志文件会保存在 `./logs` 目录
5. **安全**：生产环境建议修改 `.env.production` 中的敏感信息

## 验证部署

部署成功后，可以通过以下方式验证：

```bash
# 检查 HTTP API
curl http://your-server-ip:8018/api

# 查看 Swagger 文档
# 浏览器访问: http://your-server-ip:8018/doc

# 检查容器状态
docker-compose ps
```

## 故障排查

如果遇到问题：

1. 查看容器日志：`docker-compose logs -f`
2. 检查容器是否运行：`docker ps`
3. 进入容器检查：`docker exec -it timer-mqtt sh`
4. 检查端口占用：`netstat -tulpn | grep 8018`
