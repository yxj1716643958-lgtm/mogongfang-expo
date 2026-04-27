#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import paramiko
import sys
import io

# 设置编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HOST = '101.200.126.62'
USER = 'root'
PASSWORD = 'zh12345678Q'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, 22, USER, PASSWORD, timeout=10)

print('[1/3] Uploading init script...')
sftp = ssh.open_sftp()
sftp.put(r'E:\魔攻方 第二次尝试\init_tickets.js', '/opt/mogongfang/init_tickets.js')
sftp.close()
print('[OK] Uploaded')

print('[2/3] Running initialization...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/mogongfang && node init_tickets.js')
output = stdout.read().decode()
error = stderr.read().decode()
print(output)
if error:
    print('Error:', error)

print('[3/3] Testing ticket types API...')
stdin, stdout, stderr = ssh.exec_command('curl -s http://localhost:3001/api/v1/tickets/types')
api_result = stdout.read().decode()
print(api_result)

ssh.close()
print('[OK] Done!')
