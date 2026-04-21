# MySQL 安装替代方案

由于MySQL官网临时故障，提供以下替代方案：

## 方案1：使用国内镜像源（推荐，速度快）

### 清华大学镜像站
1. 访问：https://mirrors.tuna.tsinghua.edu.cn/mysql/downloads/MySQL-8.0/
2. 下载：mysql-8.0.37-winx64.zip 或 mysql-installer-community-8.0.37.0.msi

### 网易镜像
1. 访问：https://mirrors.163.com/mysql/downloads/MySQL-8.0/
2. 搜索并下载对应版本

### 中科大镜像
1. 访问：https://mirrors.ustc.edu.cn/mysql-archives/
2. 选择MySQL 8.0版本下载

## 方案2：使用便携版MySQL（无需安装）

下载XAMPP（包含MySQL）：
1. 访问：https://www.apachefriends.org/zh_cn/index.html
2. 下载XAMPP for Windows
3. 安装后MySQL会自动配置好

## 方案3：使用Docker（最简单）

如果您已安装Docker Desktop：
```bash
docker run --name mysql-expo -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=ne_expo_ticket -p 3306:3306 -d mysql:8.0
```

## 方案4：立即开始测试（使用SQLite）

我可以修改项目代码以支持SQLite数据库，无需安装MySQL即可立即测试汇付支付功能。

## 临时下载命令（使用国内镜像）

打开PowerShell运行：

```powershell
# 清华镜像下载
Invoke-WebRequest -Uri "https://mirrors.tuna.tsinghua.edu.cn/mysql/downloads/MySQL-8.0/mysql-8.0.37-winx64.zip" -OutFile "$env:USERPROFILE\Downloads\mysql-8.0.37-winx64.zip"
```

## 快速安装步骤（ZIP版本）

1. 解压下载的文件到 `C:\mysql`
2. 以管理员身份打开CMD，运行：

```cmd
cd C:\mysql\bin
mysqld --initialize-insecure --console
mysqld --install
net start MySQL
```

3. 设置root密码（可选）：

```cmd
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';
EXIT;
```

## 推荐方案

**为了立即开始测试，我建议选择：**

1. **方案4（SQLite）**：10分钟内完成，无需安装任何软件
2. **方案1（镜像下载）**：5-10分钟下载，完整MySQL功能
3. **方案3（Docker）**：如果您已安装Docker，2分钟搞定

**请告诉我您选择哪个方案，我将协助您完成安装和配置。**

---

### 当前状态
- ✅ 汇付支付代码已完成
- ✅ API接口已实现
- ⏳ 等待数据库配置完成即可测试
