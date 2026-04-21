# MySQL 安装指南

## 系统信息
- 操作系统: Windows 10 64位
- 需要安装: MySQL Community Server 8.0

## 下载步骤

### 方法1：官方下载（推荐）

1. **访问MySQL官网下载页面**
   打开浏览器，访问：https://dev.mysql.com/downloads/mysql/

2. **选择Windows版本**
   - 在"Select Operating System"下拉菜单中选择"Microsoft Windows"
   - 下载：Windows (x86, 64-bit), ZIP Archive
   - 直接下载链接：https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.37-winx64.zip

3. **或使用安装包版本（更简单）**
   下载：Windows (x86, 64-bit), MSI Installer
   - mysql-installer-community-8.0.37.0.msi
   - 包含MySQL Server和配置工具

### 方法2：使用命令行下载（PowerShell）

打开PowerShell（管理员），运行：

```powershell
# 下载MySQL ZIP包
Invoke-WebRequest -Uri "https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.37-winx64.zip" -OutFile "$env:USERPROFILE\Downloads\mysql-8.0.37-winx64.zip"

# 或下载MSI安装包
Invoke-WebRequest -Uri "https://dev.mysql.com/get/Downloads/MySQL-Installer/mysql-installer-community-8.0.37.0.msi" -OutFile "$env:USERPROFILE\Downloads\mysql-installer-community-8.0.37.0.msi"
```

## 安装步骤

### 选项A：使用MSI安装包（推荐，简单）

1. 双击运行 `mysql-installer-community-8.0.37.0.msi`

2. 选择安装类型：
   - **Developer Default**（推荐）：包含MySQL Server、Workbench等
   - **Server only**：仅安装MySQL Server

3. 按照向导完成安装：
   - 设置root密码（请记住此密码）
   - 配置端口（默认3306）
   - 选择启动方式

4. 完成安装后，MySQL服务会自动启动

### 选项B：使用ZIP包（手动配置）

1. 解压 `mysql-8.0.37-winx64.zip` 到 `C:\mysql-8.0.37-winx64`

2. 创建配置文件 `C:\mysql-8.0.37-winx64\my.ini`：

```ini
[mysqld]
basedir=C:\\mysql-8.0.37-winx64
datadir=C:\\mysql-8.0.37-winx64\\data
port=3306
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
default-authentication-plugin=mysql_native_password

[mysql]
default-character-set=utf8mb4

[client]
default-character-set=utf8mb4
port=3306
```

3. 初始化数据库（管理员CMD）：

```cmd
cd C:\mysql-8.0.37-winx64\bin
mysqld --initialize --console
# 记住显示的临时密码
```

4. 安装并启动服务：

```cmd
mysqld --install MySQL
net start MySQL
```

5. 修改root密码：

```cmd
mysql -u root -p
# 输入临时密码
ALTER USER 'root'@'localhost' IDENTIFIED BY '你的新密码';
FLUSH PRIVILEGES;
EXIT;
```

## 验证安装

打开命令提示符，测试连接：

```cmd
mysql -u root -p
# 输入设置的密码
```

如果成功登录，说明安装完成。

## 配置项目

安装完成后，确保 `.env` 文件中的数据库配置正确：

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你设置的MySQL密码
DB_NAME=ne_expo_ticket
```

## 初始化项目数据库

MySQL安装完成后，运行：

```bash
cd "E:\魔攻方 第二次尝试"
node init-db.js
```

## 常见问题

### Q1: 端口3306被占用
修改 `my.ini` 中的端口号，或停止占用端口的程序。

### Q2: 服务无法启动
检查 `my.ini` 配置是否正确，查看错误日志。

### Q3: 忘记root密码
以管理员身份运行CMD：

```cmd
net stop MySQL
mysqld --skip-grant-tables --shared-memory
# 新开CMD窗口
mysql -u root
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '新密码';
EXIT;
# 关闭所有窗口，重启服务
net start MySQL
```

## 下载链接汇总

- **MySQL安装包（MSI）**: https://dev.mysql.com/get/Downloads/MySQL-Installer/mysql-installer-community-8.0.37.0.msi
- **MySQL ZIP包**: https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.37-winx64.zip
- **MySQL Workbench**: https://dev.mysql.com/get/Downloads/MySQLGUITools/mysql-workbench-community-8.0.39-winx64.msi

## 下一步

安装完成后，请告诉我：
1. MySQL已安装完成
2. 您设置的root密码（或留空表示无密码）

然后我将继续测试汇付支付功能。
