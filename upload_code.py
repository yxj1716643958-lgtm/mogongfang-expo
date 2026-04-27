#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HOST = '101.200.126.62'
USER = 'root'
PASSWORD = 'zh12345678Q'

print('[1/3] Connecting to server...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASSWORD, timeout=10)
print('[OK] Connected')

print('[2/3] Uploading ticket-server.js...')
sftp = ssh.open_sftp()

# 备份原文件
try:
    sftp.get('/opt/mogongfang/ticket-server.js', '/opt/mogongfang/ticket-server.js.backup')
    print('[OK] Backed up original file')
except:
    pass

# 上传新文件
sftp.put(r'E:\魔攻方 第二次尝试\ticket-server.js', '/opt/mogongfang/ticket-server.js')
sftp.close()
print('[OK] Uploaded ticket-server.js')

print('[3/3] Restarting service...')
stdin, stdout, stderr = ssh.exec_command('pm2 restart ticket-service && sleep 2 && pm2 logs ticket-service --lines 10 --nostream')
output = stdout.read().decode()
print(output)

print('[OK] Done!')
ssh.close()
