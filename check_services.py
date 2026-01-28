#!/usr/bin/env python3
"""
Check status of blog services
"""

import subprocess
import socket
import os
import datetime

def check_port(port):
    """Check if a port is open"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result == 0

def check_process(process_name):
    """Check if a process is running"""
    try:
        result = subprocess.run(['pgrep', '-f', process_name], capture_output=True, text=True)
        return bool(result.stdout.strip())
    except:
        return False

def get_process_info(process_name):
    """Get process information"""
    try:
        result = subprocess.run(['pgrep', '-f', process_name], capture_output=True, text=True)
        if result.stdout.strip():
            pid = result.stdout.strip().split('\n')[0]
            ps_result = subprocess.run(['ps', '-p', pid, '-o', 'pid,command'], capture_output=True, text=True)
            return ps_result.stdout.strip()
        return None
    except:
        return None

def read_last_lines(filepath, n=10):
    """Read last n lines from a file"""
    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()
            return ''.join(lines[-n:])
    except:
        return "File not found or cannot be read"

print("=== Blog Services Status Check ===")
print(f"Time: {datetime.datetime.now()}")
print()

# Check Gunicorn
print("1. Gunicorn Status (Port 8001):")
if check_process('gunicorn.*8001'):
    print("   ✅ Process is running")
    info = get_process_info('gunicorn.*8001')
    if info:
        print(f"   {info}")
else:
    print("   ❌ Process is NOT running")

if check_port(8001):
    print("   ✅ Port 8001 is listening")
else:
    print("   ❌ Port 8001 is NOT listening")
print()

# Check Nginx
print("2. Nginx Status (Port 8000):")
if check_process('nginx.*master'):
    print("   ✅ Process is running")
    info = get_process_info('nginx.*master')
    if info:
        print(f"   {info}")
else:
    print("   ❌ Process is NOT running")

if check_port(8000):
    print("   ✅ Port 8000 is listening")
else:
    print("   ❌ Port 8000 is NOT listening")
print()

# Check Cloudflared
print("3. Cloudflared Tunnel Status:")
if check_process('cloudflared.*tunnel'):
    print("   ✅ Process is running")
    info = get_process_info('cloudflared.*tunnel')
    if info:
        print(f"   {info}")
else:
    print("   ❌ Process is NOT running")
print()

# Check PID file
print("4. PID File Check:")
pid_file = "/Users/minjaecho/Sites/sgtcho-blog/logs/llm_server.pid"
if os.path.exists(pid_file):
    with open(pid_file, 'r') as f:
        pid = f.read().strip()
        print(f"   PID in file: {pid}")
        try:
            os.kill(int(pid), 0)
            print(f"   ✅ Process {pid} is running")
        except:
            print(f"   ❌ Process {pid} is NOT running")
else:
    print("   PID file not found")
print()

# Check logs
print("5. Latest Error Logs:")
error_log = "/Users/minjaecho/Sites/sgtcho-blog/logs/error.log"
print(read_last_lines(error_log, 5))
print()

print("=== End of Status Check ===")