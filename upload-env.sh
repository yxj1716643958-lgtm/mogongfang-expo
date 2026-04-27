#!/bin/bash
# 上传环境配置到服务器

echo "正在上传 .env 文件到服务器..."

# 使用expect自动输入密码（如果可用）
if command -v expect &> /dev/null; then
    expect << 'EXPECT_EOF'
    set timeout 30
    spawn scp .env root@101.200.126.62:/opt/mogongfang/.env
    expect {
        "password:" {
            send "zh12345678Q\r"
            expect eof
        }
        "yes/no" {
            send "yes\r"
            exp_continue
        }
    }
EXPECT_EOF
else
    # 如果没有expect，尝试使用sshpass
    if command -v sshpass &> /dev/null; then
        sshpass -p 'zh12345678Q' scp .env root@101.200.126.62:/opt/mogongfang/.env
    else
        echo "错误: 需要安装 expect 或 sshpass"
        echo "请手动上传: scp .env root@101.200.126.62:/opt/mogongfang/.env"
        exit 1
    fi
fi

echo "上传完成，正在重启服务..."
sshpass -p 'zh12345678Q' ssh root@101.200.126.62 "cd /opt/mogongfang && pm2 restart ticket-service && pm2 logs ticket-service --lines 10"
