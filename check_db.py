#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('101.200.126.62', 22, 'root', 'zh12345678Q', timeout=10)

# 检查sqlite-db.js中的数据库路径
print('[1] Checking sqlite-db.js DB path...')
stdin, stdout, stderr = ssh.exec_command('grep -n "DB_PATH" /opt/mogongfang/sqlite-db.js')
print(stdout.read().decode())

# 直接在服务器上查询
print('[2] Direct query on server...')
node_script = 'const Database=require(\"better-sqlite3\");const db=new Database(\"/opt/mogongfang/data/expo_tickets.db\");console.log(JSON.stringify(db.prepare(\"SELECT * FROM ticket_types\").all()));db.close();'
stdin, stdout, stderr = ssh.exec_command(f'cd /opt/mogongfang && node -e \'{node_script}\'')
print(stdout.read().decode())

# 检查数据库表结构
print('[3] Checking table structure...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/mogongfang && node -e \"const Database=require(\\\"better-sqlite3\\\");const db=new Database(\\\"data/expo_tickets.db\\\");console.log(db.prepare(\\\"PRAGMA table_info(ticket_types)\\\").all());db.close();\"')
print(stdout.read().decode())

ssh.close()
