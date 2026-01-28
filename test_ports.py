#!/usr/bin/env python3
import socket
import requests
import sys

print("Testing blog service ports...")

# Test port 8000 (nginx)
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex(('localhost', 8000))
    sock.close()
    if result == 0:
        print("✅ Port 8000 is open")
        try:
            response = requests.get('http://localhost:8000/health', timeout=2)
            print(f"   Health check: {response.status_code} - {response.text.strip()}")
        except Exception as e:
            print(f"   Health check failed: {e}")
    else:
        print("❌ Port 8000 is closed")
except Exception as e:
    print(f"❌ Error checking port 8000: {e}")

print()

# Test port 8001 (gunicorn)
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex(('localhost', 8001))
    sock.close()
    if result == 0:
        print("✅ Port 8001 is open")
        try:
            response = requests.get('http://localhost:8001/', timeout=2)
            print(f"   Root endpoint: {response.status_code}")
        except Exception as e:
            print(f"   Root endpoint check failed: {e}")
    else:
        print("❌ Port 8001 is closed")
except Exception as e:
    print(f"❌ Error checking port 8001: {e}")