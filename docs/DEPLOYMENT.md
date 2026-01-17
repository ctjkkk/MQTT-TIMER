# Docker 部署指南

本指南将帮助你在 Ubuntu 服务器上使用 Docker 部署 MQTT-TIMER 项目。

## 前置要求

- Ubuntu 服务器（已通过 MobaXterm 连接）
- 服务器需要开放以下端口：
  - 8018：HTTP API 端口
  - 1885：MQTT 端口
  - 8445：MQTT PSK 端口

## 部署步骤

### 步骤1：在服务器上安装 Docker

在服务器终端执行以下命令：

```bash
# 更新软件包索引
sudo apt update

# 安装必要的依赖
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 更新软件包索引
sudo apt update

# 安装 Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 安装 Docker Compose
sudo apt install -y docker-compose-plugin

# 验证安装
sudo docker --version
sudo docker compose version
```

### 步骤2：配置 Docker 权限（可选）

为了不用每次都加 sudo，可以将当前用户加入 docker 组：

```bash
# 将当前用户加入 docker 组
sudo usermod -aG docker $USER

# 刷新组权限（或重新登录）
newgrp docker

# 验证是否可以不用 sudo 运行 docker
docker --version
```

### 步骤3：在服务器上创建项目目录

```bash
# 创建项目目录
mkdir -p ~/mqtt-timer
cd ~/mqtt-timer
```

### 步骤4：上传项目文件到服务器

你可以使用以下任一方法上传文件：

#### 方法1：使用 Git（推荐）

如果项目已经托管在 Git 仓库：

```bash
# 在服务器上克隆项目
git clone <你的仓库地址> .
```

#### 方法2：使用 MobaXterm 的 SFTP 功能

1. 在 MobaXterm 左侧的 SFTP 面板中，导航到 ~/mqtt-timer 目录
2. 从本地拖拽以下文件/文件夹到服务器：
   - package.json
   - pnpm-lock.yaml
   - Dockerfile
   - docker-compose.yml
   - .dockerignore
   - .env.production
   - src/ （整个源代码目录）
   - tsconfig.json
   - nest-cli.json
   - 其他配置文件

#### 方法3：使用 scp 命令（在本地 Windows PowerShell 中）

```powershell
# 在本地项目目录下执行（需要先安装 scp）
scp -r ./* user@server_ip:~/mqtt-timer/
```

### 步骤5：修改生产环境配置

在服务器上编辑 .env.production 文件：

```bash
cd ~/mqtt-timer
nano .env.production
```

需要修改的配置项：

```env
# 应用配置
APP_HOST=你的服务器IP或域名
APP_PORT=8018

# MQTT 服务
MQTT_HOST=你的服务器IP或域名
MQTT_PORT=1885

# 其他配置根据实际需要修改
```

保存文件：按 `Ctrl + X`，然后按 `Y`，最后按 `Enter`

### 步骤6：构建并启动服务

```bash
# 确保在项目目录
cd ~/mqtt-timer

# 构建 Docker 镜像并启动服务
docker compose up -d --build
```

命令说明：
- `up`：启动服务
- `-d`：后台运行
- `--build`：构建镜像

### 步骤7：查看服务状态

```bash
# 查看运行中的容器
docker compose ps

# 查看服务日志
docker compose logs -f

# 查看实时日志（按 Ctrl+C 退出）
docker compose logs -f timer-mqtt
```

### 步骤8：验证部署

使用浏览器或 curl 命令测试：

```bash
# 测试 API 是否正常
curl http://你的服务器IP:8018

# 如果有 Swagger 文档
curl http://你的服务器IP:8018/api
```

## 常用命令

### 查看日志

```bash
# 查看所有日志
docker compose logs

# 查看最近100行日志
docker compose logs --tail=100

# 实时查看日志
docker compose logs -f

# 查看特定服务日志
docker compose logs timer-mqtt
```

### 重启服务

```bash
# 重启服务
docker compose restart

# 停止服务
docker compose stop

# 启动服务
docker compose start

# 停止并删除容器
docker compose down
```

### 更新代码

当需要更新代码时：

```bash
# 1. 停止服务
docker compose down

# 2. 拉取最新代码（如果使用 Git）
git pull

# 或者通过 MobaXterm 上传更新的文件

# 3. 重新构建并启动
docker compose up -d --build
```

### 查看容器内部

```bash
# 进入容器
docker compose exec timer-mqtt sh

# 在容器内执行命令
docker compose exec timer-mqtt node -v

# 退出容器
exit
```

### 清理资源

```bash
# 停止并删除容器、网络
docker compose down

# 删除镜像
docker rmi timer-mqtt-timer-mqtt

# 清理未使用的 Docker 资源
docker system prune -a
```

## 端口映射说明

项目使用以下端口：

- 8018：HTTP API 端口（NestJS 应用）
- 1885：MQTT 端口（MQTT Broker）
- 8445：MQTT PSK 端口（MQTT 安全连接）

确保服务器防火墙已开放这些端口：

```bash
# 如果使用 ufw 防火墙
sudo ufw allow 8018/tcp
sudo ufw allow 1885/tcp
sudo ufw allow 8445/tcp
sudo ufw reload
```

## 日志管理

项目日志会自动挂载到宿主机的 ./logs 目录：

```bash
# 查看日志文件
ls -lh ~/mqtt-timer/logs/

# 查看日志内容
tail -f ~/mqtt-timer/logs/*.log
```

## 故障排查

### 容器启动失败

```bash
# 查看详细日志
docker compose logs

# 查看容器状态
docker compose ps -a
```

### 端口被占用

```bash
# 查看端口占用情况
sudo netstat -tulpn | grep 8018
sudo netstat -tulpn | grep 1885

# 或使用 ss 命令
sudo ss -tulpn | grep 8018
```

### 重新构建镜像

```bash
# 停止服务
docker compose down

# 删除旧镜像
docker rmi timer-mqtt-timer-mqtt

# 重新构建
docker compose build --no-cache

# 启动服务
docker compose up -d
```

## 环境变量说明

重要的环境变量（在 .env.production 中配置）：

- `NODE_ENV`：运行环境（production）
- `APP_HOST`：应用主机地址
- `APP_PORT`：应用端口
- `MQTT_HOST`：MQTT 服务地址
- `MQTT_PORT`：MQTT 端口
- `MQTT_USERNAME`：MQTT 用户名
- `MQTT_PASSWORD`：MQTT 密码
- `MONGO_HOST`：MongoDB 连接字符串
- `SIGNATURE_SECRET`：API 签名密钥（务必修改）

## 安全建议

1. 修改 .env.production 中的所有默认密码和密钥
2. 使用强密码（可使用命令生成）：
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. 配置防火墙，只开放必要的端口
4. 定期更新 Docker 镜像和系统软件包
5. 定期备份数据库

## 监控与维护

### 查看资源使用情况

```bash
# 查看 Docker 容器资源使用
docker stats

# 查看系统资源
htop  # 需要安装：sudo apt install htop
```

### 设置自动重启

docker-compose.yml 中已配置 `restart: unless-stopped`，容器会在系统重启后自动启动。

### 定时备份

建议设置定时任务备份重要数据：

```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨2点备份日志
0 2 * * * tar -czf ~/backups/mqtt-timer-logs-$(date +\%Y\%m\%d).tar.gz ~/mqtt-timer/logs/
```

## 支持

如有问题，请查看：
- 项目日志：docker compose logs
- 系统日志：sudo journalctl -u docker
- Docker 文档：https://docs.docker.com

---

祝部署顺利！
